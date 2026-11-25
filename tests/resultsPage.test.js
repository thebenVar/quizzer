/**
 * @vitest-environment jsdom
 */
// The facilitators' page: one person's answers shown with the participant review's cards.
import { describe, expect, it } from 'vitest';

import { reviewItems } from '../app/resultsPage.js';
import { renderQuestionCard } from '../app/answerKey.js';
import { DEFAULT_UI_TEXT, validateQuestions } from '../app/validate.js';

const questions = validateQuestions([
  { id: 1, type: 'mcq', prompt: 'Pick B', options: ['A', 'B', 'C'], answer: 'B' },
  { id: 2, type: 'text', prompt: 'Type', answer: '42' },
  { id: 3, type: 'mcq', prompt: 'Pick A', options: ['A', 'B'], answer: 'A' },
]);

describe('facilitator review', () => {
  it('builds review items from the stored answers', () => {
    const items = reviewItems(questions, {
      1: { selection: 'B', isCorrect: true, points: 1, seconds: 3, optionOrder: ['C', 'B', 'A'] },
      2: { selection: '<img src=x onerror=alert(1)>', isCorrect: false, points: 0, seconds: 5 },
      3: { selection: null, isCorrect: false, points: 0, seconds: null },
    });
    expect(items.map((item) => item.number)).toEqual([1, 2, 3]);
    expect(items[0].response).toEqual({ answer: 'B', hasAnswer: true, isCorrect: true, optionOrder: ['C', 'B', 'A'] });
    expect(items[1].response.hasAnswer).toBe(true);
    expect(items[2].response).toMatchObject({ hasAnswer: false, isCorrect: false });
  });

  it('shows a typed answer as text, never as HTML', () => {
    const [item] = reviewItems([questions[1]], { 2: { selection: '<img src=x onerror=alert(1)>', isCorrect: false } });
    const card = renderQuestionCard(item.question, item.number, DEFAULT_UI_TEXT, item.response);
    expect(card.querySelector('img')).toBeNull();
    expect(card.textContent).toContain('<img src=x onerror=alert(1)>');
  });
});

describe('cohort links', () => {
  it('opens the quiz next to the results page with the code filled in', async () => {
    const { cohortLink } = await import('../app/resultsPage.js');
    expect(cohortLink('https://quiz.example.org/results.html', 'cit-aptitude', 'ABC234')).toBe('https://quiz.example.org/?quiz=cit-aptitude&code=ABC234');
    expect(cohortLink('http://localhost:3000/sub/results.html?x=1', 'q', 'DEF567')).toBe('http://localhost:3000/sub/?quiz=q&code=DEF567');
  });
});

describe('question statistics view', () => {
  it('shows prompts and typed answers as text, flags and the chosen question', async () => {
    const { renderStatsView, sortStatsQuestions } = await import('../app/statsView.js');
    const stats = {
      submissions: 12, excluded: 2, enoughData: true, limit: 10000, truncated: false,
      overall: { averageScore: 1.5, total: 3, averagePercent: 50, skills: [] },
      questions: [
        { number: 1, id: 1, type: 'mcq', prompt: 'Pick <b>B</b>', skillLabel: null, answered: 12, percentCorrect: 95, discrimination: 0.1, averageSeconds: 12,
          options: [{ option: 'A', count: 1, correct: false }, { option: 'B', count: 11, correct: true }], mostCommonWrong: { answer: 'A', count: 1 } },
        { number: 2, id: 2, type: 'text', prompt: 'Type', skillLabel: null, answered: 10, percentCorrect: 10, discrimination: 0.5, averageSeconds: null,
          wrongAnswers: [{ answer: '<img src=x onerror=alert(1)>', count: 4 }], mostCommonWrong: { answer: '<img src=x onerror=alert(1)>', count: 4 } },
      ],
    };
    const root = document.createElement('div');
    renderStatsView(root, { stats, quiz: { meta: { uiText: DEFAULT_UI_TEXT }, questions: [questions[0], questions[1]] }, selectedId: 2 });
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('b')).toBeNull();
    expect(root.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(root.textContent).toContain('2 submissions were left out');
    expect([...root.querySelectorAll('tbody tr')].map((row) => row.dataset.id)).toEqual(['1', '2']);
    expect(root.querySelectorAll('.stats-flag-very-easy')).toHaveLength(1);
    expect(root.querySelectorAll('.stats-flag-no-separation')).toHaveLength(1);
    expect(root.querySelector('.stats-details')).not.toBeNull();
    expect(sortStatsQuestions(stats.questions, 'correct').map((item) => item.id)).toEqual([2, 1]);
  });
});
