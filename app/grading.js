// Grading stored answers and the score per skill. No DOM: used by the browser
// (results screen, review, results file) and by the server, which re-grades a
// submitted test (api/submit.js) without trusting the browser's score.
import { checkAnswer } from './runtime.js';
import { calculateRegularQuestionStats, calculateSkillBreakdown, fillText, formatMinutesSeconds } from './utils.js';
import { DEFAULT_UI_TEXT } from './validate.js';

// Answers are stored by question id; ids may be numbers, so keys are strings.
export function selectionFor(selections, question) {
  return selections ? selections[String(question.id)] : undefined;
}

// 'none', 'partial' (a matching or statements question with only some parts
// answered) or 'complete'.
export function answerStatus(question, selection) {
  if (question.type === 'matching' || question.type === 'statements') {
    if (!selection || typeof selection !== 'object') return 'none';
    const keys = question.type === 'matching'
      ? question.pairs.map(([left]) => left)
      : question.statements.map((statement, index) => String(index));
    const chosen = keys.filter((key) => typeof selection[key] === 'string' && selection[key] !== '').length;
    if (chosen === 0) return 'none';
    return chosen === keys.length ? 'complete' : 'partial';
  }
  if (question.type === 'spot') {
    return Number.isInteger(selection) && selection >= 0 ? 'complete' : 'none';
  }
  if (question.type === 'text') {
    return typeof selection === 'string' && selection.trim() !== '' ? 'complete' : 'none';
  }
  return typeof selection === 'string' && selection !== '' ? 'complete' : 'none';
}

// Grades the questions asked (in the order asked) from the stored answers.
// Unanswered questions score nothing and are counted separately; a bonus
// question is graded but, as during a quiz, not counted in the score.
// `optionOrders` (optional, by question id): the order each question's options were
// shown in, so the review letters them as the participant saw them.
export function gradeSelections(questions, selections, text = DEFAULT_UI_TEXT, optionOrders = null) {
  const { totalPossibleScore } = calculateRegularQuestionStats(questions);
  let score = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  const answerLog = [];
  const items = [];

  questions.forEach((question, index) => {
    const selection = selectionFor(selections, question);
    const hasAnswer = answerStatus(question, selection) !== 'none';
    let isCorrect = false;
    let pointsAwarded = 0;
    if (hasAnswer) {
      const result = checkAnswer(question, selection, false, text);
      isCorrect = result.isCorrect;
      pointsAwarded = result.pointsAwarded;
      answerLog.push({ questionId: question.id, isCorrect, points: pointsAwarded });
    }

    if (!question.isBonus) {
      score += pointsAwarded;
      if (!hasAnswer) unansweredCount += 1;
      else if (isCorrect) correctCount += 1;
      else incorrectCount += 1;
    }

    const response = { answer: selection, hasAnswer, isCorrect };
    const optionOrder = optionOrders ? optionOrders[String(question.id)] : undefined;
    if (question.type === 'mcq' && Array.isArray(optionOrder)) response.optionOrder = optionOrder;
    items.push({ question, number: index + 1, response, points: pointsAwarded });
  });

  return { score, totalPossibleScore, correctCount, incorrectCount, unansweredCount, answerLog, items };
}

// 'wrong': only the questions not answered correctly (unanswered included); 'all': every question.
export function filterReviewItems(items, filter) {
  return filter === 'all' ? items : items.filter((item) => !item.response.isCorrect);
}

// Score per skill (see calculateSkillBreakdown), with the seconds spent on that
// skill's questions when per-question times (ms by question id) are known.
export function calculateSkillResults(skills, questions, answerLog, timeSpent) {
  const rows = calculateSkillBreakdown(skills, questions, answerLog);
  const hasTimes = timeSpent && Object.keys(timeSpent).length > 0;
  return rows.map((row) => {
    if (!hasTimes) return { ...row, seconds: null };
    const ms = questions
      .filter((question) => !question.isBonus && question.skill === row.id)
      .reduce((sum, question) => sum + (Number(timeSpent[String(question.id)]) || 0), 0);
    return { ...row, seconds: Math.round(ms / 1000) };
  });
}

export function skillScoreText(row, text = DEFAULT_UI_TEXT) {
  const values = { correct: row.correct, total: row.total };
  if (row.seconds === null || row.seconds === undefined) {
    return fillText(text.skillScore, values);
  }
  return fillText(text.skillScoreWithTime, { ...values, time: formatMinutesSeconds(row.seconds) });
}

// What the server stores for a submission: the score, the score per skill and,
// per question id, the answer given, whether it was right, the points and the
// seconds spent on it. `questions` are the quiz's validated questions.
export function summarizeSubmission(meta, questions, selections, timeSpent = {}, optionOrders = {}) {
  const graded = gradeSelections(questions, selections, meta.uiText ?? DEFAULT_UI_TEXT, optionOrders);
  const skills = calculateSkillResults(meta.skills, questions, graded.answerLog, timeSpent).map((row) => ({
    id: row.id,
    label: row.label,
    points: row.correct,
    outOf: row.total,
    seconds: row.seconds,
  }));

  const answers = {};
  for (const item of graded.items) {
    const id = String(item.question.id);
    const ms = Number(timeSpent?.[id]);
    const entry = {
      selection: item.response.hasAnswer ? item.response.answer : null,
      isCorrect: item.response.isCorrect,
      points: item.points,
      seconds: Number.isFinite(ms) ? Math.round(ms / 1000) : null,
    };
    if (item.response.optionOrder) entry.optionOrder = item.response.optionOrder;
    answers[id] = entry;
  }

  return { score: graded.score, total: graded.totalPossibleScore, skills, answers };
}
