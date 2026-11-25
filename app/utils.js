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

// Points a question is worth when answered correctly. A matching question
// without its own points is worth one point per pair.
export function getQuestionPoints(question) {
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

// Score per skill, in the order the skills are listed in meta.json.
// `questions` are the questions asked (unanswered ones still count in the total);
// `answers` are { questionId, isCorrect } for each answered question.
export function calculateSkillBreakdown(skills, questions, answers) {
  const correctIds = new Set(answers.filter((answer) => answer.isCorrect).map((answer) => answer.questionId));

  return skills
    .map((skill) => {
      const skillQuestions = questions.filter((question) => !question.isBonus && question.skill === skill.id);
      return {
        id: skill.id,
        label: skill.label,
        correct: skillQuestions.filter((question) => correctIds.has(question.id)).length,
        total: skillQuestions.length,
      };
    })
    .filter((row) => row.total > 0);
}
