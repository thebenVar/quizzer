/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';

import {
  answerStatus,
  buildResultsHtml,
  calculateSkillResults,
  escapeHtml,
  filterReviewItems,
  gradeSelections,
  resultsFileName,
  sanitizeFileNamePart,
  skillScoreText,
} from '../app/results.js';
import { renderQuestionCard } from '../app/answerKey.js';
import { validateMeta, validateQuestions } from '../app/validate.js';

const meta = validateMeta({
  id: 'demo',
  title: 'Demo <Test>',
  skills: [
    { id: 'logic', label: 'Logic & reason' },
    { id: 'detail', label: 'Detail' },
  ],
});

const questions = validateQuestions([
  { id: 1, type: 'mcq', skill: 'logic', prompt: 'Pick <b>B</b>', options: ['A', 'B', 'C'], answer: 'B', points: 1, explanation: 'Because.', approach: 'Think.' },
  { id: 'q2', type: 'mcq', skill: 'detail', prompt: 'Pick C', options: ['A', 'B', 'C'], answer: 'C', points: 1 },
  { id: 'm', type: 'matching', skill: 'logic', prompt: 'Match', pairs: [['X', 'x'], ['Y', 'y']] },
  { id: 4, type: 'mcq', skill: 'detail', prompt: 'Skipped', options: ['A', 'B'], answer: 'A', points: 1 },
]);

const selections = { 1: 'B', q2: 'A', m: { X: 'x', Y: 'x' } };

describe('answerStatus', () => {
  it('tells none, partial and complete answers apart', () => {
    expect(answerStatus(questions[0], undefined)).toBe('none');
    expect(answerStatus(questions[0], 'B')).toBe('complete');
    expect(answerStatus(questions[2], {})).toBe('none');
    expect(answerStatus(questions[2], { X: 'x' })).toBe('partial');
    expect(answerStatus(questions[2], { X: 'x', Y: 'y' })).toBe('complete');
  });
});

describe('gradeSelections', () => {
  const graded = gradeSelections(questions, selections);

  it('scores the stored answers and counts unanswered questions separately', () => {
    expect(graded.score).toBe(1);
    expect(graded.totalPossibleScore).toBe(5); // 1 + 1 + 2 pairs + 1
    expect(graded.correctCount).toBe(1);
    expect(graded.incorrectCount).toBe(2);
    expect(graded.unansweredCount).toBe(1);
  });

  it('logs answered questions for the per-skill results', () => {
    expect(graded.answerLog).toEqual([
      { questionId: 1, isCorrect: true, points: 1 },
      { questionId: 'q2', isCorrect: false, points: 0 },
      { questionId: 'm', isCorrect: false, points: 0 },
    ]);
  });

  it('keeps every question, numbered in the order asked, for the review', () => {
    expect(graded.items.map((item) => item.number)).toEqual([1, 2, 3, 4]);
    expect(graded.items[3].response).toEqual({ answer: undefined, hasAnswer: false, isCorrect: false });
    expect(filterReviewItems(graded.items, 'wrong').map((item) => item.question.id)).toEqual(['q2', 'm', 4]);
    expect(filterReviewItems(graded.items, 'all')).toHaveLength(4);
  });

  it('grades a partly filled matching question as answered and wrong', () => {
    const partial = gradeSelections([questions[2]], { m: { X: 'x' } });
    expect(partial.items[0].response.hasAnswer).toBe(true);
    expect(partial.incorrectCount).toBe(1);
    expect(partial.unansweredCount).toBe(0);
  });

  it('keeps the order each question’s options were shown in', () => {
    const shown = gradeSelections(questions, selections, undefined, { 1: ['C', 'B', 'A'] });
    expect(shown.items[0].response.optionOrder).toEqual(['C', 'B', 'A']);
    expect(shown.items[1].response.optionOrder).toBeUndefined();
  });

  it('awards full matching points only when every pair is right', () => {
    expect(gradeSelections([questions[2]], { m: { X: 'x', Y: 'y' } }).score).toBe(2);
  });
});

describe('calculateSkillResults', () => {
  const { answerLog } = gradeSelections(questions, selections);

  it('counts points (a matching question is worth its pairs) and adds the time spent on each skill', () => {
    const rows = calculateSkillResults(meta.skills, questions, answerLog, { 1: 30_000, m: 15_400, q2: 5_000 });
    expect(rows).toEqual([
      { id: 'logic', label: 'Logic & reason', correct: 1, total: 3, seconds: 45 },
      { id: 'detail', label: 'Detail', correct: 0, total: 2, seconds: 5 },
    ]);
    expect(skillScoreText(rows[0], meta.uiText)).toBe('1 / 3 · 0:45');
  });

  it('leaves the time out when none was tracked', () => {
    const rows = calculateSkillResults(meta.skills, questions, answerLog, {});
    expect(rows[0].seconds).toBeNull();
    expect(skillScoreText(rows[0], meta.uiText)).toBe('1 / 3');
  });
});

