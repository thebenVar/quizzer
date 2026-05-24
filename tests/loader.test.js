import { describe, expect, it } from 'vitest';

import { loadLegacyQuizDefinition, resolveLegacyQuestionArray } from '../app/loader.js';

const legacyMcqQuestion = {
  id: 301,
  question: 'Who was the first king of Israel?',
  type: 'MCQ',
  options: ['David', 'Solomon', 'Samuel', 'Saul'],
  answer: 'Saul',
  points: 1,
  justification: 'Saul was anointed by Samuel as the first king of Israel.',
};

const fallbackQuestion = {
  id: 999,
  question: 'Fallback question',
  type: 'MCQ',
  options: ['A', 'B'],
  answer: 'A',
  points: 1,
};

const baseMeta = {
  id: 'sample',
  title: 'Sample Quiz',
};

describe('resolveLegacyQuestionArray', () => {
  it('prefers mainQuizDataArray over quizData', () => {
    const questions = resolveLegacyQuestionArray({
      mainQuizDataArray: [legacyMcqQuestion],
      quizData: [fallbackQuestion],
    });

    expect(questions).toEqual([legacyMcqQuestion]);
  });

  it('falls back to quizData when mainQuizDataArray is absent', () => {
    const questions = resolveLegacyQuestionArray({
      quizData: [legacyMcqQuestion],
    });

    expect(questions).toEqual([legacyMcqQuestion]);
  });

  it('throws when no legacy question array is available', () => {
    expect(() => resolveLegacyQuestionArray({})).toThrow(/legacy quiz data not found/i);
  });
});

describe('loadLegacyQuizDefinition', () => {
  it('normalizes legacy questions and validates metadata', () => {
    const definition = loadLegacyQuizDefinition({
      meta: baseMeta,
      source: {
        quizData: [legacyMcqQuestion],
        streakThresholds: {
          2: 'fas fa-candy-cane',
        },
        bonusGiftClass: 'fas fa-star',
      },
    });

    expect(definition.meta).toMatchObject({
      id: 'sample',
      title: 'Sample Quiz',
      gamification: {
        streakRewards: {
          2: 'fas fa-candy-cane',
        },
        bonusRewardClass: 'fas fa-star',
      },
    });

    expect(definition.questions).toEqual([
      {
        id: 301,
        type: 'mcq',
        prompt: 'Who was the first king of Israel?',
        options: ['David', 'Solomon', 'Samuel', 'Saul'],
        answer: 'Saul',
        points: 1,
        explanation: 'Saul was anointed by Samuel as the first king of Israel.',
        isBonus: false,
      },
    ]);
  });
});