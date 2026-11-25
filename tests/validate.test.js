import { describe, expect, it } from 'vitest';

import { validateMeta, validateQuestions, validateQuizConsistency } from '../app/validate.js';

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
  it('accepts uiText overrides and keeps defaults for the rest', () => {
    const validated = validateMeta({ ...baseMeta, uiText: { startButtonLabel: 'Go!' } });
    expect(validated.uiText.startButtonLabel).toBe('Go!');
    expect(validated.uiText.submitButtonLabel).toBe('Submit Answer');
  });

  it('rejects misspelled uiText keys', () => {
    expect(() => validateMeta({ ...baseMeta, uiText: { startButonLabel: 'Go!' } })).toThrow(/meta\.uiText\.startButonLabel is not a known text/);
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

describe('test mode and skills', () => {
  const skills = [{ id: 'logic', label: 'Logic' }];

  it('defaults to quiz mode, answer review on, and no skills', () => {
    const validated = validateMeta(baseMeta);
    expect(validated.mode).toBe('quiz');
    expect(validated.showAnswerReview).toBe(true);
    expect(validated.skills).toEqual([]);
  });

  it('accepts test mode with skills', () => {
    const validated = validateMeta({ ...baseMeta, mode: 'test', showAnswerReview: false, skills });
    expect(validated).toMatchObject({ mode: 'test', showAnswerReview: false, skills });
  });

  it('rejects an unknown mode', () => {
    expect(() => validateMeta({ ...baseMeta, mode: 'exam' })).toThrow(/meta\.mode must be one of "quiz", "test"/);
  });

  it('rejects duplicate skill ids', () => {
    expect(() => validateMeta({ ...baseMeta, skills: [...skills, ...skills] })).toThrow(/"logic" is used more than once/);
  });

  it('requires every question to name a listed skill when the quiz has skills', () => {
    const meta = validateMeta({ ...baseMeta, skills });
    const [withSkill] = validateQuestions([{ ...validMcqQuestion, skill: 'logic' }]);
    const [unknownSkill] = validateQuestions([{ ...validMcqQuestion, skill: 'maths' }]);
    const [noSkill] = validateQuestions([validMcqQuestion]);

    expect(() => validateQuizConsistency(meta, [withSkill])).not.toThrow();
    expect(() => validateQuizConsistency(meta, [unknownSkill])).toThrow(/skill "maths" is not one of the skills/);
    expect(() => validateQuizConsistency(meta, [noSkill])).toThrow(/skill is required/);
  });

  it('rejects a bonus question in test mode', () => {
    const meta = validateMeta({ ...baseMeta, mode: 'test' });
    const questions = validateQuestions([validMcqQuestion, validMatchingQuestion]);
    expect(() => validateQuizConsistency(meta, questions)).toThrow(/cannot have a bonus question/);
  });
});
