import { fillText, getQuestionPoints, textAnswerMatches, tokenizeSpotText } from './utils.js';
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

// The uiText label of a statement answer ("true" / "false" / "cannot-tell").
export function statementAnswerLabel(answer, text = DEFAULT_UI_TEXT) {
  if (answer === 'true') return text.statementTrue;
  if (answer === 'false') return text.statementFalse;
  if (answer === 'cannot-tell') return text.statementCannotTell;
  return text.reviewNotAnswered;
}

// "statements": one point per statement judged correctly (partial credit).
// `choices` is { statementIndex: "true" | "false" | "cannot-tell" }.
export function checkStatementsAnswer(question, choices, showImmediateCorrection = true, text = DEFAULT_UI_TEXT) {
  const given = choices && typeof choices === 'object' ? choices : {};
  const results = question.statements.map((statement, index) => given[index] === statement.answer);
  const correctCount = results.filter(Boolean).length;
  const total = question.statements.length;
  const isCorrect = correctCount === total;
  const pointsAwarded = question.isBonus ? 0 : correctCount;

  let feedback = isCorrect ? text.correctFeedback : fillText(text.statementsFeedback, { correct: correctCount, total });
  if (!isCorrect && showImmediateCorrection && question.explanation) {
    feedback += explanationHtml(text.explanationPrefix, question.explanation);
  }
  return { isCorrect, correctCount, total, results, pointsAwarded, feedback };
}

// "spot": `selectedIndex` is the index of the tapped word in the text.
export function checkSpotAnswer(question, selectedIndex, showImmediateCorrection = true, text = DEFAULT_UI_TEXT) {
  const token = Number.isInteger(selectedIndex) ? tokenizeSpotText(question.text)[selectedIndex] : undefined;
  const isCorrect = Boolean(token) && token.word === question.answer;
  const pointsAwarded = isCorrect && !question.isBonus ? (question.points || 0) : 0;

  let feedback = isCorrect ? text.correctFeedback : text.incorrectFeedback;
  if (!isCorrect && showImmediateCorrection && !question.isBonus) {
    feedback += ' ' + fillText(text.correctAnswerReveal, { answer: question.answer });
    if (question.explanation) {
      feedback += explanationHtml(text.explanationPrefix, question.explanation);
    }
  }
  return { isCorrect, pointsAwarded, feedback };
}

// "text": the typed answer, compared loosely with the answer and its `accept` list.
export function checkTextAnswer(question, typed, showImmediateCorrection = true, text = DEFAULT_UI_TEXT) {
  const isCorrect = textAnswerMatches(typed, question.answer, question.accept);
  const pointsAwarded = isCorrect && !question.isBonus ? (question.points || 0) : 0;

  let feedback = isCorrect ? text.correctFeedback : text.incorrectFeedback;
  if (!isCorrect && showImmediateCorrection && !question.isBonus) {
    feedback += ' ' + fillText(text.correctAnswerReveal, { answer: question.answer });
    if (question.explanation) {
      feedback += explanationHtml(text.explanationPrefix, question.explanation);
    }
  }
  return { isCorrect, pointsAwarded, feedback };
}

// Checks an answer of any question type.
export function checkAnswer(question, selection, showImmediateCorrection = true, text = DEFAULT_UI_TEXT) {
  switch (question.type) {
    case 'matching': return checkMatchingAnswer(question, selection || {}, showImmediateCorrection, text);
    case 'statements': return checkStatementsAnswer(question, selection, showImmediateCorrection, text);
    case 'spot': return checkSpotAnswer(question, selection, showImmediateCorrection, text);
    case 'text': return checkTextAnswer(question, selection, showImmediateCorrection, text);
    default: return checkMCQAnswer(question, selection, showImmediateCorrection, text);
  }
}
