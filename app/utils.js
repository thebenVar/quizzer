export function shuffleArray(array, randomFn = Math.random) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(randomFn() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }

  return array;
}

export function formatMinutesSeconds(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Points a question is worth when answered correctly. A "statements" question is
// worth one point per statement; a matching question without its own points is
// worth one point per pair.
export function getQuestionPoints(question) {
  if (question.type === 'statements') {
    return question.statements.length;
  }
  if (question.points) {
    return question.points;
  }
  return question.type === 'matching' ? question.pairs.length : 0;
}

export function calculateRegularQuestionStats(questions) {
  const regularQuestions = questions.filter((question) => !question.isBonus);

  return {
    totalPossibleScore: regularQuestions.reduce((sum, question) => sum + getQuestionPoints(question), 0),
    totalRegularQuestions: regularQuestions.length,
  };
}

function calculatePercentage(score, totalPossibleScore) {
  return totalPossibleScore > 0 ? (score / totalPossibleScore) * 100 : 0;
}

export function getResultMessage({ score, totalPossibleScore, userName = 'Quiz Taker', resultBands }) {
  const percentage = calculatePercentage(score, totalPossibleScore);
  const sortedBands = [...resultBands].sort((left, right) => right.minPercent - left.minPercent);
  const selectedBand = sortedBands.find((band) => percentage >= band.minPercent) ?? sortedBands[sortedBands.length - 1];

  return fillText(selectedBand.message, { name: userName });
}

// Replaces {key} in a uiText template with values[key]; unknown keys are left as-is.
export function fillText(template, values = {}) {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
}

export function getShareFileName(scoring = {}) {
  return typeof scoring.shareFileName === 'string' && scoring.shareFileName.trim().length > 0
    ? scoring.shareFileName.trim()
    : 'quiz-score.png';
}

export function getNewStreakGiftClass({ currentStreak, streakRewards = {}, earnedGifts = [] }) {
  const giftClass = streakRewards[currentStreak];

  if (!giftClass) {
    return null;
  }

  const alreadyEarned = earnedGifts.some((gift) => gift.class === giftClass && gift.source === 'streak');
  return alreadyEarned ? null : giftClass;
}

// Score per skill, in points, in the order the skills are listed in meta.json.
// `questions` are the questions asked (unanswered ones still count in the total);
// `answers` are { questionId, isCorrect, points? } for each answered question, where
// `points` is the points awarded (partial credit); without it a correct answer
// earns the question's full points.
export function calculateSkillBreakdown(skills, questions, answers) {
  const earned = new Map();
  for (const answer of answers) {
    earned.set(answer.questionId, answer);
  }
  const pointsEarned = (question) => {
    const answer = earned.get(question.id);
    if (!answer) return 0;
    if (Number.isFinite(answer.points)) return answer.points;
    return answer.isCorrect ? getQuestionPoints(question) : 0;
  };

  return skills
    .map((skill) => {
      const skillQuestions = questions.filter((question) => !question.isBonus && question.skill === skill.id);
      return {
        id: skill.id,
        label: skill.label,
        correct: skillQuestions.reduce((sum, question) => sum + pointsEarned(question), 0),
        total: skillQuestions.reduce((sum, question) => sum + getQuestionPoints(question), 0),
      };
    })
    .filter((row) => row.total > 0);
}

// --- "spot" questions: the text split into tappable words ---
// Each whitespace-separated token keeps its punctuation for display (`before`,
// `after`), but only `word` (letters, combining marks such as Indic vowel signs,
// virama and Hebrew points, and digits; inner punctuation kept, as in "don't")
// is matched against the answer. The text is NFC-normalised first. Tokens with
// no letters or digits have an empty word and cannot be chosen.
export function tokenizeSpotText(text) {
  return String(text)
    .normalize('NFC')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map((token) => {
      const match = token.match(/^([^\p{L}\p{M}\p{N}]*)(.*?)([^\p{L}\p{M}\p{N}]*)$/su);
      return { token, before: match[1], word: match[2], after: match[3] };
    });
}

// Index of every token whose word is exactly `word` (both NFC-normalised).
export function findSpotWordIndexes(text, word) {
  const target = String(word).normalize('NFC');
  const indexes = [];
  tokenizeSpotText(text).forEach((token, index) => {
    if (token.word !== '' && token.word === target) indexes.push(index);
  });
  return indexes;
}

// --- "text" questions: comparing a typed answer ---
// NFC-normalised, trimmed, inner spaces collapsed, one trailing full stop
// removed, case ignored (plain toLowerCase, the same on every device).
export function normalizeTextAnswer(value) {
  return String(value ?? '')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\.$/, '')
    .trim()
    .toLowerCase();
}

// A plain decimal number: "42", "-3", "42.0", ".5". No exponents, no trailing ".".
const NUMBER_PATTERN = /^[+-]?(\d+(\.\d+)?|\.\d+)$/;

function asNumber(normalized) {
  return NUMBER_PATTERN.test(normalized) ? Number(normalized) : null;
}

// True when `typed` matches the answer or one of the `accept`ed alternatives;
// a number also matches the same number written differently ("42.0" = "42").
export function textAnswerMatches(typed, answer, accept = []) {
  const given = normalizeTextAnswer(typed);
  if (given === '') return false;
  const givenNumber = asNumber(given);
  return [answer, ...accept].some((candidate) => {
    const expected = normalizeTextAnswer(candidate);
    if (given === expected) return true;
    const expectedNumber = asNumber(expected);
    return givenNumber !== null && expectedNumber !== null && givenNumber === expectedNumber;
  });
}

// Keyboard shortcuts: "1"–"9" and "a"–"z" (by position) pick the Nth option (0-based); other keys give null.
export function optionIndexForKey(key) {
  if (typeof key !== 'string' || key.length !== 1) return null;
  if (key >= '1' && key <= '9') return Number(key) - 1;
  const lower = key.toLowerCase();
  if (lower >= 'a' && lower <= 'z') return lower.charCodeAt(0) - 97;
  return null;
}

// True when a key press is meant for a text field or dropdown, not for a shortcut.
export function isTypingTarget(target) {
  if (!target || typeof target !== 'object') return false;
  if (target.isContentEditable) return true;
  const tag = typeof target.tagName === 'string' ? target.tagName.toUpperCase() : '';
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}
