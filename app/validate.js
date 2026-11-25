import { findSpotWordIndexes, normalizeTextAnswer } from './utils.js';

// Every piece of text the quiz shows. A quiz can override any of these in
// meta.json "uiText". Words in {braces} are filled in by the app.
export const DEFAULT_UI_TEXT = Object.freeze({
  // Start screen
  homeLinkLabel: '← All quizzes',
  nameLabel: 'Enter Your Name:',
  namePlaceholder: 'Your Name',
  defaultPlayerName: 'Quiz Taker',
  correctionModeLabel: 'Feedback on incorrect answers:',
  immediateCorrectionLabel: 'Show correction immediately',
  delayedCorrectionLabel: 'Show only in final review',
  startButtonLabel: 'Start Quiz',
  nameRequiredHint: 'Enter your name to begin.',
  resumeHeading: 'You have a test in progress.',
  resumeDetails: 'Question {current} of {total} · {time} left',
  resumeButtonLabel: 'Resume your test',
  startOverButtonLabel: 'Start over',
  resultsCollectedNotice: 'Your name and answers will be sent to the facilitators. Only they can see them.',

  // Cohort code on the start screen (meta.json "cohortCodes": "optional" or "required")
  cohortCodeLabel: 'Cohort code',
  cohortCodePlaceholder: 'e.g. ABC234',
  cohortCodeHint: 'If your facilitator gave you a code',
  cohortCodeRequiredHint: 'Enter the code your facilitator gave you.',
  cohortChecking: 'Checking the code…',
  cohortInvalid: 'This code is not valid for this quiz. Check it with your facilitator.',
  cohortUnchecked: "The code could not be checked now; it will be checked when your results are sent.",
  cohortLabel: 'Cohort: {label}',

  // While answering
  questionProgress: 'Question {current} / {total}',
  bonusProgress: 'Bonus Question!',
  bonusBadge: '✨ BONUS ✨',
  timeLeft: 'Time Left: {time}',
  timesUp: "Time's up!",
  liveCorrectCount: '✔️ {count}',
  liveIncorrectCount: '❌ {count}',
  streakCounter: '🔥 Streak: {count}',
  matchPlaceholder: 'Select match...',
  answerSaved: 'Answer saved.',
  submitButtonLabel: 'Submit Answer',
  nextButtonLabel: 'Next Question',
  keyboardHint: 'Tip: press 1–{max} to choose, Enter for next',
  keyboardHintMatching: 'Tip: press Enter for next',
  keyboardHintQuiz: 'Tip: press 1–{max} to choose',
  keyboardHintTabChoose: 'Tip: press Tab to move between choices and Enter to choose',
  keyboardHintTabChooseNext: 'Tip: press Tab to move between choices and Enter to choose; Enter again for next',
  keyboardHintTextSubmit: 'Tip: press Enter to submit',

  // Question types: statements (True / False / Can't tell), spot the error, typed answer
  statementTrue: 'True',
  statementFalse: 'False',
  statementCannotTell: "Can't tell",
  statementsFeedback: '{correct} of {total} statements correct.',
  statementCorrectReveal: 'Correct: {answer}',
  spotSourceLabel: 'Source',
  textAnswerLabel: 'Your answer',
  textAnswerPlaceholder: 'Type your answer',

  // Test mode: moving between questions and submitting
  testNextButtonLabel: 'Next',
  testBackButtonLabel: 'Back',
  testFinishButtonLabel: 'Finish',
  finishHeading: 'Ready to submit?',
  finishAnsweredCount: 'You have answered {answered} of {total} questions.',
  finishUnansweredLabel: 'Not answered yet (tap a number to go to it):',
  finishAllAnswered: 'You have answered every question.',
  finishJumpToQuestion: 'Go to question {number}',
  finishPartlyAnsweredTag: '{number} · partly answered',
  finishJumpToPartlyAnswered: 'Go to question {number} (partly answered)',
  backToTestLabel: 'Back to the test',
  submitTestLabel: 'Submit test',
  leaveTestWarning: 'Your test is still in progress. Leave anyway?',

  // Feedback after an answer
  correctFeedback: 'Correct!',
  incorrectFeedback: 'Incorrect!',
  correctAnswerReveal: 'The correct answer was: {answer}.',
  explanationPrefix: 'Why?',
  hintPrefix: 'Hint:',
  matchingFeedback: 'Answer Submitted! ({correct}/{total} correct)',
  matchingSomeWrong: 'Some matches were incorrect. Review at the end.',
  bonusCorrectFeedback: 'Bonus Correct! 🎉',
  bonusIncorrectFeedback: 'Bonus Incorrect ({correct}/{total})',

  // Results screen
  resultHeading: 'Quiz Complete!',
  finalScoreLabel: 'Your final score is:',
  correctCountLabel: 'Correct:',
  incorrectCountLabel: 'Incorrect:',
  timeTakenLabel: 'Time Taken:',
  achievementsHeading: 'Achievements / Gifts Earned:',
  skillBreakdownHeading: 'Results by skill',
  skillScore: '{correct} / {total}',
  skillScoreWithTime: '{correct} / {total} · {time}',
  unansweredCountLabel: 'Not answered:',
  bonusGiftLabel: '(Bonus!)',
  shareButtonLabel: 'Share Score',
  shareNotReady: 'Share functionality is still loading, please try again in a moment.',
  shareFailed: 'Sorry, there was an error generating the score image.',
  downloadResultsLabel: 'Download my results',
  shareResultsLabel: 'Share my results',
  shareResultsFailed: 'Sorry, the results could not be shared.',
  shareResultsTitle: '{title}: results for {name}',

  // Results sent to the facilitators (meta.json "collectResults": true)
  resultsSending: 'Sending your results…',
  resultsSent: '✓ Your results were sent.',
  resultsSendFailed: "Couldn't send your results. They will be sent automatically next time you open this quiz. You can also download your results and send the file to your facilitator.",
  resultsSendRejected: 'Your results could not be accepted. Please download your results and send the file to your facilitator.',
  resultsRetryLabel: 'Try again',

  // Downloaded results file
  resultsFileHeading: 'Results',
  resultsFileNameLabel: 'Name',
  resultsFileDateLabel: 'Date',
  resultsFileTimeTakenLabel: 'Time taken',
  resultsFileScoreLabel: 'Score',
  resultsFileSkillColumn: 'Skill',
  resultsFileScoreColumn: 'Score',
  resultsFileTimeColumn: 'Time',
  resultsFileReviewHeading: 'Your answers',

  // Review of answers at the end
  reviewToggleClosed: 'Review my answers',
  reviewToggleOpen: 'Hide Review',
  reviewNothingToReview: 'No incorrect answers to review!',
  reviewQuestionLabel: 'Q:',
  reviewYourAnswerLabel: 'Your Answer:',
  reviewCorrectAnswerLabel: 'Correct Answer:',
  reviewYourMatchesLabel: 'Your Matches:',
  reviewCorrectMatchesLabel: 'Correct Matches:',
  reviewNotAnswered: 'Not Answered',
  reviewBonusSuffix: '(Bonus)',
  reviewNoExplanation: 'No specific justification provided.',
  reviewMatchingNoExplanation: 'Match all pairs correctly.',
  reviewFilterWrong: 'Wrong only',
  reviewFilterAll: 'All questions',
  reviewYourAnswerTag: 'Your answer',
  reviewYourAnswerValue: 'Your answer: {answer}',
  reviewCorrectAnswerValue: 'Correct: {answer}',
  reviewNotAnsweredCard: 'Not answered',
  reviewYourMatchesHeading: 'Your matches',

  // Answer key page (?quiz=<id>-ans)
  answerKeyLabel: 'Answer key',
  answerKeyQuestionCount: '{count} questions',
  answerKeySkillCount: '{count} skills',
  answerKeyCorrect: 'Correct',
  answerKeyWhy: 'Why',
  answerKeyApproach: 'How to approach',
  answerKeyMatchingHeading: 'Correct matches',
  answerKeyAlsoAccepted: 'Also accepted: {answers}',
  answerKeyPrint: 'Print',
});

