// The numbers behind the Dashboard tab of the facilitators' page: pure
// functions, no DOM. They shape the list from GET /api/results (one row per
// submission, without answers) and the statistics from GET /api/stats.
// Dates are bucketed in the facilitator's own time zone; "now" is passed in so
// tests can fix the clock.
import { STATS_THRESHOLDS, hasStatFlag } from './statsFormat.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const SMALL_COHORT = 5; // a cohort with fewer submissions gets a "small sample" note
export const MAX_COHORT_SERIES = 3; // cohorts drawn in their own colour; the rest fold into "Other"
export const NO_COHORT_LABEL = 'No cohort';
export const DELETED_COHORT_LABEL = 'Deleted cohort';
export const NO_COHORT_SLOT = 3; // "No cohort" always wears colour slot 3 when it has a colour

export function round(value, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function mean(values) {
  const numbers = values.filter((value) => Number.isFinite(value));
  return numbers.length === 0 ? null : numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

export function median(values) {
  const numbers = values.filter((value) => Number.isFinite(value)).sort((left, right) => left - right);
  if (numbers.length === 0) return null;
  const middle = Math.floor(numbers.length / 2);
  return numbers.length % 2 === 1 ? numbers[middle] : (numbers[middle - 1] + numbers[middle]) / 2;
}

// A number from the list, or NaN when it is missing (null must not count as 0).
function numberOrNaN(value) {
  return value === null || value === undefined || value === '' ? NaN : Number(value);
}

// The score, or NaN when there is none.
export function scoreValue(submission) {
  return numberOrNaN(submission.score);
}

// Score as a percentage of the total, or null when there is no score or total.
export function scorePercent(submission) {
  const score = scoreValue(submission);
  const total = numberOrNaN(submission.total);
  return Number.isFinite(score) && Number.isFinite(total) && total > 0 ? (score / total) * 100 : null;
}

function submittedDate(submission) {
  const date = new Date(submission.submittedAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

// The most common value (the first seen wins a tie).
function mode(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

// --- Cohorts ---

// The same grouping as the cohort filter: a cohort (by id), or "No cohort"
// (which includes results sent with a code that was not valid).
export function cohortKey(submission) {
  if (submission.cohortId) return `id:${submission.cohortId}`;
  if (submission.cohortLabel) return `label:${submission.cohortLabel}`;
  return 'none';
}

export function cohortName(submission) {
  if (cohortKey(submission) === 'none') return NO_COHORT_LABEL;
  return submission.cohortLabel ? String(submission.cohortLabel) : DELETED_COHORT_LABEL;
}

// --- Headline numbers ---

export function headline(submissions, { now = new Date() } = {}) {
  const count = submissions.length;
  const percents = submissions.map(scorePercent);
  const total = mode(submissions.map((submission) => Number(submission.total)).filter((value) => Number.isFinite(value)));
  const cohortKeys = new Set(submissions.map(cohortKey));
  const since = now.getTime() - 7 * DAY_MS;
  return {
    count,
    averagePercent: round(mean(percents)),
    averageScore: round(mean(submissions.map(scoreValue)), 1),
    total,
    medianSeconds: median(submissions.map((submission) => Number(submission.timeTakenSeconds)).filter((value) => value > 0)),
    cohortCount: [...cohortKeys].filter((key) => key !== 'none').length,
    withoutCohort: submissions.filter((submission) => cohortKey(submission) === 'none').length,
    lastSevenDays: submissions.filter((submission) => {
      const date = submittedDate(submission);
      return date !== null && date.getTime() > since && date.getTime() <= now.getTime();
    }).length,
  };
}

// --- Submissions over time ---

// A local calendar day as a whole number (days since 1970-01-01), immune to DST.
function dayNumber(date) {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

function dateOfDay(number) {
  const utc = new Date(number * DAY_MS);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
}

// "2026-11-25" (a date input's value) as a local date, or null.
export function parseYMD(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''));
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

function dayLabel(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function fullDayLabel(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// Counts per day, or per week (Monday to Sunday) when the range is longer than
// `maxDays`, or per month past `maxWeeks` weeks. The range is the date filter
// when set, else from the first submission to today (or the last submission).
// Empty days and weeks count 0, so gaps show.
export function timeBuckets(submissions, { from = '', to = '', now = new Date(), maxDays = 31, maxWeeks = 60 } = {}) {
  const dates = submissions.map(submittedDate).filter(Boolean);
  if (dates.length === 0) return { unit: 'day', buckets: [] };
  const days = dates.map(dayNumber);
  const first = Math.min(...days);
  const last = Math.max(...days);
  const fromDate = parseYMD(from);
  const toDate = parseYMD(to);
  const start = Math.min(fromDate ? dayNumber(fromDate) : first, first);
  const today = dayNumber(now);
  // Never past today (a "To" date in the future would only add empty days), nor before the last submission.
  let end = toDate ? Math.min(dayNumber(toDate), today) : today;
  end = Math.max(end, last);

  const span = end - start + 1;
  let unit = 'day';
  if (span > maxDays) unit = Math.ceil(span / 7) + 1 > maxWeeks ? 'month' : 'week';

  const buckets = [];
  let indexOf;
  if (unit === 'day') {
    for (let number = start; number <= end; number += 1) {
      const date = dateOfDay(number);
      buckets.push({ start: date, end: dateOfDay(number + 1), label: fullDayLabel(date), shortLabel: dayLabel(date), count: 0 });
    }
    indexOf = (number) => number - start;
  } else if (unit === 'week') {
    // 1970-01-01 was a Thursday; (n + 3) % 7 is 0 on Mondays.
    const monday = start - ((start + 3) % 7);
    for (let number = monday; number <= end; number += 7) {
      const date = dateOfDay(number);
      buckets.push({ start: date, end: dateOfDay(number + 7), label: `Week of ${fullDayLabel(date)}`, shortLabel: dayLabel(date), count: 0 });
    }
    indexOf = (number) => Math.floor((number - monday) / 7);
  } else {
    const startDate = dateOfDay(start);
    const endDate = dateOfDay(end);
    const firstMonth = startDate.getFullYear() * 12 + startDate.getMonth();
    const lastMonth = endDate.getFullYear() * 12 + endDate.getMonth();
    for (let month = firstMonth; month <= lastMonth; month += 1) {
      const date = new Date(Math.floor(month / 12), month % 12, 1);
      const label = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
      buckets.push({ start: date, end: new Date(date.getFullYear(), date.getMonth() + 1, 1), label, shortLabel: label, count: 0 });
    }
    indexOf = (number) => {
      const date = dateOfDay(number);
      return date.getFullYear() * 12 + date.getMonth() - firstMonth;
    };
  }
  for (const number of days) {
    const bucket = buckets[indexOf(number)];
    if (bucket) bucket.count += 1;
  }
  // The week or month still running today: its count can still grow.
  if (unit !== 'day') {
    for (const bucket of buckets) {
      if (dayNumber(bucket.start) <= today && today < dayNumber(bucket.end)) {
        bucket.partial = true;
        bucket.label = `${bucket.label} (so far)`;
      }
    }
  }
  return { unit, buckets };
}

// --- Score distribution ---

// Bins of `binSize` percentage points; 100% falls in the last bin.
export function scoreHistogram(submissions, { binSize = 10 } = {}) {
  const binCount = Math.ceil(100 / binSize);
  const bins = Array.from({ length: binCount }, (_, index) => {
    const from = index * binSize;
    const to = Math.min(100, from + binSize);
    return { from, to, label: `${from}–${to}%`, count: 0 };
  });
  const percents = submissions.map(scorePercent).filter((value) => value !== null);
  for (const percent of percents) {
    const index = Math.max(0, Math.min(binCount - 1, Math.floor(percent / binSize)));
    bins[index].count += 1;
  }
  return { bins, average: round(mean(percents)), counted: percents.length };
}

// --- Skills ---

// The skills in the quiz's order (meta.json), then any others in the order they appear.
export function skillOrder(submissions, quizSkills = []) {
  const order = new Map();
  for (const skill of quizSkills || []) order.set(skill.id, { id: skill.id, label: skill.label });
  for (const submission of submissions) {
    for (const skill of submission.skills || []) {
      if (!order.has(skill.id)) order.set(skill.id, { id: skill.id, label: skill.label ?? skill.id });
    }
  }
  return [...order.values()];
}

// % of the points available per skill: sum of points / sum of "out of".
function skillPercents(submissions, skills) {
  const sums = new Map(skills.map((skill) => [skill.id, { points: 0, outOf: 0, n: 0 }]));
  for (const submission of submissions) {
    for (const entry of submission.skills || []) {
      const sum = sums.get(entry.id);
      const points = Number(entry.points);
      const outOf = Number(entry.outOf);
      if (!sum || !Number.isFinite(points) || !Number.isFinite(outOf) || outOf <= 0) continue;
      sum.points += points;
      sum.outOf += outOf;
      sum.n += 1;
    }
  }
  return skills.map((skill) => {
    const sum = sums.get(skill.id);
    return { id: skill.id, label: skill.label, n: sum.n, percent: sum.outOf > 0 ? round((sum.points / sum.outOf) * 100) : null };
  });
}

export function skillAverages(submissions, quizSkills = []) {
  return skillPercents(submissions, skillOrder(submissions, quizSkills));
}

// Per cohort: n and the average score, ranked by average (highest first).
export function cohortGroups(submissions) {
  const groups = new Map();
  for (const submission of submissions) {
    const key = cohortKey(submission);
    if (!groups.has(key)) groups.set(key, { key, label: cohortName(submission), submissions: [] });
    groups.get(key).submissions.push(submission);
  }
  return [...groups.values()]
    .map((group) => ({
      key: group.key,
      label: group.label,
      n: group.submissions.length,
      averagePercent: round(mean(group.submissions.map(scorePercent))),
      averageScore: round(mean(group.submissions.map(scoreValue))),
      small: group.submissions.length < SMALL_COHORT,
      submissions: group.submissions,
    }))
    .sort((left, right) => (right.averagePercent ?? -1) - (left.averagePercent ?? -1) || right.n - left.n || left.label.localeCompare(right.label));
}

// A cohort's colour slot (1..slots), the same whatever is in view: "No cohort"
// has a fixed slot, and a cohort takes its place in `cohortOrder` (cohort keys
// in creation order, oldest first) round the slots. Cohorts missing from that
// list (for example deleted ones) get a place worked out from their key.
export function cohortSlot(key, cohortOrder = [], slots = MAX_COHORT_SERIES) {
  if (key === 'none') return NO_COHORT_SLOT;
  let index = cohortOrder.indexOf(key);
  if (index < 0) index = cohortOrder.length + [...key].reduce((sum, char) => sum + char.codePointAt(0), 0);
  return (index % slots) + 1;
}

// Per skill, the overall % and one value per cohort series. Colours follow the
// cohort, never its rank: each cohort has a fixed slot (cohortSlot). Going from
// the largest cohort in view (by n, then name), a cohort gets its own series if
// its slot is still free; the others fold into one gray "Other" series.
export function skillsByCohort(submissions, quizSkills = [], { maxSeries = MAX_COHORT_SERIES, cohortOrder = [] } = {}) {
  const skills = skillOrder(submissions, quizSkills);
  const overall = skillPercents(submissions, skills);
  const groups = cohortGroups(submissions).sort((left, right) => right.n - left.n || left.label.localeCompare(right.label));
  const used = new Set();
  const named = [];
  const rest = [];
  for (const group of groups) {
    const slot = cohortSlot(group.key, cohortOrder, maxSeries);
    if (used.has(slot)) {
      rest.push(group);
    } else {
      used.add(slot);
      named.push({ group, slot });
    }
  }
  const series = named.map(({ group, slot }) => ({ key: group.key, label: group.label, n: group.n, slot, values: skillPercents(group.submissions, skills) }));
  if (rest.length > 0) {
    const restSubmissions = rest.flatMap((group) => group.submissions);
    series.push({
      key: 'other',
      label: rest.length === 1 ? `Other: ${rest[0].label}` : `Other cohorts (${rest.length})`,
      n: restSubmissions.length,
      slot: null,
      values: skillPercents(restSubmissions, skills),
    });
  }
  return { skills, overall, series };
}

// --- Question health (from GET /api/stats) ---

export const HEALTH_FLAGS = Object.freeze(['very-easy', 'very-hard', 'no-separation']);

export function questionHealth(stats, thresholds = STATS_THRESHOLDS) {
  if (!stats) return { available: false, reason: 'missing' };
  if (!stats.submissions) return { available: false, reason: 'no-submissions', excluded: stats.excluded ?? 0 };
  const questions = stats.questions || [];
  const counts = Object.fromEntries(HEALTH_FLAGS.map((flag) => [flag, questions.filter((item) => hasStatFlag(item, flag, thresholds)).length]));
  return {
    available: true,
    submissions: stats.submissions,
    excluded: stats.excluded ?? 0,
    enoughData: Boolean(stats.enoughData),
    questionCount: questions.length,
    counts,
  };
}

// --- Latest submissions ---

export function latestSubmissions(submissions, count = 5) {
  return [...submissions]
    .sort((left, right) => String(right.submittedAt).localeCompare(String(left.submittedAt)))
    .slice(0, count);
}

// --- Axis helpers ---

// A rounded maximum and step for a count axis (0, step, 2·step, … max), at most `maxTicks` steps.
export function niceScale(maxValue, maxTicks = 4) {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return { max: 1, step: 1 };
  const raw = maxValue / maxTicks;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= raw));
  return { max: Math.ceil(maxValue / step) * step, step };
}
