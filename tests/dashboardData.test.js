// The numbers behind the facilitators' dashboard (app/dashboardData.js).
import { describe, expect, it } from 'vitest';

import {
  cohortGroups, cohortSlot, headline, latestSubmissions, median, niceScale, questionHealth, scorePercent,
  scoreHistogram, skillAverages, skillOrder, skillsByCohort, timeBuckets,
} from '../app/dashboardData.js';
import { hasStatFlag } from '../app/statsFormat.js';

// Local dates, so the tests pass in any time zone.
const at = (year, month, day, hour = 12) => new Date(year, month - 1, day, hour).toISOString();

function submission(overrides = {}) {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    name: 'Asha',
    submittedAt: at(2026, 11, 20),
    score: 20,
    total: 40,
    timeTakenSeconds: 600,
    cohortId: null,
    cohortLabel: null,
    cohortCode: null,
    skills: [],
    ...overrides,
  };
}

describe('median', () => {
  it('takes the middle value, or the mean of the two middle ones', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
    expect(median([NaN, 7])).toBe(7);
  });
});

describe('headline numbers', () => {
  const now = new Date(2026, 10, 25, 12);
  const list = [
    submission({ score: 30, timeTakenSeconds: 300, submittedAt: at(2026, 11, 25, 9), cohortId: 'c1', cohortLabel: 'A' }),
    submission({ score: 20, timeTakenSeconds: 900, submittedAt: at(2026, 11, 19), cohortId: 'c1', cohortLabel: 'A' }),
    submission({ score: 10, timeTakenSeconds: 600, submittedAt: at(2026, 11, 18, 11), cohortId: 'c2', cohortLabel: 'B' }),
    submission({ score: 40, timeTakenSeconds: 0, submittedAt: at(2026, 10, 1) }),
  ];

  it('counts submissions, averages, the median time, cohorts and the last 7 days', () => {
    const numbers = headline(list, { now });
    expect(numbers.count).toBe(4);
    expect(numbers.averagePercent).toBe(62.5);
    expect(numbers.averageScore).toBe(25);
    expect(numbers.total).toBe(40);
    expect(numbers.medianSeconds).toBe(600); // a time of 0 (unknown) is left out
    expect(numbers.cohortCount).toBe(2);
    expect(numbers.withoutCohort).toBe(1);
    // 18 Nov 11:00 is more than 7 days before 25 Nov 12:00; 19 Nov is within.
    expect(numbers.lastSevenDays).toBe(2);
  });

  it('uses the injected clock for "last 7 days"', () => {
    expect(headline(list, { now: new Date(2026, 11, 31) }).lastSevenDays).toBe(0);
    expect(headline(list, { now: new Date(2026, 9, 5) }).lastSevenDays).toBe(1);
  });

  it('does not count a missing score as 0', () => {
    const list = [submission({ score: 30 }), submission({ score: null })];
    expect(scorePercent(list[1])).toBeNull();
    expect(headline(list, { now })).toMatchObject({ averagePercent: 75, averageScore: 30 });
    expect(cohortGroups(list)[0]).toMatchObject({ n: 2, averagePercent: 75, averageScore: 30 });
    expect(scoreHistogram(list).counted).toBe(1);
  });

  it('copes with no submissions', () => {
    expect(headline([], { now })).toMatchObject({ count: 0, averagePercent: null, medianSeconds: null, cohortCount: 0, lastSevenDays: 0 });
  });
});

