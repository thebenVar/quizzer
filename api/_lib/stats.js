// Question statistics from stored submissions (GET /api/stats).
//
// Only submissions taken on the current version of the quiz count (their
// quiz_version equals the fingerprint of the deployed questions); the others
// are left out and counted in `excluded`, because a question may have changed
// since. Percentages are of all counted submissions: a question left
// unanswered counts as not correct.
//
// The database already keeps only the current version's rows (newest first, at
// most STATS_LIMIT) and counts the others; rows of another version passed in
// here are left out too. Average time is over the submissions that answered
// the question (an unanswered question has no meaningful time).
//
// Discrimination: the counted submissions are sorted by total score, highest
// first, ties broken by submission id (so the groups are the same on every
// request); the top and bottom groups are each 27% of them (at least one).
// Discrimination is (share correct in the top group) − (share correct in the
// bottom group), from −1 to 1. With fewer than 10 submissions it is null
// ("not enough data").
import { STATEMENT_ANSWERS } from '../../app/validate.js';
import { calculateRegularQuestionStats, normalizeTextAnswer, tokenizeSpotText } from '../../app/utils.js';
import { STATS_THRESHOLDS } from '../../app/statsFormat.js';

const TOP_WRONG = 5;

function round(value, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mean(values) {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function topCounts(counts, limit = TOP_WRONG) {
  return [...counts.entries()]
    .map(([key, value]) => ({ answer: key, ...value }))
    .sort((left, right) => right.count - left.count || String(left.answer).localeCompare(String(right.answer)))
    .slice(0, limit);
}

function bump(map, key, extra = {}) {
  const entry = map.get(key) ?? { count: 0, ...extra };
  entry.count += 1;
  map.set(key, entry);
}

function hasSelection(entry) {
  return Boolean(entry) && entry.selection !== null && entry.selection !== undefined;
}

// `alreadyExcluded`: rows of other versions the database counted but did not send.
export function computeStats(quiz, allRows, { alreadyExcluded = 0, thresholds = STATS_THRESHOLDS } = {}) {
  const rows = allRows.filter((row) => row.quizVersion === undefined || row.quizVersion === quiz.version);
  const excluded = alreadyExcluded + allRows.length - rows.length;
  const count = rows.length;

  const enoughData = count >= thresholds.minSubmissionsForDiscrimination;
  let top = [];
  let bottom = [];
  let groupSize = null;
  if (enoughData) {
    const sorted = [...rows].sort((left, right) => right.score - left.score || String(left.id ?? '').localeCompare(String(right.id ?? '')));
    groupSize = Math.max(1, Math.round(count * thresholds.groupFraction));
    top = sorted.slice(0, groupSize);
    bottom = sorted.slice(-groupSize);
  }
  const share = (group, isRight) => group.filter(isRight).length / group.length;
  const percent = (isRight) => (count === 0 ? null : round((rows.filter(isRight).length / count) * 100));
  const discrimination = (isRight) => (enoughData ? round(share(top, isRight) - share(bottom, isRight), 2) : null);

  const skillLabels = new Map(quiz.meta.skills.map((skill) => [skill.id, skill.label]));

  const questions = quiz.questions.map((question, index) => {
    const id = String(question.id);
    const entryOf = (row) => (row.answers ? row.answers[id] : undefined);
    const isRight = (row) => entryOf(row)?.isCorrect === true;
    const answeredRows = rows.filter((row) => hasSelection(entryOf(row)));
    const seconds = answeredRows.map((row) => entryOf(row).seconds).filter((value) => Number.isFinite(value));
    const points = rows.map((row) => Number(entryOf(row)?.points)).filter((value) => Number.isFinite(value));

    const item = {
      number: index + 1,
      id: question.id,
      type: question.type,
      skill: question.skill,
      skillLabel: question.skill ? skillLabels.get(question.skill) ?? question.skill : null,
      prompt: question.prompt,
      isBonus: question.isBonus,
      answered: answeredRows.length,
      percentCorrect: percent(isRight),
      discrimination: discrimination(isRight),
      averageSeconds: round(mean(seconds), 0),
      averagePoints: round(mean(points), 2),
      mostCommonWrong: null,
    };

    if (question.type === 'mcq') {
      const counts = new Map(question.options.map((option) => [option, 0]));
      for (const row of answeredRows) {
        const chosen = entryOf(row).selection;
        if (counts.has(chosen)) counts.set(chosen, counts.get(chosen) + 1);
      }
      item.options = question.options.map((option) => ({ option, count: counts.get(option), correct: option === question.answer }));
      const wrong = item.options.filter((option) => !option.correct && option.count > 0).sort((left, right) => right.count - left.count);
      item.mostCommonWrong = wrong.length > 0 ? { answer: wrong[0].option, count: wrong[0].count } : null;
    } else if (question.type === 'text') {
      const counts = new Map();
      for (const row of answeredRows) {
        if (entryOf(row).isCorrect) continue;
        const typed = normalizeTextAnswer(String(entryOf(row).selection));
        if (typed !== '') bump(counts, typed);
      }
      item.wrongAnswers = topCounts(counts);
      item.mostCommonWrong = item.wrongAnswers[0] ?? null;
    } else if (question.type === 'spot') {
      const tokens = tokenizeSpotText(question.text);
      const counts = new Map();
      for (const row of answeredRows) {
        const index = entryOf(row).selection;
        const token = Number.isInteger(index) ? tokens[index] : undefined;
        if (!token || token.word === question.answer) continue;
        bump(counts, `${token.word}#${index}`, { word: token.word, index });
      }
      item.wrongWords = topCounts(counts).map(({ word, index, count: n }) => ({ answer: word, index, count: n }));
      item.mostCommonWrong = item.wrongWords[0] ?? null;
    } else if (question.type === 'statements') {
      item.statements = question.statements.map((statement, statementIndex) => {
        const key = String(statementIndex);
        const choiceOf = (row) => {
          const selection = entryOf(row)?.selection;
          return selection && typeof selection === 'object' ? selection[key] : undefined;
        };
        const statementRight = (row) => choiceOf(row) === statement.answer;
        const distribution = Object.fromEntries(STATEMENT_ANSWERS.map((answer) => [answer, rows.filter((row) => choiceOf(row) === answer).length]));
        return {
          index: statementIndex,
          text: statement.text,
          answer: statement.answer,
          answered: rows.filter((row) => STATEMENT_ANSWERS.includes(choiceOf(row))).length,
          percentCorrect: percent(statementRight),
          discrimination: discrimination(statementRight),
          distribution,
        };
      });
    } else if (question.type === 'matching') {
      item.pairs = question.pairs.map(([left, right]) => ({
        left,
        right,
        percentCorrect: percent((row) => {
          const selection = entryOf(row)?.selection;
          return Boolean(selection) && typeof selection === 'object' && selection[left] === right;
        }),
      }));
    }
    return item;
  });

  const { totalPossibleScore } = calculateRegularQuestionStats(quiz.questions);
  const averageScore = round(mean(rows.map((row) => row.score)), 2);
  const skills = quiz.meta.skills.map((skill) => {
    const values = rows
      .map((row) => (row.skills || []).find((entry) => entry.id === skill.id))
      .filter(Boolean);
    return {
      id: skill.id,
      label: skill.label,
      outOf: values[0]?.outOf ?? null,
      averagePoints: round(mean(values.map((entry) => Number(entry.points))), 2),
    };
  });

  return {
    version: quiz.version,
    submissions: count,
    excluded,
    enoughData,
    groupSize,
    thresholds,
    overall: {
      averageScore,
      total: totalPossibleScore,
      averagePercent: averageScore === null || totalPossibleScore === 0 ? null : round((averageScore / totalPossibleScore) * 100),
      skills,
    },
    questions,
  };
}
