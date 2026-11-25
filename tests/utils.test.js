import { describe, expect, it } from 'vitest';

import {
  calculateRegularQuestionStats,
  calculateSkillBreakdown,
  fillText,
  formatMinutesSeconds,
  getResultMessage,
  getShareFileName,
  getNewStreakGiftClass,
  shuffleArray,
} from '../app/utils.js';

describe('shuffleArray', () => {
  it('preserves all items while shuffling deterministically with an injected random function', () => {
    const values = [1, 2, 3, 4];
    const shuffled = shuffleArray(values, () => 0);

    expect(shuffled).toEqual([2, 3, 4, 1]);
    expect([...shuffled].sort()).toEqual([1, 2, 3, 4]);
  });
});

describe('formatMinutesSeconds', () => {
  it('formats minutes and seconds with zero padding', () => {
    expect(formatMinutesSeconds(65)).toBe('1:05');
    expect(formatMinutesSeconds(0)).toBe('0:00');
  });

  it('clamps negative values to zero', () => {
    expect(formatMinutesSeconds(-5)).toBe('0:00');
  });
});

describe('calculateRegularQuestionStats', () => {
  it('counts only non-bonus questions toward score totals', () => {
    const stats = calculateRegularQuestionStats([
      { id: 1, points: 2, isBonus: false },
      { id: 2, points: 3 },
      { id: 3, points: 0, isBonus: true },
    ]);

    expect(stats).toEqual({
      totalPossibleScore: 5,
      totalRegularQuestions: 2,
    });
  });

  it('counts a matching question without points as one point per pair', () => {
    const stats = calculateRegularQuestionStats([
      { id: 1, type: 'mcq', points: 1 },
      { id: 2, type: 'matching', points: 0, pairs: [['a', 'A'], ['b', 'B'], ['c', 'C']] },
    ]);

    expect(stats.totalPossibleScore).toBe(4);
  });
});

describe('getResultMessage', () => {
  const resultBands = [
    { minPercent: 100, message: 'Excellent work, {name}! Perfect score!' },
    { minPercent: 70, message: 'Great job, {name}!' },
    { minPercent: 50, message: 'Good effort, {name}!' },
    { minPercent: 0, message: 'Keep practicing, {name}!' },
  ];

  it('selects the highest qualifying result band and replaces the name token', () => {
    const message = getResultMessage({
      score: 4,
      totalPossibleScore: 5,
      userName: 'Ben',
      resultBands,
    });

    expect(message).toBe('Great job, Ben!');
  });

  it('falls back to the lowest band when the score is low', () => {
    const message = getResultMessage({
      score: 1,
      totalPossibleScore: 5,
      userName: 'Ben',
      resultBands,
    });

    expect(message).toBe('Keep practicing, Ben!');
  });

  it('uses metadata result bands to override the default tone', () => {
    const message = getResultMessage({
      score: 3,
      totalPossibleScore: 5,
      userName: 'Ben',
      resultBands: [
        { minPercent: 60, message: 'Solid work, {name}.' },
        { minPercent: 0, message: 'Study a bit more, {name}.' },
      ],
    });

    expect(message).toBe('Solid work, Ben.');
  });
});

describe('getShareFileName', () => {
  it('returns the configured metadata filename when present', () => {
    expect(getShareFileName({ shareFileName: 'custom-score.png' })).toBe('custom-score.png');
  });

  it('falls back to the default filename when metadata is missing', () => {
    expect(getShareFileName()).toBe('quiz-score.png');
    expect(getShareFileName({})).toBe('quiz-score.png');
  });
});

describe('getNewStreakGiftClass', () => {
  it('returns the gift for a newly reached streak threshold', () => {
    const giftClass = getNewStreakGiftClass({
      currentStreak: 2,
      streakRewards: {
        2: 'fas fa-candy-cane',
      },
      earnedGifts: [],
    });

    expect(giftClass).toBe('fas fa-candy-cane');
  });

  it('returns null when the streak reward has already been earned', () => {
    const giftClass = getNewStreakGiftClass({
      currentStreak: 2,
      streakRewards: {
        2: 'fas fa-candy-cane',
      },
      earnedGifts: [{ class: 'fas fa-candy-cane', source: 'streak' }],
    });

    expect(giftClass).toBeNull();
  });
});

describe('fillText', () => {
  it('fills in {placeholders}', () => {
    expect(fillText('Question {current} / {total}', { current: 3, total: 10 })).toBe('Question 3 / 10');
  });

  it('leaves unknown placeholders alone', () => {
    expect(fillText('Hello {name}', {})).toBe('Hello {name}');
  });
});

describe('calculateSkillBreakdown', () => {
  const skills = [
    { id: 'logic', label: 'Logic' },
    { id: 'detail', label: 'Detail' },
    { id: 'unused', label: 'Unused' },
  ];
  const questions = [
    { id: 1, skill: 'logic' },
    { id: 2, skill: 'logic' },
    { id: 3, skill: 'detail' },
    { id: 4, skill: 'detail' },
  ];

  it('scores each skill in the listed order, counting unanswered questions in the total', () => {
    const answers = [
      { questionId: 1, isCorrect: true },
      { questionId: 2, isCorrect: false },
      { questionId: 3, isCorrect: true },
    ];

    expect(calculateSkillBreakdown(skills, questions, answers)).toEqual([
      { id: 'logic', label: 'Logic', correct: 1, total: 2 },
      { id: 'detail', label: 'Detail', correct: 1, total: 2 },
    ]);
  });

  it('is empty when the quiz has no skills', () => {
    expect(calculateSkillBreakdown([], questions, [])).toEqual([]);
  });
});
