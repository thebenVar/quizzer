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
