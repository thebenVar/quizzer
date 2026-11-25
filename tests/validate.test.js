import { describe, expect, it } from 'vitest';

import { validateMeta, validateQuestions } from '../app/validate.js';

const baseMeta = {
  id: 'sample',
  title: 'Sample Quiz',
};

const validMcqQuestion = {
  id: 1,
  type: 'mcq',
  prompt: 'What is 2 + 2?',
  options: ['3', '4', '5'],
  answer: '4',
  points: 1,
};

const validMatchingQuestion = {
  id: 2,
  type: 'matching',
  prompt: 'Match the pairs.',
  pairs: [
    ['Alpha', 'A'],
    ['Beta', 'B'],
  ],
  points: 0,
  isBonus: true,
};

describe('validateMeta', () => {
  it('requires id and title', () => {
    expect(() => validateMeta({ title: 'Missing id' })).toThrow(/meta\.id is required/i);
    expect(() => validateMeta({ id: 'sample' })).toThrow(/meta\.title is required/i);
  });

  it('fills defaults for optional metadata', () => {
    const validated = validateMeta(baseMeta);

    expect(validated.pageTitle).toBe('Sample Quiz');
    expect(validated.timing).toEqual({
      timeLimitSeconds: 3600,
      autoAdvanceDelayMs: 2000,
    });
    expect(validated.uiText.startButtonLabel).toBe('Start Quiz');
    expect(validated.scoring.shareFileName).toBe('quiz-score.png');
    expect(validated.gamification.streakRewards).toEqual({});
    expect(validated.gamification.achievementLabels).toEqual({
      perfectScore: 'Perfect Score! ✨',
      highScore: 'High Score! 👍',
      noAchievements: 'No special achievements or gifts this time.',
    });
  });

  it('merges custom achievement labels with defaults', () => {
    const validated = validateMeta({
      ...baseMeta,
      gamification: {
        achievementLabels: {
          highScore: 'Quiz Champ!',
        },
      },
    });

    expect(validated.gamification.achievementLabels).toEqual({
      perfectScore: 'Perfect Score! ✨',
      highScore: 'Quiz Champ!',
      noAchievements: 'No special achievements or gifts this time.',
    });
  });
});

describe('validateQuestions', () => {
  it('accepts valid mcq and matching questions', () => {
    const validated = validateQuestions([validMcqQuestion, validMatchingQuestion]);

    expect(validated).toHaveLength(2);
    expect(validated[0]).toMatchObject({
      type: 'mcq',
      isBonus: false,
      explanation: '',
    });
    expect(validated[1]).toMatchObject({
      type: 'matching',
      isBonus: true,
    });
  });

  it('accepts question types in any letter case', () => {
    const [validated] = validateQuestions([{ ...validMcqQuestion, type: 'MCQ' }]);
    expect(validated.type).toBe('mcq');
  });

  it('rejects a question without a prompt', () => {
    expect(() => validateQuestions([{ ...validMcqQuestion, prompt: '' }])).toThrow(/questions\[0\]\.prompt is required/i);
  });

  it('rejects unsupported question types', () => {
    expect(() => validateQuestions([{ ...validMcqQuestion, type: 'essay' }])).toThrow(/unsupported question type/i);
  });

  it('rejects mcq questions without options', () => {
    expect(() => validateQuestions([{ ...validMcqQuestion, options: [] }])).toThrow(/questions\[0\]\.options must contain at least two options/i);
  });

  it('rejects mcq questions without an answer', () => {
    expect(() => validateQuestions([{ ...validMcqQuestion, answer: '' }])).toThrow(/questions\[0\]\.answer is required/i);
  });

  it('rejects mcq questions whose answer is not one of the options', () => {
    expect(() => validateQuestions([{ ...validMcqQuestion, answer: 'Four' }])).toThrow(/must exactly match one of its options/i);
  });

  it('rejects malformed matching payloads', () => {
    expect(() =>
      validateQuestions([
        {
          ...validMatchingQuestion,
          pairs: [['Alpha'], ['Beta', 'B']],
        },
      ])
    ).toThrow(/questions\[0\]\.pairs must be an array of two-item string pairs/i);
  });

  it('rejects duplicate question ids', () => {
    expect(() => validateQuestions([validMcqQuestion, { ...validMcqQuestion }])).toThrow(/questions\[1\]\.id 1 is used by more than one question/i);
  });

  it('rejects more than one bonus question', () => {
    expect(() =>
      validateQuestions([validMcqQuestion, validMatchingQuestion, { ...validMatchingQuestion, id: 3 }])
    ).toThrow(/only one question can have "isBonus": true/i);
  });

  it('rejects a quiz with only a bonus question', () => {
    expect(() => validateQuestions([validMatchingQuestion])).toThrow(/at least one non-bonus question/i);
  });
});
