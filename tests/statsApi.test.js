// Question statistics: the numbers, discrimination, and the stats CSV.
import { describe, expect, it } from 'vitest';

import { computeStats } from '../api/_lib/stats.js';
import { createStatsHandler } from '../api/stats.js';
import { createMemoryDb } from '../api/_lib/memoryDb.js';
import { STATS_THRESHOLDS, buildStatsCsv, shortPrompt, statFlags } from '../app/statsFormat.js';
import { validateMeta, validateQuestions } from '../app/validate.js';
import { quizFingerprint } from '../app/progress.js';
import { call, fakeRequest } from './apiHelpers.js';

const meta = validateMeta({
  id: 'demo', title: 'Demo', mode: 'test', collectResults: true,
  skills: [{ id: 'logic', label: 'Logic' }, { id: 'detail', label: 'Detail' }],
});
const questions = validateQuestions([
  { id: 'q1', type: 'mcq', skill: 'logic', prompt: 'Pick B\nsecond line', options: ['A', 'B', 'C'], answer: 'B' },
  { id: 't', type: 'text', skill: 'detail', prompt: 'Type 42', answer: '42' },
  { id: 's', type: 'statements', skill: 'detail', prompt: 'Judge', statements: [{ text: 'one', answer: 'true' }, { text: 'two', answer: 'false' }] },
  { id: 'w', type: 'spot', skill: 'logic', prompt: 'Tap', text: 'The cat sat on the mat', answer: 'cat' },
]);
const quiz = { meta, questions, version: quizFingerprint(questions) };

// Ten submissions, scores 10 (i = 0) down to 1 (i = 9).
//   q1: right for i < 5; wrong A for i = 5, 6, 8; C for i = 7; unanswered for i = 9.
//   t: right except i = 8 (" 41") and i = 9 ("41.").
//   s: statement 1 always "true" (right); statement 2 "false" (right) for i < 2, otherwise "cannot-tell".
//   w: word 1 ("cat", right) for i < 6; word 5 ("mat") for i = 6..8; word 2 ("sat") for i = 9.
function rowFor(i, quizVersion = quiz.version) {
  const q1 = i < 5 ? 'B' : i === 7 ? 'C' : i === 9 ? null : 'A';
  const t = i === 8 ? ' 41' : i === 9 ? '41.' : '42';
  const w = i < 6 ? 1 : i < 9 ? 5 : 2;
  const statements = { 0: 'true', 1: i < 2 ? 'false' : 'cannot-tell' };
  return {
    quizVersion,
    quizChanged: false,
    score: 10 - i,
    total: 6,
    skills: [{ id: 'logic', label: 'Logic', points: i < 5 ? 2 : 1, outOf: 2 }, { id: 'detail', label: 'Detail', points: 3, outOf: 4 }],
    answers: {
      q1: { selection: q1, isCorrect: q1 === 'B', points: q1 === 'B' ? 1 : 0, seconds: 10 },
      t: { selection: t, isCorrect: t === '42', points: t === '42' ? 1 : 0, seconds: i === 0 ? null : 20 },
      s: { selection: statements, isCorrect: i < 2, points: i < 2 ? 2 : 1, seconds: 30 },
      w: { selection: w, isCorrect: w === 1, points: w === 1 ? 1 : 0, seconds: 5 },
    },
  };
}
const tenRows = Array.from({ length: 10 }, (unused, i) => rowFor(i));

