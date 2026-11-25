// Results at the end: grading stored answers, time per skill, the review of a
// participant's answers, and the downloadable results file.
import { checkMCQAnswer, checkMatchingAnswer } from './runtime.js';
import { calculateRegularQuestionStats, calculateSkillBreakdown, fillText, formatMinutesSeconds } from './utils.js';
import { DEFAULT_UI_TEXT } from './validate.js';
import { renderQuestionCard } from './answerKey.js';

// Answers are stored by question id; ids may be numbers, so keys are strings.
export function selectionFor(selections, question) {
  return selections ? selections[String(question.id)] : undefined;
}

// 'none', 'partial' (a matching question with some pairs chosen) or 'complete'.
export function answerStatus(question, selection) {
  if (question.type === 'matching') {
    if (!selection || typeof selection !== 'object') return 'none';
    const chosen = question.pairs.filter(([left]) => typeof selection[left] === 'string' && selection[left] !== '').length;
    if (chosen === 0) return 'none';
    return chosen === question.pairs.length ? 'complete' : 'partial';
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
      const result = question.type === 'matching'
        ? checkMatchingAnswer(question, selection, false, text)
        : checkMCQAnswer(question, selection, false, text);
      isCorrect = result.isCorrect;
      pointsAwarded = result.pointsAwarded;
      answerLog.push({ questionId: question.id, isCorrect });
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
    items.push({ question, number: index + 1, response });
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

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pad(number) {
  return String(number).padStart(2, '0');
}

export function formatDateYMD(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Letters and digits of any script; everything else becomes "-".
export function sanitizeFileNamePart(value, fallback = 'participant') {
  const cleaned = String(value ?? '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
    .toLowerCase();
  return cleaned || fallback;
}

export function resultsFileName(quizId, name, date) {
  return `${sanitizeFileNamePart(quizId, 'quiz')}-results-${sanitizeFileNamePart(name)}-${formatDateYMD(date)}.html`;
}

function formatDisplayDate(date) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(date);
  } catch {
    return date.toISOString();
  }
}

// Styles for the results file: the same colours and cards as the app and the
// answer key page, inline so the file opens offline.
const RESULTS_FILE_CSS = `
*{box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f0f4f8;color:#343a40;margin:0;padding:20px}
.page{max-width:880px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.08);padding:32px 36px 40px}
h1{color:#2c3e50;font-size:1.7em;margin:0 0 4px;text-align:center}
.badge{display:block;width:max-content;margin:0 auto 18px;background:#e7f0fe;color:#0a58ca;font-size:.75em;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 12px;border-radius:999px}
.facts{display:grid;grid-template-columns:max-content 1fr;gap:6px 16px;margin:0 0 20px;padding:16px 20px;border:1px solid #bcd0f7;border-radius:12px;background:#e7f0fe}
.facts dt{font-weight:600;color:#0a58ca}.facts dd{margin:0}
h2{font-size:1.3em;color:#2c3e50;margin:28px 0 10px;padding-bottom:8px;border-bottom:2px solid #e7f0fe}
table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #e9ecef}th{color:#6c757d;font-weight:600;font-size:.9em}
td.num,th.num{text-align:right;white-space:nowrap}
.ak-card{border:1px solid #e9ecef;border-radius:14px;padding:20px 22px;margin:16px 0;background:#fff;break-inside:avoid}
.ak-card-wrong{border-left:4px solid #dc3545}.ak-card-right{border-left:4px solid #198754}
.ak-card-head{display:flex;gap:14px;align-items:flex-start}
.ak-number{flex-shrink:0;width:32px;height:32px;border-radius:50%;background:#2c3e50;color:#fff;font-weight:700;font-size:.9em;display:flex;align-items:center;justify-content:center}
.ak-prompt{margin:4px 0 0;white-space:pre-line;line-height:1.6;color:#2c3e50;font-weight:500}
.ak-bonus{background:#fff3cd;color:#664d03;border-radius:6px;padding:1px 8px;font-size:.8em;font-weight:700}
.ak-options,.ak-matches,.ak-note,.ak-not-answered{margin-left:46px}
.ak-options{list-style:none;padding:0;margin-top:14px;margin-bottom:0;display:grid;gap:6px}
.ak-option{display:flex;flex-wrap:wrap;align-items:flex-start;gap:10px;padding:8px 12px;border-radius:10px;border:1px solid transparent;color:#6c757d;line-height:1.45}
.ak-option-letter{flex-shrink:0;width:24px;height:24px;border-radius:50%;border:1px solid #ced4da;font-size:.78em;font-weight:600;display:flex;align-items:center;justify-content:center}
.ak-option-text{flex:1;min-width:0;padding-top:2px}
.ak-option-correct{background:#e9f7ef;border-color:#a7dcbc;color:#14532d;font-weight:600}
.ak-option-correct .ak-option-letter{background:#198754;border-color:#198754;color:#fff}
.ak-option-wrong{background:#fdecee;border-color:#f1aeb5;color:#842029;font-weight:600}
.ak-option-wrong .ak-option-letter{background:#dc3545;border-color:#dc3545;color:#fff}
.ak-option-tag{margin-left:auto;padding-top:3px;padding-left:10px;white-space:nowrap;color:#198754;font-size:.75em;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.ak-option-wrong .ak-option-tag{color:#dc3545}
.ak-not-answered{margin-top:12px;margin-bottom:0;color:#842029;font-weight:600;font-size:.9em}
.ak-matches{margin-top:14px}
.ak-matches-heading{margin:10px 0 6px;color:#198754;font-size:.75em;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.ak-matches-heading-yours{color:#495057}
.ak-match-list{list-style:none;padding:0;margin:0;display:grid;gap:6px}
.ak-match{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:10px;align-items:center;padding:8px 12px;border-radius:10px;background:#e9f7ef;color:#14532d}
.ak-match-yours{grid-template-columns:minmax(0,1fr) auto minmax(0,1fr) 1em}
.ak-match-wrong{background:#fdecee;color:#842029}
.ak-match-left{font-weight:600}.ak-match-arrow{color:#198754}.ak-cross{color:#dc3545;font-weight:700}
.ak-note{margin-top:12px;padding:10px 14px;border-radius:10px;border-left:3px solid}
.ak-note-why{background:#f8f9fa;border-left-color:#198754}.ak-note-approach{background:#eef4ff;border-left-color:#0d6efd}
.ak-note-label{margin:0 0 3px;font-size:.72em;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#495057}
.ak-note-approach .ak-note-label{color:#0a58ca}
.ak-note-body{margin:0;line-height:1.6;color:#343a40;font-size:.95em}
@media (max-width:560px){body{padding:10px}.page{padding:22px 16px 28px}.ak-card{padding:16px}.ak-options,.ak-matches,.ak-note,.ak-not-answered{margin-left:0}.ak-option-tag{flex-basis:100%;margin-left:34px;padding:0}.facts{grid-template-columns:1fr;gap:2px}.facts dd{margin-bottom:8px}.ak-match,.ak-match-yours{grid-template-columns:1fr;gap:2px}.ak-match-arrow{display:none}.ak-match-yours{position:relative;padding-right:32px}.ak-match-yours .ak-cross{position:absolute;top:8px;right:12px}}
@media print{body{background:#fff;padding:0}.page{box-shadow:none;max-width:none;padding:0}h2{break-after:avoid}}
`;

// A complete, self-contained HTML page with a participant's results.
// Question cards are built with the answer key renderer (text nodes, so their
// content is escaped when serialised); every other value is escaped here.
// `review` is false when the quiz hides its answers (meta.showAnswerReview).
export function buildResultsHtml({
  meta,
  name,
  date,
  durationSeconds,
  score,
  totalPossibleScore,
  skillRows = [],
  items = [],
  review = true,
  doc = globalThis.document,
}) {
  const text = meta.uiText;
  const lang = doc && doc.documentElement && doc.documentElement.lang ? doc.documentElement.lang : 'en';
  const hasTimes = skillRows.some((row) => row.seconds !== null && row.seconds !== undefined);

  const facts = [
    [text.resultsFileNameLabel, name],
    [text.resultsFileDateLabel, formatDisplayDate(date)],
    [text.resultsFileTimeTakenLabel, formatMinutesSeconds(durationSeconds)],
    [text.resultsFileScoreLabel, `${score} / ${totalPossibleScore}`],
  ]
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join('');

  let skillsHtml = '';
  if (skillRows.length > 0) {
    const head = `<tr><th>${escapeHtml(text.resultsFileSkillColumn)}</th><th class="num">${escapeHtml(text.resultsFileScoreColumn)}</th>${
      hasTimes ? `<th class="num">${escapeHtml(text.resultsFileTimeColumn)}</th>` : ''
    }</tr>`;
    const rows = skillRows
      .map((row) => `<tr><td>${escapeHtml(row.label)}</td><td class="num">${escapeHtml(`${row.correct} / ${row.total}`)}</td>${
        hasTimes ? `<td class="num">${escapeHtml(formatMinutesSeconds(row.seconds ?? 0))}</td>` : ''
      }</tr>`)
      .join('');
    skillsHtml = `<h2>${escapeHtml(text.skillBreakdownHeading)}</h2><table><thead>${head}</thead><tbody>${rows}</tbody></table>`;
  }

  let reviewHtml = '';
  if (review && items.length > 0 && doc) {
    const cards = items.map((item) => renderQuestionCard(item.question, item.number, text, item.response).outerHTML).join('\n');
    reviewHtml = `<h2>${escapeHtml(text.resultsFileReviewHeading)}</h2>\n${cards}`;
  }

  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(`${meta.title} – ${text.resultsFileHeading} – ${name}`)}</title>
<style>${RESULTS_FILE_CSS}</style>
</head>
<body>
<main class="page">
<h1>${escapeHtml(meta.title)}</h1>
<span class="badge">${escapeHtml(text.resultsFileHeading)}</span>
<dl class="facts">${facts}</dl>
${skillsHtml}
${reviewHtml}
</main>
</body>
</html>
`;
}
