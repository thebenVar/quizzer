import { describe, expect, it } from 'vitest';

import {
  calculateRegularQuestionStats,
  formatMinutesSeconds,
  getResultMessage,
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