describe('submissions over time', () => {
  it('counts per day over a short range, with empty days as 0', () => {
    const list = [submission({ submittedAt: at(2026, 11, 20, 1) }), submission({ submittedAt: at(2026, 11, 20, 23) }), submission({ submittedAt: at(2026, 11, 22) })];
    const { unit, buckets } = timeBuckets(list, { now: new Date(2026, 10, 23, 8) });
    expect(unit).toBe('day');
    expect(buckets.map((bucket) => bucket.count)).toEqual([2, 0, 1, 0]);
    expect(buckets[0].label).toBe('20 Nov 2026');
    expect(buckets[0].shortLabel).toBe('20 Nov');
  });

  it('stops at today when "To" is in the future', () => {
    const list = [submission({ submittedAt: at(2026, 11, 20) })];
    const { buckets } = timeBuckets(list, { from: '2026-11-19', to: '2026-12-31', now: new Date(2026, 10, 22, 9) });
    expect(buckets.map((bucket) => bucket.shortLabel)).toEqual(['19 Nov', '20 Nov', '21 Nov', '22 Nov']);
  });

  it('marks the week or month still running as "so far"', () => {
    const list = [submission({ submittedAt: at(2026, 9, 30) }), submission({ submittedAt: at(2026, 11, 24) })];
    const weeks = timeBuckets(list, { now: new Date(2026, 10, 25, 9) }).buckets; // Wednesday 25 Nov
    expect(weeks.at(-1)).toMatchObject({ label: 'Week of 23 Nov 2026 (so far)', partial: true });
    expect(weeks.filter((bucket) => bucket.partial)).toHaveLength(1);
    const days = timeBuckets([submission({ submittedAt: at(2026, 11, 24) })], { now: new Date(2026, 10, 25, 9) }).buckets;
    expect(days.some((bucket) => bucket.partial)).toBe(false);
    const months = timeBuckets([submission({ submittedAt: at(2024, 1, 10) })], { now: new Date(2026, 10, 25) }).buckets;
    expect(months.at(-1).label).toBe('Nov 2026 (so far)');
  });

  it('uses the date filter as the range when set', () => {
    const list = [submission({ submittedAt: at(2026, 11, 20) })];
    const { buckets } = timeBuckets(list, { from: '2026-11-18', to: '2026-11-21', now: new Date(2026, 10, 30) });
    expect(buckets.map((bucket) => bucket.count)).toEqual([0, 0, 1, 0]);
  });

  it('switches to weeks starting on Monday over a long range', () => {
    // 2 Nov 2026 is a Monday.
    const list = [submission({ submittedAt: at(2026, 9, 30) }), submission({ submittedAt: at(2026, 11, 2) }), submission({ submittedAt: at(2026, 11, 8) }), submission({ submittedAt: at(2026, 11, 9) })];
    const { unit, buckets } = timeBuckets(list, { now: new Date(2026, 10, 10) });
    expect(unit).toBe('week');
    expect(buckets[0].start.getDay()).toBe(1);
    expect(buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(4);
    const week = buckets.find((bucket) => bucket.start.getDate() === 2 && bucket.start.getMonth() === 10);
    expect(week.count).toBe(2); // Monday 2 and Sunday 8 Nov
    expect(week.label).toBe('Week of 2 Nov 2026');
    expect(buckets.at(-1).count).toBe(1);
  });

  it('uses months past the week limit', () => {
    const list = [submission({ submittedAt: at(2024, 1, 10) }), submission({ submittedAt: at(2026, 11, 2) })];
    const { unit, buckets } = timeBuckets(list, { now: new Date(2026, 10, 10) });
    expect(unit).toBe('month');
    expect(buckets[0].label).toBe('Jan 2024');
    expect(buckets.at(-1).label).toBe('Nov 2026 (so far)'); // 10 Nov: the month is still running
  });

  it('returns no buckets without submissions', () => {
    expect(timeBuckets([], {}).buckets).toEqual([]);
  });
});

describe('score distribution', () => {
  it('puts scores in 10-point bins, 100% in the last, with the average', () => {
    const list = [0, 9.9, 10, 55, 100, 100].map((percent) => submission({ score: percent, total: 100 }));
    const { bins, average, counted } = scoreHistogram(list);
    expect(bins).toHaveLength(10);
    expect(bins.map((bin) => bin.count)).toEqual([2, 1, 0, 0, 0, 1, 0, 0, 0, 2]);
    expect(bins[9].label).toBe('90–100%');
    expect(counted).toBe(6);
    expect(average).toBe(45.8);
  });

  it('leaves out a submission without a total', () => {
    expect(scoreHistogram([submission({ total: 0 })]).counted).toBe(0);
  });
});

describe('skills', () => {
  const quizSkills = [{ id: 'b', label: 'Bible' }, { id: 'a', label: 'Analysis' }];
  const list = [
    submission({ cohortId: 'c1', cohortLabel: 'One', skills: [{ id: 'a', label: 'Analysis', points: 3, outOf: 4 }, { id: 'b', label: 'Bible', points: 1, outOf: 4 }, { id: 'x', label: 'Extra', points: 1, outOf: 1 }] }),
    submission({ cohortId: 'c1', cohortLabel: 'One', skills: [{ id: 'a', label: 'Analysis', points: 1, outOf: 4 }, { id: 'b', label: 'Bible', points: 4, outOf: 4 }] }),
    submission({ skills: [{ id: 'a', label: 'Analysis', points: 4, outOf: 4 }, { id: 'b', label: 'Bible', points: 0, outOf: 4 }] }),
  ];

  it('keeps the quiz order, then any other skills', () => {
    expect(skillOrder(list, quizSkills).map((skill) => skill.id)).toEqual(['b', 'a', 'x']);
  });

  it('averages points as a % of the points available', () => {
    const averages = skillAverages(list, quizSkills);
    expect(averages.map((skill) => [skill.id, skill.percent, skill.n])).toEqual([['b', 41.7, 3], ['a', 66.7, 3], ['x', 100, 1]]);
  });

  it('gives each of the largest cohorts a series and folds the rest into Other', () => {
    const many = [
      ...Array.from({ length: 4 }, () => submission({ cohortId: 'big', cohortLabel: 'Big', skills: [{ id: 'a', points: 4, outOf: 4 }] })),
      ...Array.from({ length: 3 }, () => submission({ cohortId: 'mid', cohortLabel: 'Mid', skills: [{ id: 'a', points: 2, outOf: 4 }] })),
      ...Array.from({ length: 2 }, () => submission({ skills: [{ id: 'a', points: 0, outOf: 4 }] })),
      submission({ cohortId: 'tiny1', cohortLabel: 'Tiny 1', skills: [{ id: 'a', points: 1, outOf: 4 }] }),
      submission({ cohortId: 'tiny2', cohortLabel: 'Tiny 2', skills: [{ id: 'a', points: 3, outOf: 4 }] }),
    ];
    const data = skillsByCohort(many, [{ id: 'a', label: 'Analysis' }], { cohortOrder: ['id:big', 'id:mid', 'id:tiny1', 'id:tiny2'] });
    expect(data.series.map((series) => [series.label, series.n, series.slot])).toEqual([
      ['Big', 4, 1], ['Mid', 3, 2], ['No cohort', 2, 3], ['Other cohorts (2)', 2, null],
    ]);
    expect(data.series.map((series) => series.values[0].percent)).toEqual([100, 50, 0, 50]);
    expect(data.overall[0].percent).toBe(59.1);
  });

  it('names a single folded cohort', () => {
    const list4 = ['A', 'B', 'C', 'D'].map((label) => submission({ cohortId: label, cohortLabel: label }));
    expect(skillsByCohort(list4, [], { cohortOrder: ['id:A', 'id:B', 'id:C', 'id:D'] }).series.at(-1).label).toBe('Other: D');
  });

  it('keeps each cohort\'s colour when the mix in view changes', () => {
    const cohortOrder = ['id:a', 'id:b', 'id:c', 'id:d'];
    const of = (label, n) => Array.from({ length: n }, () => submission({ cohortId: label, cohortLabel: label.toUpperCase(), skills: [{ id: 's', points: 1, outOf: 2 }] }));
    const slots = (list) => Object.fromEntries(skillsByCohort(list, [], { cohortOrder }).series.map((series) => [series.label, series.slot]));
    // b is the largest in one view and the smallest in another: same colour both times.
    const first = slots([...of('a', 2), ...of('b', 6), ...of('c', 4)]);
    const second = slots([...of('a', 9), ...of('b', 1), ...of('c', 4), ...Array.from({ length: 5 }, () => submission({ skills: [{ id: 's', points: 1, outOf: 2 }] }))]);
    expect(first).toEqual({ A: 1, B: 2, C: 3 });
    expect(second.B).toBe(first.B);
    expect(second.A).toBe(first.A);
    // "No cohort" has its fixed slot 3 and is larger than C (also slot 3), so C is counted in "Other" here.
    expect(second).toEqual({ A: 1, 'No cohort': 3, B: 2, 'Other: C': null });
    // d shares a's slot: with a in view, the larger of the two keeps the colour.
    expect(slots([...of('a', 1), ...of('d', 5)])).toEqual({ D: 1, 'Other: A': null });
    expect(cohortSlot('id:d', cohortOrder)).toBe(cohortSlot('id:a', cohortOrder));
    expect([1, 2, 3]).toContain(cohortSlot('id:gone', cohortOrder)); // a cohort missing from the list still gets a slot
  });
});

describe('cohort comparison', () => {
  it('gives n and the average per cohort, "No cohort" included, highest first, with small groups marked', () => {
    const list = [
      ...Array.from({ length: 5 }, () => submission({ cohortId: 'c1', cohortLabel: 'Pune', score: 20 })),
      submission({ cohortId: 'c2', cohortLabel: 'Delhi', score: 36 }),
      submission({ score: 30, cohortCode: 'ZZZ999' }), // a code that was not valid: no cohort
    ];
    const groups = cohortGroups(list);
    expect(groups.map((group) => [group.label, group.n, group.averagePercent, group.small])).toEqual([
      ['Delhi', 1, 90, true], ['No cohort', 1, 75, true], ['Pune', 5, 50, false],
    ]);
  });

  it('names a cohort without a label "Deleted cohort", never by its id', () => {
    const [group] = cohortGroups([submission({ cohortId: '7f3c-uuid', cohortLabel: null })]);
    expect(group.label).toBe('Deleted cohort');
  });
});

describe('question health', () => {
  const stats = {
    submissions: 12,
    excluded: 3,
    enoughData: true,
    questions: [
      { id: 1, percentCorrect: 95, discrimination: 0.1 },
      { id: 2, percentCorrect: 15, discrimination: 0.5 },
      { id: 3, percentCorrect: 60, discrimination: 0.4, statements: [{ percentCorrect: 92, discrimination: 0.3 }] },
      { id: 4, percentCorrect: 50, discrimination: null },
    ],
  };

  it('counts questions with each flag, a statement flag counting for its question', () => {
    expect(hasStatFlag(stats.questions[2], 'very-easy')).toBe(true);
    expect(questionHealth(stats)).toEqual({
      available: true, submissions: 12, excluded: 3, enoughData: true, questionCount: 4,
      counts: { 'very-easy': 2, 'very-hard': 1, 'no-separation': 1 },
    });
  });

  it('says when there are no statistics', () => {
    expect(questionHealth(null)).toMatchObject({ available: false, reason: 'missing' });
    expect(questionHealth({ submissions: 0, excluded: 2, questions: [] })).toMatchObject({ available: false, reason: 'no-submissions' });
  });
});

describe('latest submissions and axes', () => {
  it('takes the newest five', () => {
    const list = Array.from({ length: 8 }, (_, index) => submission({ id: `s${index}`, submittedAt: at(2026, 11, index + 1) }));
    expect(latestSubmissions(list).map((item) => item.id)).toEqual(['s7', 's6', 's5', 's4', 's3']);
  });

  it('rounds a count axis to clean steps', () => {
    expect(niceScale(3)).toEqual({ max: 3, step: 1 });
    expect(niceScale(17)).toEqual({ max: 20, step: 5 });
    expect(niceScale(0)).toEqual({ max: 1, step: 1 });
    expect(niceScale(1234)).toEqual({ max: 1500, step: 500 });
  });

  it('shapes 2000 submissions quickly', () => {
    const list = Array.from({ length: 2000 }, (_, index) => submission({
      submittedAt: at(2026, 1 + (index % 11), 1 + (index % 28)),
      score: index % 41,
      cohortId: `c${index % 7}`,
      cohortLabel: `Cohort ${index % 7}`,
      skills: [{ id: 'a', points: index % 5, outOf: 4 }, { id: 'b', points: 1, outOf: 2 }],
    }));
    const started = performance.now();
    headline(list);
    timeBuckets(list, { now: new Date(2026, 11, 1) });
    scoreHistogram(list);
    skillsByCohort(list, []);
    cohortGroups(list);
    expect(performance.now() - started).toBeLessThan(500);
  });
});