describe('computeStats', () => {
  const stats = computeStats(quiz, [...tenRows, rowFor(0, '9-old'), rowFor(1, '9-old')]);
  const byId = Object.fromEntries(stats.questions.map((item) => [item.id, item]));

  it('counts only submissions on the current quiz version and says how many were left out', () => {
    expect(stats.submissions).toBe(10);
    expect(stats.excluded).toBe(2);
    expect(stats.enoughData).toBe(true);
    expect(stats.groupSize).toBe(3);
  });

  it('gives answered, % correct, average time and discrimination per question, in quiz order', () => {
    expect(stats.questions.map((item) => item.number)).toEqual([1, 2, 3, 4]);
    expect(byId.q1).toMatchObject({ answered: 9, percentCorrect: 50, averageSeconds: 10, discrimination: 1, skillLabel: 'Logic' });
    expect(byId.t).toMatchObject({ answered: 10, percentCorrect: 80, averageSeconds: 20, discrimination: 0.67 });
    expect(byId.w).toMatchObject({ percentCorrect: 60, discrimination: 1 });
  });

  it('gives the option distribution and the most common wrong answer of a multiple-choice question', () => {
    expect(byId.q1.options).toEqual([
      { option: 'A', count: 3, correct: false },
      { option: 'B', count: 5, correct: true },
      { option: 'C', count: 1, correct: false },
    ]);
    expect(byId.q1.mostCommonWrong).toEqual({ answer: 'A', count: 3 });
  });

  it('groups wrong typed answers after normalising them, and wrong taps by word', () => {
    expect(byId.t.wrongAnswers).toEqual([{ answer: '41', count: 2 }]);
    expect(byId.w.wrongWords).toEqual([{ answer: 'mat', index: 5, count: 3 }, { answer: 'sat', index: 2, count: 1 }]);
    expect(byId.w.mostCommonWrong).toEqual({ answer: 'mat', index: 5, count: 3 });
  });

  it('gives statistics per statement', () => {
    expect(byId.s.percentCorrect).toBe(20);
    expect(byId.s.statements).toEqual([
      { index: 0, text: 'one', answer: 'true', answered: 10, percentCorrect: 100, discrimination: 0, distribution: { true: 10, false: 0, 'cannot-tell': 0 } },
      { index: 1, text: 'two', answer: 'false', answered: 10, percentCorrect: 20, discrimination: 0.67, distribution: { true: 0, false: 2, 'cannot-tell': 8 } },
    ]);
  });

  it('gives the average score and the average per skill', () => {
    expect(stats.overall).toMatchObject({ averageScore: 5.5, total: 5, averagePercent: 110 });
    expect(stats.overall.skills).toEqual([
      { id: 'logic', label: 'Logic', outOf: 2, averagePoints: 1.5 },
      { id: 'detail', label: 'Detail', outOf: 4, averagePoints: 3 },
    ]);
  });

  it('reports "not enough data" for discrimination with fewer than 10 submissions', () => {
    const few = computeStats(quiz, tenRows.slice(0, 9));
    expect(few.enoughData).toBe(false);
    expect(few.questions.every((item) => item.discrimination === null)).toBe(true);
    expect(few.questions.find((item) => item.id === 's').statements[1].discrimination).toBeNull();
    expect(few.questions[0].percentCorrect).toBeCloseTo(55.6, 1);
  });

  it('copes with no submissions at all', () => {
    const none = computeStats(quiz, [rowFor(0, '9-old')]);
    expect(none.submissions).toBe(0);
    expect(none.excluded).toBe(1);
    expect(none.questions[0]).toMatchObject({ answered: 0, percentCorrect: null, averageSeconds: null });
    expect(none.overall.averageScore).toBeNull();
  });

  it('averages time over the submissions that answered, not unanswered ones stored with 0 seconds', () => {
    const rows = tenRows.map((row, i) => (i < 5 ? row : {
      ...row,
      answers: { ...row.answers, q1: { selection: null, isCorrect: false, points: 0, seconds: 0 } },
    }));
    const q1 = computeStats(quiz, rows).questions[0];
    expect(q1.answered).toBe(5);
    expect(q1.averageSeconds).toBe(10);
  });

  it('adds the rows the database already left out to the excluded count', () => {
    const stats = computeStats(quiz, tenRows, { alreadyExcluded: 7 });
    expect(stats).toMatchObject({ submissions: 10, excluded: 7 });
  });

  it('breaks ties at the group boundary by submission id, whatever the row order', () => {
    // Twelve submissions with the same score; q1 right only for ids a..d.
    const ids = 'abcdefghijkl'.split('');
    const rows = ids.map((id, i) => ({
      ...rowFor(0),
      id,
      score: 5,
      answers: { ...rowFor(0).answers, q1: { selection: i < 4 ? 'B' : 'A', isCorrect: i < 4, points: i < 4 ? 1 : 0, seconds: 10 } },
    }));
    const forward = computeStats(quiz, rows).questions[0].discrimination;
    const backward = computeStats(quiz, [...rows].reverse()).questions[0].discrimination;
    expect(forward).toBe(1); // top = a, b, c (right); bottom = j, k, l (wrong)
    expect(backward).toBe(forward);
  });
});

describe('flags and CSV', () => {
  it('labels very easy, very hard and non-separating questions', () => {
    expect(statFlags({ percentCorrect: 95, discrimination: 0.1 }).map((flag) => flag.id)).toEqual(['very-easy', 'no-separation']);
    expect(statFlags({ percentCorrect: 20, discrimination: null }).map((flag) => flag.id)).toEqual(['very-hard']);
    expect(statFlags({ percentCorrect: 50, discrimination: 0.2 })).toEqual([]);
    expect(STATS_THRESHOLDS.lowDiscrimination).toBe(0.2);
  });

  it('builds one row per question and per statement', () => {
    const csv = buildStatsCsv(computeStats(quiz, tenRows));
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).trim().split('\r\n');
    expect(lines[0]).toBe('Number,Question id,Statement,Type,Skill,Prompt,Answered,Correct %,Discrimination,Average seconds,Most common wrong answer,Flags');
    expect(lines).toHaveLength(1 + 4 + 2);
    expect(lines[1]).toBe('1,q1,,mcq,Logic,Pick B,9,50.0,1.00,10,A (3),');
    expect(lines[4]).toBe('3,s,1,statement,Detail,one,10,100.0,0.00,,,Very easy (≥90%); Doesn\'t separate (discrimination < 0.2)');
  });

  it('writes a negative discrimination as a number, not as text', () => {
    const csv = buildStatsCsv({ questions: [{ number: 1, id: 'x', type: 'mcq', skillLabel: 'Logic', prompt: 'P', answered: 12, percentCorrect: 40, discrimination: -0.2, averageSeconds: 9, mostCommonWrong: null }] });
    const row = csv.slice(1).trim().split('\r\n')[1];
    expect(row).toBe("1,x,,mcq,Logic,P,12,40.0,-0.20,9,,Doesn't separate (discrimination < 0.2)");
    expect(row).not.toContain("'-");
  });

  it('shortens prompts to their first line', () => {
    expect(shortPrompt('\nFirst line\nsecond')).toBe('First line');
    expect(shortPrompt('x'.repeat(100), 10)).toBe(`${'x'.repeat(9)}…`);
  });
});

