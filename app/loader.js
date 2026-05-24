import { normalizeLegacyQuestions, validateMeta, validateQuestions } from './validate.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeLegacyMeta(meta, source) {
  assert(isPlainObject(meta), 'meta must be an object');
  assert(isPlainObject(source), 'legacy source must be an object');

  const existingGamification = isPlainObject(meta.gamification) ? meta.gamification : {};
  const existingAchievementLabels = isPlainObject(existingGamification.achievementLabels)
    ? existingGamification.achievementLabels
    : {};

  return {
    ...meta,
    gamification: {
      ...existingGamification,
      streakRewards: source.streakThresholds ?? existingGamification.streakRewards,
      bonusRewardClass: source.bonusGiftClass ?? existingGamification.bonusRewardClass,
      achievementLabels: existingAchievementLabels,
    },
  };
}

export function resolveLegacyQuestionArray(source) {
  assert(isPlainObject(source), 'legacy source must be an object');

  if (Array.isArray(source.mainQuizDataArray) && source.mainQuizDataArray.length > 0) {
    return source.mainQuizDataArray;
  }

  if (Array.isArray(source.quizData) && source.quizData.length > 0) {
    return source.quizData;
  }

  throw new Error('Legacy quiz data not found. Expected mainQuizDataArray or quizData.');
}

export function loadLegacyQuizDefinition({ meta, source }) {
  const legacyQuestions = resolveLegacyQuestionArray(source);
  const normalizedMeta = validateMeta(normalizeLegacyMeta(meta, source));
  const normalizedQuestions = validateQuestions(normalizeLegacyQuestions(legacyQuestions));

  return {
    meta: normalizedMeta,
    questions: normalizedQuestions,
  };
}