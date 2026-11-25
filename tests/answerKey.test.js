/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';

import { groupQuestionsForAnswerKey, renderAnswerKey } from '../app/answerKey.js';
import { validateMeta, validateQuestions } from '../app/validate.js';

const meta = validateMeta({
  id: 'demo',
  title: 'Demo',
  skills: [
    { id: 'logic', label: 'Logic', description: 'Reason from the facts.' },
    { id: 'detail', label: 'Detail' },
  ],
});

const questions = validateQuestions([
  { id: 'd1', type: 'mcq', skill: 'detail', prompt: 'Count the e’s', options: ['5', '6'], answer: '6', points: 1, explanation: 'Six in all.', approach: 'Word by word.' },
  { id: 'l1', type: 'mcq', skill: 'logic', prompt: 'Who checks Mark?', options: ['Asha', 'Dev'], answer: 'Dev', points: 1 },
  { id: 'm1', type: 'matching', skill: 'logic', prompt: 'Match them', pairs: [['A', 'a'], ['B', 'b']], points: 2 },
]);

describe('groupQuestionsForAnswerKey', () => {
  it('groups by skill in meta.json order, keeping question order within a skill', () => {
    const groups = groupQuestionsForAnswerKey(meta, questions);
    expect(groups.map((group) => group.skill.id)).toEqual(['logic', 'detail']);
    expect(groups[0].questions.map((question) => question.id)).toEqual(['l1', 'm1']);
  });

  it('keeps file order without skills, with the bonus question last', () => {
    const plainMeta = validateMeta({ id: 'plain', title: 'Plain' });
    const plain = validateQuestions([
      { id: 1, type: 'matching', prompt: 'Bonus', pairs: [['A', 'a']], isBonus: true },
      { id: 2, type: 'mcq', prompt: 'Q', options: ['x', 'y'], answer: 'x' },
    ]);
    const groups = groupQuestionsForAnswerKey(plainMeta, plain);
    expect(groups.map((group) => group.questions.map((question) => question.id))).toEqual([[2], [1]]);
  });
});

describe('renderAnswerKey', () => {
  const root = document.createElement('div');
  renderAnswerKey(root, { meta, questions });

  it('shows a section per skill with its description, and numbers questions in page order', () => {
    expect([...root.querySelectorAll('.ak-section-title')].map((h) => h.textContent)).toEqual(['Logic', 'Detail']);
    expect(root.querySelector('.ak-section-intro').textContent).toBe('Reason from the facts.');
    expect([...root.querySelectorAll('.ak-number')].map((n) => n.textContent)).toEqual(['1', '2', '3']);
  });

  it('marks exactly the correct option of a multiple-choice question', () => {
    const card = root.querySelectorAll('.ak-card')[0];
    const correct = card.querySelectorAll('.ak-option-correct');
    expect(correct).toHaveLength(1);
    expect(correct[0].querySelector('.ak-option-text').textContent).toBe('Dev');
  });

  it('lists the correct pairs of a matching question', () => {
    const card = root.querySelectorAll('.ak-card')[1];
    expect([...card.querySelectorAll('.ak-match')].map((li) => li.textContent)).toEqual(['A→a', 'B→b']);
  });

  it('shows why and how to approach when given', () => {
    const card = root.querySelectorAll('.ak-card')[2];
    expect(card.querySelector('.ak-note-why .ak-note-body').textContent).toBe('Six in all.');
    expect(card.querySelector('.ak-note-approach .ak-note-body').textContent).toBe('Word by word.');
  });

  it('shows the counts and jump links to each skill', () => {
    expect(root.querySelector('.ak-counts').textContent).toBe('3 questions · 2 skills');
    expect([...root.querySelectorAll('.ak-nav-link')].map((a) => a.getAttribute('href'))).toEqual(['#skill-logic', '#skill-detail']);
  });
});
