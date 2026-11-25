// The CSV export of the facilitators' results page (results.html): one row per
// submission, one column per skill. UTF-8 with a byte order mark and CRLF line
// ends, so Excel opens names in Indian scripts correctly.

// Quotes a field when needed. A value starting with = + - @ (or a tab / carriage
// return) is prefixed with ' so a spreadsheet never runs it as a formula; names are typed by participants.
export function csvField(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  // A plain number such as "-0.20" cannot run as a formula, so it stays a number.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) || text !== text.trim() ? `"${text.replace(/"/g, '""')}"` : text;
}

function pad(number) {
  return String(number).padStart(2, '0');
}

// "2026-11-25 14:05" in the facilitator's own time zone.
export function formatDateTime(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(total / 60)}:${pad(total % 60)}`;
}

// The skills of a set of submissions, in the order they first appear: [{ id, label, outOf }].
export function skillColumns(submissions) {
  const columns = new Map();
  for (const submission of submissions) {
    for (const skill of submission.skills || []) {
      if (!columns.has(skill.id)) columns.set(skill.id, { id: skill.id, label: skill.label, outOf: skill.outOf });
    }
  }
  return [...columns.values()];
}

// The cohort as shown to facilitators: its name, or the code typed with
// "(not valid)" when it was not an active code for the quiz, or ''.
export function cohortText(submission) {
  if (submission.cohortLabel) return submission.cohortLabel;
  if (submission.cohortCode) return `${submission.cohortCode} (not valid)`;
  return '';
}

export function buildResultsCsv(submissions) {
  const skills = skillColumns(submissions);
  const head = ['Name', 'Submitted', 'Cohort', 'Cohort code', 'Score', 'Out of', ...skills.map((skill) => `${skill.label} (/${skill.outOf})`), 'Time taken (min:sec)', 'Quiz', 'Submission id'];
  const rows = submissions.map((submission) => {
    const bySkill = new Map((submission.skills || []).map((skill) => [skill.id, skill]));
    return [
      submission.name,
      formatDateTime(submission.submittedAt),
      submission.cohortLabel || '',
      submission.cohortCode || '',
      submission.score,
      submission.total,
      ...skills.map((skill) => (bySkill.has(skill.id) ? bySkill.get(skill.id).points : '')),
      formatDuration(submission.timeTakenSeconds),
      submission.quizId,
      submission.id,
    ];
  });
  return `﻿${[head, ...rows].map((row) => row.map(csvField).join(',')).join('\r\n')}\r\n`;
}
