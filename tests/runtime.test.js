import { describe, expect, it } from 'vitest';
import { checkMCQAnswer, checkMatchingAnswer } from '../app/runtime.js';
import { DEFAULT_UI_TEXT } from '../app/validate.js';

describe('checkMCQAnswer', () => {
  const question = {
    id: 1,
    type: 'mcq',
    prompt: 'What is 2+2?',
    answer: '4',
    points: 1,
    explanation: 'Basic math.',
    isBonus: false
  };

  it('correctly identifies a correct answer', () => {
    const result = checkMCQAnswer(question, '4');
    expect(result.isCorrect).toBe(true);
    expect(result.pointsAwarded).toBe(1);
    expect(result.feedback).toBe('Correct!');
  });

  it('correctly identifies an incorrect answer', () => {
    const result = checkMCQAnswer(question, '5');
    expect(result.isCorrect).toBe(false);
    expect(result.pointsAwarded).toBe(0);
    expect(result.feedback).toMatch(/Incorrect!/);
  });

  it('does not award points for correct bonus questions', () => {
    const bonusQuestion = { ...question, isBonus: true };
    const result = checkMCQAnswer(bonusQuestion, '4');
    expect(result.isCorrect).toBe(true);
    expect(result.pointsAwarded).toBe(0);
  });
});

describe('checkMatchingAnswer', () => {
  const question = {
    id: 2,
    type: 'matching',
    prompt: 'Match caps to lowers.',
    pairs: [['A', 'a'], ['B', 'b']],
    points: 2,
    explanation: 'Alphabet.',
    isBonus: false
  };

  it('identifies perfect matches', () => {
    const userAnswers = { 'A': 'a', 'B': 'b' };
    const result = checkMatchingAnswer(question, userAnswers);
    expect(result.isCorrect).toBe(true);
    expect(result.correctMatches).toBe(2);
    expect(result.pointsAwarded).toBe(2);
  });

  it('identifies partial/incorrect matches', () => {
    const userAnswers = { 'A': 'a', 'B': 'wrong' };
    const result = checkMatchingAnswer(question, userAnswers);
    expect(result.isCorrect).toBe(false);
    expect(result.correctMatches).toBe(1);
    expect(result.pointsAwarded).toBe(0);
  });

  it('uses pairs length for points if points is 0', () => {
    const zeroPointsQuestion = { ...question, points: 0 };
    const userAnswers = { 'A': 'a', 'B': 'b' };
    const result = checkMatchingAnswer(zeroPointsQuestion, userAnswers);
    expect(result.pointsAwarded).toBe(2);
  });
});

describe('feedback wording', () => {
  const text = {
    ...DEFAULT_UI_TEXT,
    incorrectFeedback: 'Faux !',
    correctAnswerReveal: 'La bonne réponse était : {answer}.',
    explanationPrefix: 'Pourquoi ?',
    matchingFeedback: '{correct} sur {total}',
    reviewNotAnswered: 'Sans réponse',
  };

  it('uses the quiz texts for MCQ feedback', () => {
    const question = { id: 1, type: 'mcq', prompt: 'Q', answer: 'A', points: 1, explanation: 'Parce que.' };
    const result = checkMCQAnswer(question, 'B', true, text);
    expect(result.feedback).toContain('Faux ! La bonne réponse était : A.');
    expect(result.feedback).toContain('Pourquoi ? Parce que.');
  });

  it('fills counts into matching feedback', () => {
    const question = { id: 2, type: 'matching', prompt: 'Q', pairs: [['A', 'a'], ['B', 'b']], points: 2 };
    const result = checkMatchingAnswer(question, { A: 'a' }, false, text);
    expect(result.feedback).toBe('1 sur 2');
    expect(result.reviewItem.userAnswer.B).toBe('Sans réponse');
  });
});
