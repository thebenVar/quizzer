// Question statistics on the facilitators' page: the thresholds behind the
// plain-language flags, the flags themselves and the CSV export. No DOM; the
// numbers come from GET /api/stats (computed in api/_lib/stats.js).
import { csvField } from './resultsCsv.js';

export const STATS_THRESHOLDS = Object.freeze({
  veryEasyPercent: 90, // "Very easy": at least this % answered correctly
  veryHardPercent: 20, // "Very hard": at most this %
  lowDiscrimination: 0.2, // "Doesn't separate": discrimination below this
  minSubmissionsForDiscrimination: 10, // fewer submissions: "not enough data"
  groupFraction: 0.27, // top and bottom groups: this share of submissions by total score
});

// Plain-language flags for one question (or statement) of the statistics.
export function statFlags(item, thresholds = STATS_THRESHOLDS) {
  const flags = [];
  if (item.percentCorrect !== null && item.percentCorrect !== undefined) {
    if (item.percentCorrect >= thresholds.veryEasyPercent) flags.push({ id: 'very-easy', label: `Very easy (≥${thresholds.veryEasyPercent}%)` });
    if (item.percentCorrect <= thresholds.veryHardPercent) flags.push({ id: 'very-hard', label: `Very hard (≤${thresholds.veryHardPercent}%)` });
  }
  if (item.discrimination !== null && item.discrimination !== undefined && item.discrimination < thresholds.lowDiscrimination) {
    flags.push({ id: 'no-separation', label: `Doesn't separate (discrimination < ${thresholds.lowDiscrimination})` });
  }
  return flags;
}

// Whether a question has a flag ('very-easy', 'very-hard' or 'no-separation'),
// itself or in any of its statements.
export function hasStatFlag(item, flagId, thresholds = STATS_THRESHOLDS) {
  const has = (entry) => statFlags(entry, thresholds).some((flag) => flag.id === flagId);
  return has(item) || (item.statements || []).some(has);
}

export const STAT_FLAG_NAMES = Object.freeze({
  'very-easy': 'Very easy',
  'very-hard': 'Very hard',
  'no-separation': "Doesn't separate",
});

// The first line of a prompt, cut to `max` characters.
export function shortPrompt(prompt, max = 90) {
  const line = String(prompt ?? '').split('\n').find((part) => part.trim() !== '') ?? '';
  const chars = Array.from(line.trim());
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : chars.join('');
}

function formatNumber(value, digits = 1) {
  return value === null || value === undefined ? '' : Number(value).toFixed(digits);
}

// One row per question, and one per statement of a statements question.
export function buildStatsCsv(stats) {
  const head = ['Number', 'Question id', 'Statement', 'Type', 'Skill', 'Prompt', 'Answered', 'Correct %', 'Discrimination', 'Average seconds', 'Most common wrong answer', 'Flags'];
  const rows = [];
  for (const item of stats.questions) {
    const wrong = item.mostCommonWrong
      ? `${item.mostCommonWrong.answer} (${item.mostCommonWrong.count})`
      : '';
    rows.push([
      item.number, item.id, '', item.type, item.skillLabel ?? item.skill ?? '', shortPrompt(item.prompt, 200),
      item.answered, formatNumber(item.percentCorrect), formatNumber(item.discrimination, 2), formatNumber(item.averageSeconds, 0),
      wrong, statFlags(item).map((flag) => flag.label).join('; '),
    ]);
    for (const statement of item.statements ?? []) {
      rows.push([
        item.number, item.id, statement.index + 1, 'statement', item.skillLabel ?? item.skill ?? '', shortPrompt(statement.text, 200),
        statement.answered, formatNumber(statement.percentCorrect), formatNumber(statement.discrimination, 2), '',
        '', statFlags(statement).map((flag) => flag.label).join('; '),
      ]);
    }
  }
  return `﻿${[head, ...rows].map((row) => row.map(csvField).join(',')).join('\r\n')}\r\n`;
}
