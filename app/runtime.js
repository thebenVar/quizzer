import { getQuestionPoints } from './utils.js';

export function checkMCQAnswer(question, selectedOption, showImmediateCorrection = true) {
  const isCorrect = selectedOption === question.answer;
  const pointsAwarded = isCorrect && !question.isBonus ? (question.points || 0) : 0;

  let feedback = isCorrect ? 'Correct!' : 'Incorrect!';
  if (!isCorrect && showImmediateCorrection && !question.isBonus) {
    feedback += ` The correct answer was: ${question.answer}.`;
    if (question.explanation) {
      feedback += `<br><span class="feedback-justification">Why? ${question.explanation}</span>`;
    }
  }

  const reviewItem = (!isCorrect && !question.isBonus) ? {
    questionText: question.prompt,
    userAnswer: selectedOption,
    correctAnswer: question.answer,
    justification: question.explanation || "No specific justification provided."
  } : null;

  return { isCorrect, pointsAwarded, feedback, reviewItem };
}

export function checkMatchingAnswer(question, userAnswers, showImmediateCorrection = true) {
  let correctMatches = 0;
  const userMatches = {};
  const correctPairs = {};

  question.pairs.forEach(([left, right]) => {
    const userAnswer = userAnswers[left];
    userMatches[left] = userAnswer || "Not Answered";
    correctPairs[left] = right;

    if (userAnswer === right) {
      correctMatches += 1;
    }
  });

  const isAllCorrect = correctMatches === question.pairs.length;
  const pointsAwarded = isAllCorrect && !question.isBonus ? getQuestionPoints(question) : 0;

  let feedback = '';
  if (question.isBonus) {
    feedback = isAllCorrect ? 'Bonus Correct! Candy Earned! 🍬' : `Bonus Incorrect (${correctMatches}/${question.pairs.length})`;
    if (!isAllCorrect && showImmediateCorrection && question.explanation) {
      feedback += `<br><span class="feedback-justification">Hint: ${question.explanation}</span>`;
    }
  } else {
    feedback = `Answer Submitted! (${correctMatches}/${question.pairs.length} correct)`;
    if (!isAllCorrect && showImmediateCorrection) {
      feedback += ` Some matches were incorrect. Review at the end.`;
      if (question.explanation) {
        feedback += `<br><span class="feedback-justification">Why? ${question.explanation}</span>`;
      }
    }
  }

  const reviewItem = !isAllCorrect ? {
    questionText: question.prompt + (question.isBonus ? " (Bonus)" : ""),
    userAnswer: userMatches,
    correctAnswer: correctPairs,
    justification: question.explanation || "Match all pairs correctly.",
    isMatching: true
  } : null;

  return { isCorrect: isAllCorrect, correctMatches, totalPairs: question.pairs.length, pointsAwarded, feedback, reviewItem };
}
