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

export function calculateRegularQuestionStats(questions) {
  const regularQuestions = questions.filter((question) => !question.isBonus);

  return {
    totalPossibleScore: regularQuestions.reduce((sum, question) => sum + (question.points || 0), 0),
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

  return selectedBand.message.replaceAll('{name}', userName);
}

export function getNewStreakGiftClass({ currentStreak, streakRewards = {}, earnedGifts = [] }) {
  const giftClass = streakRewards[currentStreak];

  if (!giftClass) {
    return null;
  }

  const alreadyEarned = earnedGifts.some((gift) => gift.class === giftClass && gift.source === 'streak');
  return alreadyEarned ? null : giftClass;
}