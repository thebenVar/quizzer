const DEFAULT_UI_TEXT = Object.freeze({
  nameLabel: 'Enter Your Name:',
  namePlaceholder: 'Your Name',
  correctionModeLabel: 'Feedback on incorrect answers:',
  immediateCorrectionLabel: 'Show correction immediately',
  delayedCorrectionLabel: 'Show only in final review',
  startButtonLabel: 'Start Quiz',
  resultHeading: 'Quiz Complete!',
  reviewToggleClosed: 'Review Incorrect Answers',
  reviewToggleOpen: 'Hide Review',
  shareButtonLabel: 'Share Score',
});

const DEFAULT_RESULT_BANDS = Object.freeze([
  { minPercent: 100, message: 'Excellent work, {name}! Perfect score!' },
  { minPercent: 70, message: 'Great job, {name}!' },
  { minPercent: 50, message: 'Good effort, {name}!' },
  { minPercent: 0, message: 'Keep practicing, {name}!' },
]);

const DEFAULT_ACHIEVEMENT_LABELS = Object.freeze({
  perfectScore: 'Perfect Score! ✨',
  highScore: 'High Score!',
});

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeOptionalObject(value, path) {
  if (value === undefined) {
    return {};
  }

  assert(isPlainObject(value), `${path} must be an object`);
  return value;
}

