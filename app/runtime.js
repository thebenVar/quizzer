import { fillText, getQuestionPoints } from './utils.js';
import { DEFAULT_UI_TEXT } from './validate.js';

function explanationHtml(prefix, explanation) {
  return `<br><span class="feedback-justification">${prefix} ${explanation}</span>`;
}

export function checkMCQAnswer(question, selectedOption, showImmediateCorrection = true, text = DEFAULT_UI_TEXT) {
  const isCorrect = selectedOption === question.answer;
  const pointsAwarded = isCorrect && !question.isBonus ? (question.points || 0) : 0;

  let feedback = isCorrect ? text.correctFeedback : text.incorrectFeedback;
  if (!isCorrect && showImmediateCorrection && !question.isBonus) {
    feedback += ' ' + fillText(text.correctAnswerReveal, { answer: question.answer });
    if (question.explanation) {
      feedback += explanationHtml(text.explanationPrefix, question.explanation);
    }
  }

  const reviewItem = (!isCorrect && !question.isBonus) ? {
    questionText: question.prompt,
    userAnswer: selectedOption,
    correctAnswer: question.answer,
    justification: question.explanation || text.reviewNoExplanation
  } : null;

  return { isCorrect, pointsAwarded, feedback, reviewItem };
}

export function checkMatchingAnswer(question, userAnswers, showImmediateCorrection = true, text = DEFAULT_UI_TEXT) {
  let correctMatches = 0;
  const userMatches = {};
  const correctPairs = {};

  question.pairs.forEach(([left, right]) => {
    const userAnswer = userAnswers[left];
    userMatches[left] = userAnswer || text.reviewNotAnswered;
    correctPairs[left] = right;

    if (userAnswer === right) {
      correctMatches += 1;
    }
  });

  const isAllCorrect = correctMatches === question.pairs.length;
  const pointsAwarded = isAllCorrect && !question.isBonus ? getQuestionPoints(question) : 0;
  const counts = { correct: correctMatches, total: question.pairs.length };

  let feedback = '';
  if (question.isBonus) {
    feedback = isAllCorrect ? text.bonusCorrectFeedback : fillText(text.bonusIncorrectFeedback, counts);
    if (!isAllCorrect && showImmediateCorrection && question.explanation) {
      feedback += explanationHtml(text.hintPrefix, question.explanation);
    }
  } else {
    feedback = fillText(text.matchingFeedback, counts);
    if (!isAllCorrect && showImmediateCorrection) {
      feedback += ' ' + text.matchingSomeWrong;
      if (question.explanation) {
        feedback += explanationHtml(text.explanationPrefix, question.explanation);
      }
    }
  }

  const reviewItem = !isAllCorrect ? {
    questionText: question.prompt + (question.isBonus ? ' ' + text.reviewBonusSuffix : ''),
    userAnswer: userMatches,
    correctAnswer: correctPairs,
    justification: question.explanation || text.reviewMatchingNoExplanation,
    isMatching: true
  } : null;

  return { isCorrect: isAllCorrect, correctMatches, totalPairs: question.pairs.length, pointsAwarded, feedback, reviewItem };
}