describe('GET /api/stats', () => {
  const PASSWORD = 'pw';
  const auth = { Authorization: 'Bearer pw' };

  async function setup() {
    const db = createMemoryDb();
    for (const [i, row] of tenRows.entries()) {
      await db.insertSubmission({ id: `id-${i}`, quizId: 'demo', name: `P${i}`, submittedAt: `2026-11-${String(10 + i).padStart(2, '0')}T10:00:00.000Z`, ...row });
    }
    return createStatsHandler({ db: () => db, env: { FACILITATOR_PASSWORD: PASSWORD }, loadQuiz: async (id) => (id === 'demo' ? quiz : null) });
  }

  it('needs the password and a known quiz', async () => {
    const handler = await setup();
    expect((await call(handler, fakeRequest({ url: '/api/stats?quiz=demo' }))).status).toBe(401);
    expect((await call(handler, fakeRequest({ url: '/api/stats?quiz=nope', headers: auth }))).status).toBe(404);
    expect((await call(handler, fakeRequest({ url: '/api/stats?quiz=demo&cohort=bad!', headers: auth }))).status).toBe(400);
  });

  it('returns the statistics, filtered by date, without names', async () => {
    const handler = await setup();
    const all = await call(handler, fakeRequest({ url: '/api/stats?quiz=demo', headers: auth }));
    expect(all.status).toBe(200);
    expect(all.json).toMatchObject({ ok: true, submissions: 10, excluded: 0, enoughData: true });
    expect(JSON.stringify(all.json)).not.toContain('P1');
    expect(all.headers['cache-control']).toBe('no-store');
    const some = await call(handler, fakeRequest({ url: '/api/stats?quiz=demo&from=2026-11-15', headers: auth }));
    expect(some.json).toMatchObject({ submissions: 5, enoughData: false });
  });

  it('counts submissions of an older quiz version as left out, without reading their answers', async () => {
    const db = createMemoryDb();
    for (const [i, row] of tenRows.entries()) {
      await db.insertSubmission({ id: `id-${i}`, quizId: 'demo', name: `P${i}`, submittedAt: `2026-11-${String(10 + i).padStart(2, '0')}T10:00:00.000Z`, ...row });
    }
    await db.insertSubmission({ id: 'old-1', quizId: 'demo', name: 'Old', submittedAt: '2026-11-01T10:00:00.000Z', ...rowFor(0, '9-old') });
    const { rows, excluded } = await db.listStatsRows({ quizId: 'demo', version: quiz.version });
    expect(rows).toHaveLength(10);
    expect(excluded).toBe(1);
    const handler = createStatsHandler({ db: () => db, env: { FACILITATOR_PASSWORD: PASSWORD }, loadQuiz: async () => quiz });
    const response = await call(handler, fakeRequest({ url: '/api/stats?quiz=demo', headers: auth }));
    expect(response.json).toMatchObject({ submissions: 10, excluded: 1, truncated: false });
  });

  it('says when only the newest submissions were counted', async () => {
    const { STATS_LIMIT } = await import('../api/_lib/db.js');
    expect(STATS_LIMIT).toBe(2000);
    const db = createMemoryDb();
    for (let i = 0; i <= STATS_LIMIT; i += 1) {
      db.rows.set(`id-${i}`, { id: `id-${i}`, quizId: 'demo', submittedAt: new Date(Date.UTC(2026, 0, 1) + i * 60000).toISOString(), ...rowFor(i % 10) });
    }
    const handler = createStatsHandler({ db: () => db, env: { FACILITATOR_PASSWORD: PASSWORD }, loadQuiz: async () => quiz });
    const response = await call(handler, fakeRequest({ url: '/api/stats?quiz=demo', headers: auth }));
    expect(response.json).toMatchObject({ submissions: STATS_LIMIT, truncated: true, limit: STATS_LIMIT });
  });
});