describe('review cards', () => {
  const { items } = gradeSelections(questions, selections);

  it('marks a wrong answer red with ✗ and the correct one green', () => {
    const card = renderQuestionCard(items[1].question, 2, meta.uiText, items[1].response);
    expect(card.classList.contains('ak-card-wrong')).toBe(true);
    const wrong = card.querySelector('.ak-option-wrong');
    expect(wrong.querySelector('.ak-option-text').textContent).toBe('A');
    expect(wrong.querySelector('.ak-cross').textContent).toBe('✗');
    expect(card.querySelector('.ak-option-correct .ak-option-text').textContent).toBe('C');
  });

  it('marks a right answer as both yours and correct', () => {
    const card = renderQuestionCard(items[0].question, 1, meta.uiText, items[0].response);
    expect(card.classList.contains('ak-card-right')).toBe(true);
    const chosen = card.querySelector('.ak-option-chosen');
    expect(chosen.classList.contains('ak-option-correct')).toBe(true);
    expect(chosen.querySelector('.ak-option-tag').textContent).toContain('Your answer · Correct');
    expect(card.querySelector('.ak-note-approach .ak-note-body').textContent).toBe('Think.');
  });

  it('letters the options in the order the participant saw them', () => {
    const response = { ...items[0].response, optionOrder: ['C', 'B', 'A'] };
    const card = renderQuestionCard(items[0].question, 1, meta.uiText, response);
    const letters = [...card.querySelectorAll('.ak-option')].map((li) => li.textContent.slice(0, 2));
    expect(letters).toEqual(['AC', 'BB', 'CA']);
    // Without a shown order (the answer key page), file order is kept
    const key = renderQuestionCard(items[0].question, 1, meta.uiText);
    expect([...key.querySelectorAll('.ak-option-text')].map((t) => t.textContent)).toEqual(['A', 'B', 'C']);
  });

  it('says "Not answered" for a skipped question', () => {
    const card = renderQuestionCard(items[3].question, 4, meta.uiText, items[3].response);
    expect(card.querySelector('.ak-not-answered').textContent).toBe('Not answered');
    expect(card.querySelector('.ak-option-chosen')).toBeNull();
  });

  it('shows matching answers next to the correct pairs', () => {
    const card = renderQuestionCard(items[2].question, 3, meta.uiText, items[2].response);
    const yours = [...card.querySelectorAll('.ak-match-yours')];
    expect(yours.map((li) => li.classList.contains('ak-match-wrong'))).toEqual([false, true]);
    expect(card.querySelectorAll('.ak-match:not(.ak-match-yours)')).toHaveLength(2);
  });
});

describe('results file', () => {
  it('names the file after the quiz, a cleaned-up name and the date', () => {
    const date = new Date(2026, 10, 5, 14, 30);
    expect(resultsFileName('cit-aptitude', 'Ana María / O\'Neil', date)).toBe('cit-aptitude-results-ana-maría-o-neil-2026-11-05.html');
    expect(resultsFileName('demo', '  <>  ', date)).toBe('demo-results-participant-2026-11-05.html');
    expect(sanitizeFileNamePart('../../etc')).toBe('etc');
  });

  it('escapes text for HTML', () => {
    expect(escapeHtml('<a href="x">\'&\'</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });

  const graded = gradeSelections(questions, selections);
  const build = (review) => buildResultsHtml({
    meta,
    name: '<script>alert(1)</script>',
    date: new Date(2026, 10, 5),
    durationSeconds: 125,
    score: graded.score,
    totalPossibleScore: graded.totalPossibleScore,
    skillRows: calculateSkillResults(meta.skills, questions, graded.answerLog, { 1: 61_000 }),
    items: graded.items,
    review,
  });

  it('is one self-contained page with escaped content', () => {
    const html = build(true);
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).not.toMatch(/<script|<link|\bsrc=|\bhref=/i);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Demo &lt;Test&gt;');
    expect(html).toContain('Pick &lt;b&gt;B&lt;/b&gt;');
    expect(html).toContain('Logic &amp; reason');
  });

  it('has the score, time taken, per-skill times and every question', () => {
    const doc = new DOMParser().parseFromString(build(true), 'text/html');
    const facts = [...doc.querySelectorAll('.facts dd')].map((dd) => dd.textContent);
    expect(facts).toContain('2:05');
    expect(facts).toContain('1 / 5');
    const labels = [...doc.querySelectorAll('.facts dt')].map((dt) => dt.textContent);
    expect(labels).toEqual(['Name', 'Date', 'Time taken', 'Score']);
    const rows = [...doc.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((td) => td.textContent));
    expect(rows).toEqual([['Logic & reason', '1 / 3', '1:01'], ['Detail', '0 / 2', '0:00']]);
    expect(doc.querySelectorAll('.ak-card')).toHaveLength(4);
  });

  it('leaves the answers out when the quiz hides its review', () => {
    const doc = new DOMParser().parseFromString(build(false), 'text/html');
    expect(doc.querySelectorAll('.ak-card')).toHaveLength(0);
    expect(doc.querySelectorAll('tbody tr')).toHaveLength(2);
  });
});