const DEFAULT_RESULT_BANDS = Object.freeze([
  { minPercent: 100, message: 'Excellent work, {name}! Perfect score!' },
  { minPercent: 70, message: 'Great job, {name}!' },
  { minPercent: 50, message: 'Good effort, {name}!' },
  { minPercent: 0, message: 'Keep practicing, {name}!' },
]);

const DEFAULT_ACHIEVEMENT_LABELS = Object.freeze({
  perfectScore: 'Perfect Score! ✨',
  highScore: 'High Score! 👍',
  noAchievements: 'No special achievements or gifts this time.',
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

// "quiz": feedback after each answer, streaks and gifts.
// "test": no feedback until the end, no streaks or gifts; for assessments.
const QUIZ_MODES = ['quiz', 'test'];

// "off": no cohort code. "optional": a field anyone may leave empty. "required": Start needs a code.
export const COHORT_CODE_MODES = Object.freeze(['off', 'optional', 'required']);

// Optional list of skills a quiz measures; questions name one with "skill",
// and the results screen shows a score per skill, in this order.
function validateSkills(skills) {
  if (skills === undefined) {
    return [];
  }
  assert(Array.isArray(skills), 'meta.skills must be a list');

  const seen = new Set();
  return skills.map((skill, index) => {
    const path = `meta.skills[${index}]`;
    assert(isPlainObject(skill), `${path} must be an object with "id" and "label"`);
    assert(isNonEmptyString(skill.id), `${path}.id is required`);
    assert(isNonEmptyString(skill.label), `${path}.label is required`);
    const id = skill.id.trim();
    assert(!seen.has(id), `${path}.id "${id}" is used more than once`);
    seen.add(id);
    assert(skill.description === undefined || typeof skill.description === 'string', `${path}.description must be text`);
    return { id, label: skill.label.trim(), description: normalizeStringField(skill.description).trim() };
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
    assert(key in DEFAULT_UI_TEXT, `meta.uiText.${key} is not a known text (check the spelling)`);
    assert(typeof value === 'string', `meta.uiText.${key} must be a string`);
    normalizedUiText[key] = value;
  }

  const normalizedResultBands = validateResultBands(scoring.resultBands ?? DEFAULT_RESULT_BANDS);

  const mode = meta.mode ?? 'quiz';
  assert(QUIZ_MODES.includes(mode), `meta.mode must be one of ${QUIZ_MODES.map((m) => `"${m}"`).join(', ')}`);

  const showAnswerReview = meta.showAnswerReview ?? true;
  assert(typeof showAnswerReview === 'boolean', 'meta.showAnswerReview must be true or false');

  // Send each participant's name and answers to the server for the facilitators (results.html).
  const collectResults = meta.collectResults ?? false;
  assert(typeof collectResults === 'boolean', 'meta.collectResults must be true or false');

  // A cohort code on the start screen, made by facilitators on results.html.
  const cohortCodes = meta.cohortCodes ?? 'off';
  assert(COHORT_CODE_MODES.includes(cohortCodes), `meta.cohortCodes must be one of ${COHORT_CODE_MODES.map((m) => `"${m}"`).join(', ')}`);
  assert(cohortCodes === 'off' || collectResults, 'meta.cohortCodes needs "collectResults": true (the code is sent with the results)');

  return {
    mode,
    showAnswerReview,
    collectResults,
    cohortCodes,
    skills: validateSkills(meta.skills),
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
  const answer = question.answer.trim();
  assert(options.includes(answer), `questions[${index}].answer "${answer}" must exactly match one of its options`);

  return {
    options,
    answer,
  };
}

// "statements": a passage and statements to judge True / False / Can't tell.
export const STATEMENT_ANSWERS = Object.freeze(['true', 'false', 'cannot-tell']);

function questionName(question) {
  return question.id === undefined ? '' : ` (question id ${JSON.stringify(question.id)})`;
}

function validateStatementsQuestion(question, index) {
  const path = `questions[${index}]`;
  const name = questionName(question);
  assert(
    question.points === undefined,
    `${path}.points is not used by "statements" questions${name}: each statement is worth one point; remove "points"`
  );
  assert(question.passage === undefined || typeof question.passage === 'string', `${path}.passage must be text${name}`);
  assert(
    Array.isArray(question.statements) && question.statements.length >= 2,
    `${path}.statements must be a list of at least two statements${name}`
  );

  const statements = question.statements.map((statement, statementIndex) => {
    const statementPath = `${path}.statements[${statementIndex}]`;
    assert(isPlainObject(statement), `${statementPath} must be an object with "text" and "answer"${name}`);
    assert(isNonEmptyString(statement.text), `${statementPath}.text is required${name}`);
    assert(
      STATEMENT_ANSWERS.includes(statement.answer),
      `${statementPath}.answer must be one of ${STATEMENT_ANSWERS.map((answer) => `"${answer}"`).join(', ')}${name}`
    );
    assert(statement.explanation === undefined || typeof statement.explanation === 'string', `${statementPath}.explanation must be text${name}`);
    return {
      text: statement.text.trim(),
      answer: statement.answer,
      explanation: normalizeStringField(statement.explanation).trim(),
    };
  });

  return {
    passage: normalizeStringField(question.passage).trim(),
    statements,
    points: statements.length,
  };
}

// "spot": tap the word in `text` that is wrong; `answer` must be exactly one word of it.
function validateSpotQuestion(question, index) {
  const path = `questions[${index}]`;
  const name = questionName(question);
  assert(isNonEmptyString(question.text), `${path}.text is required for a "spot" question${name}`);
  assert(question.source === undefined || typeof question.source === 'string', `${path}.source must be text${name}`);
  assert(isNonEmptyString(question.answer), `${path}.answer is required${name}`);
  const text = question.text.normalize('NFC').trim();
  const answer = question.answer.normalize('NFC').trim();
  const matches = findSpotWordIndexes(text, answer).length;
  assert(
    matches === 1,
    matches === 0
      ? `${path}.answer "${answer}" is not a word of its text${name} (write the word without punctuation, exactly as in the text)`
      : `${path}.answer "${answer}" appears ${matches} times in its text${name}; it must match exactly one word`
  );
  return { text, answer, source: normalizeStringField(question.source).trim() };
}

// "text": a typed answer, compared loosely (see textAnswerMatches in utils.js).
function validateTextQuestion(question, index) {
  const path = `questions[${index}]`;
  const name = questionName(question);
  assert(question.answer !== undefined && question.answer !== null, `${path}.answer is required${name}`);
  assert(typeof question.answer === 'string', `${path}.answer must be text (put it in quotes, e.g. "42")${name}`);
  assert(normalizeTextAnswer(question.answer) !== '', `${path}.answer is empty once spaces and a final full stop are removed${name}`);
  assert(question.accept === undefined || Array.isArray(question.accept), `${path}.accept must be a list of other accepted answers${name}`);
  const accept = (question.accept ?? []).map((alternative, alternativeIndex) => {
    assert(typeof alternative === 'string', `${path}.accept[${alternativeIndex}] must be text${name}`);
    assert(normalizeTextAnswer(alternative) !== '', `${path}.accept[${alternativeIndex}] is empty once spaces and a final full stop are removed${name}`);
    return alternative.normalize('NFC').trim();
  });
  return { answer: question.answer.normalize('NFC').trim(), accept };
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

  // Without "points", a question is worth 1, except matching (0 = one point per pair).
  // "statements" questions are always worth one point per statement.
  const points = question.points ?? (type === 'matching' ? 0 : 1);
  assert(Number.isFinite(points), `${path}.points must be a number`);

  const normalizedBase = {
    id: question.id,
    type,
    prompt: question.prompt.trim(),
    points,
    explanation: normalizeStringField(question.explanation),
    // Optional tip on how to think the question through; shown on the answer key page.
    approach: normalizeStringField(question.approach).trim(),
    isBonus,
    skill: question.skill === undefined ? null : question.skill,
  };
  assert(normalizedBase.skill === null || isNonEmptyString(normalizedBase.skill), `${path}.skill must be a skill id`);

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

  if (type === 'statements') {
    return { ...normalizedBase, ...validateStatementsQuestion(question, index) };
  }

  if (type === 'spot') {
    return { ...normalizedBase, ...validateSpotQuestion(question, index) };
  }

  if (type === 'text') {
    return { ...normalizedBase, ...validateTextQuestion(question, index) };
  }

  throw new Error(`${path}.type uses unsupported question type "${question.type}" (use mcq, matching, statements, spot or text)`);
}

export function validateQuestions(questions) {
  assert(Array.isArray(questions), 'questions must be an array');
  assert(questions.length > 0, 'questions must contain at least one question');

  const validated = questions.map((question, index) => validateQuestion(question, index));

  const seenIds = new Set();
  validated.forEach((question, index) => {
    assert(!seenIds.has(question.id), `questions[${index}].id ${JSON.stringify(question.id)} is used by more than one question`);
    seenIds.add(question.id);
  });

  const bonusCount = validated.filter((question) => question.isBonus).length;
  assert(bonusCount <= 1, `only one question can have "isBonus": true (found ${bonusCount})`);
  assert(bonusCount < validated.length, 'questions must contain at least one non-bonus question');

  return validated;
}
// Checks that meta.json and questions.json agree with each other.
export function validateQuizConsistency(meta, questions) {
  const skillIds = new Set(meta.skills.map((skill) => skill.id));

  questions.forEach((question, index) => {
    const path = `questions[${index}]`;
    if (question.skill !== null) {
      assert(skillIds.has(question.skill), `${path}.skill "${question.skill}" is not one of the skills in meta.json`);
    } else if (skillIds.size > 0 && !question.isBonus) {
      assert(false, `${path}.skill is required, because meta.json lists skills`);
    }
  });

  if (meta.mode === 'test') {
    assert(!questions.some((question) => question.isBonus), 'a quiz with "mode": "test" cannot have a bonus question');
  }
}