function normalizeStringField(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function normalizeLegacyType(type) {
  return isNonEmptyString(type) ? type.trim().toLowerCase() : type;
}

export function normalizeLegacyQuestion(question) {
  assert(isPlainObject(question), 'legacy question must be an object');

  return {
    id: question.id,
    type: normalizeLegacyType(question.type),
    prompt: isNonEmptyString(question.prompt) ? question.prompt.trim() : normalizeStringField(question.question).trim(),
    options: Array.isArray(question.options) ? [...question.options] : undefined,
    answer: question.answer,
    pairs: Array.isArray(question.pairs) ? [...question.pairs] : undefined,
    points: question.points ?? 0,
    explanation: isNonEmptyString(question.explanation)
      ? question.explanation.trim()
      : normalizeStringField(question.justification).trim(),
    isBonus: question.isBonus === undefined ? false : question.isBonus,
  };
}

export function normalizeLegacyQuestions(questions) {
  assert(Array.isArray(questions), 'legacy questions must be an array');

  return questions.map((question) => normalizeLegacyQuestion(question));
}

function validateResultBands(resultBands) {
  assert(Array.isArray(resultBands), 'meta.scoring.resultBands must be an array');

  return resultBands.map((band, index) => {
    assert(isPlainObject(band), `meta.scoring.resultBands[${index}] must be an object`);
    assert(Number.isFinite(band.minPercent), `meta.scoring.resultBands[${index}].minPercent must be a number`);
    assert(isNonEmptyString(band.message), `meta.scoring.resultBands[${index}].message is required`);

    return {
      minPercent: band.minPercent,
      message: band.message.trim(),
    };
  });
}

export function validateMeta(meta) {
  assert(isPlainObject(meta), 'meta must be an object');
  assert(isNonEmptyString(meta.id), 'meta.id is required');
  assert(isNonEmptyString(meta.title), 'meta.title is required');

  const title = meta.title.trim();
  const branding = normalizeOptionalObject(meta.branding, 'meta.branding');
  const timing = normalizeOptionalObject(meta.timing, 'meta.timing');
  const uiText = normalizeOptionalObject(meta.uiText, 'meta.uiText');
  const scoring = normalizeOptionalObject(meta.scoring, 'meta.scoring');
  const gamification = normalizeOptionalObject(meta.gamification, 'meta.gamification');
  const achievementLabels = normalizeOptionalObject(
    gamification.achievementLabels,
    'meta.gamification.achievementLabels'
  );

  const streakRewards = gamification.streakRewards === undefined ? {} : gamification.streakRewards;
  assert(isPlainObject(streakRewards), 'meta.gamification.streakRewards must be an object');

  const timeLimitSeconds = timing.timeLimitSeconds ?? 3600;
  const autoAdvanceDelayMs = timing.autoAdvanceDelayMs ?? 2000;
  assert(Number.isFinite(timeLimitSeconds) && timeLimitSeconds > 0, 'meta.timing.timeLimitSeconds must be a positive number');
  assert(Number.isFinite(autoAdvanceDelayMs) && autoAdvanceDelayMs >= 0, 'meta.timing.autoAdvanceDelayMs must be a non-negative number');

  const normalizedUiText = { ...DEFAULT_UI_TEXT };
  for (const [key, value] of Object.entries(uiText)) {
    assert(typeof value === 'string', `meta.uiText.${key} must be a string`);
    normalizedUiText[key] = value;
  }

  const normalizedResultBands = validateResultBands(scoring.resultBands ?? DEFAULT_RESULT_BANDS);

  return {
    id: meta.id.trim(),
    title,
    pageTitle: isNonEmptyString(meta.pageTitle) ? meta.pageTitle.trim() : title,
    description: normalizeStringField(meta.description),
    branding: {
      logoSrc: isNonEmptyString(branding.logoSrc) ? branding.logoSrc.trim() : null,
      logoAlt: isNonEmptyString(branding.logoAlt) ? branding.logoAlt.trim() : `${title} logo`,
    },
    timing: {
      timeLimitSeconds,
      autoAdvanceDelayMs,
    },
    uiText: normalizedUiText,
    scoring: {
      resultBands: normalizedResultBands,
      shareFileName: isNonEmptyString(scoring.shareFileName) ? scoring.shareFileName.trim() : 'quiz-score.png',
    },
    gamification: {
      streakRewards: { ...streakRewards },
      bonusRewardClass: isNonEmptyString(gamification.bonusRewardClass)
        ? gamification.bonusRewardClass.trim()
        : null,
      achievementLabels: {
        ...DEFAULT_ACHIEVEMENT_LABELS,
        ...achievementLabels,
      },
    },
  };
}

function validateMatchingPairs(pairs, index) {
  const path = `questions[${index}].pairs`;
  assert(Array.isArray(pairs) && pairs.length > 0, `${path} must be an array of two-item string pairs`);

  const normalizedPairs = pairs.map((pair) => {
    const isValidPair =
      Array.isArray(pair) &&
      pair.length === 2 &&
      isNonEmptyString(pair[0]) &&
      isNonEmptyString(pair[1]);

    assert(isValidPair, `${path} must be an array of two-item string pairs`);

    return [pair[0].trim(), pair[1].trim()];
  });

  return normalizedPairs;
}

function validateMcqQuestion(question, index) {
  const optionsPath = `questions[${index}].options`;
  assert(Array.isArray(question.options) && question.options.length >= 2, `${optionsPath} must contain at least two options`);

  const options = question.options.map((option, optionIndex) => {
    assert(isNonEmptyString(option), `${optionsPath}[${optionIndex}] must be a non-empty string`);
    return option.trim();
  });

  assert(isNonEmptyString(question.answer), `questions[${index}].answer is required`);

  return {
    options,
    answer: question.answer.trim(),
  };
}

function validateQuestion(question, index) {
  const path = `questions[${index}]`;
  assert(isPlainObject(question), `${path} must be an object`);
  assert(question.id !== undefined && question.id !== null, `${path}.id is required`);
  assert(isNonEmptyString(question.type), `${path}.type is required`);
  assert(isNonEmptyString(question.prompt), `${path}.prompt is required`);

  const type = question.type.trim().toLowerCase();
  const isBonus = question.isBonus === undefined ? false : question.isBonus;
  assert(typeof isBonus === 'boolean', `${path}.isBonus must be a boolean`);

  const points = question.points ?? 0;
  assert(Number.isFinite(points), `${path}.points must be a number`);

  const normalizedBase = {
    id: question.id,
    type,
    prompt: question.prompt.trim(),
    points,
    explanation: normalizeStringField(question.explanation),
    isBonus,
  };

  if (type === 'mcq') {
    return {
      ...normalizedBase,
      ...validateMcqQuestion(question, index),
    };
  }

  if (type === 'matching') {
    return {
      ...normalizedBase,
      pairs: validateMatchingPairs(question.pairs, index),
    };
  }

  throw new Error(`${path}.type uses unsupported question type "${question.type}"`);
}

export function validateQuestions(questions) {
  assert(Array.isArray(questions), 'questions must be an array');
  assert(questions.length > 0, 'questions must contain at least one question');

  return questions.map((question, index) => validateQuestion(question, index));
}