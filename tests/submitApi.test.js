// POST /api/submit: strict checks, re-grading on the server, idempotent storage.
import { describe, expect, it } from 'vitest';

import { BODY_LIMIT_BYTES, createSubmitHandler } from '../api/submit.js';
import { createMemoryDb } from '../api/_lib/memoryDb.js';
import { loadQuizFromFiles } from '../api/_lib/quizFiles.js';
import { validateMeta, validateQuestions, validateQuizConsistency } from '../app/validate.js';
import { quizFingerprint } from '../app/progress.js';
import { call, fakeRequest, jsonRequest } from './apiHelpers.js';

const meta = validateMeta({
  id: 'demo',
  title: 'Demo',
  mode: 'test',
  collectResults: true,
  skills: [
    { id: 'logic', label: 'Logic' },
    { id: 'detail', label: 'Detail' },
  ],
});
const questions = validateQuestions([
  { id: 1, type: 'mcq', skill: 'logic', prompt: 'Pick B', options: ['A', 'B', 'C'], answer: 'B', points: 2 },
  { id: 'm', type: 'matching', skill: 'logic', prompt: 'Match', pairs: [['x', '1'], ['y', '2']] },
  { id: 's', type: 'statements', skill: 'detail', prompt: 'Judge', statements: [{ text: 'a', answer: 'true' }, { text: 'b', answer: 'false' }] },
  { id: 'w', type: 'spot', skill: 'detail', prompt: 'Tap', text: 'The cat sat', answer: 'cat' },
  { id: 't', type: 'text', skill: 'detail', prompt: 'Type', answer: '42' },
]);
validateQuizConsistency(meta, questions);
const demoQuiz = { meta, questions, version: quizFingerprint(questions) };
const closedQuiz = { meta: { ...meta, collectResults: false }, questions, version: demoQuiz.version };

const ID = '1b4e28ba-2fa1-4d2b-883f-0016d3cca427';

function setup({ quizzes = { demo: demoQuiz, closed: closedQuiz }, db = createMemoryDb() } = {}) {
  const handler = createSubmitHandler({
    db: () => db,
    loadQuiz: async (quizId) => quizzes[quizId] ?? null,
    now: () => new Date('2026-11-25T10:00:00Z'),
  });
  return { handler, db };
}

function body(overrides = {}) {
  return {
    id: ID,
    quizId: 'demo',
    quizVersion: demoQuiz.version,
    name: '  Priya Sharma  ',
    startedAt: Date.parse('2026-11-25T09:30:00Z'),
    timeTakenSeconds: 1800,
    selections: {
      1: 'B',
      m: { x: '1', y: '1' },
      s: { 0: 'true', 1: 'true' },
      w: 1,
      t: ' 42 ',
    },
    timeSpent: { 1: 30000, m: 61000, s: 20000 },
    optionOrders: { 1: ['C', 'B', 'A'], m: ['2', '1'] },
    ...overrides,
  };
}

describe('POST /api/submit', () => {
  it('stores a valid submission, re-graded on the server', async () => {
    const { handler, db } = setup();
    const response = await call(handler, jsonRequest(body()));
    expect(response.status).toBe(201);
    expect(response.json).toEqual({ ok: true, id: ID, score: 5, total: 8, duplicate: false, quizChanged: false, cohort: false, cohortLabel: null });
    expect(response.headers['cache-control']).toBe('no-store');

    const stored = db.rows.get(ID);
    expect(stored).toMatchObject({
      id: ID,
      quizId: 'demo',
      quizVersion: demoQuiz.version,
      quizChanged: false,
      name: 'Priya Sharma',
      startedAt: '2026-11-25T09:30:00.000Z',
      submittedAt: '2026-11-25T10:00:00.000Z',
      timeTakenSeconds: 1800,
      score: 5,
      total: 8,
    });
    expect(stored.skills).toEqual([
      { id: 'logic', label: 'Logic', points: 2, outOf: 4, seconds: 91 },
      { id: 'detail', label: 'Detail', points: 3, outOf: 4, seconds: 20 },
    ]);
    expect(stored.answers['1']).toEqual({ selection: 'B', isCorrect: true, points: 2, seconds: 30, optionOrder: ['C', 'B', 'A'] });
    expect(stored.answers.m).toEqual({ selection: { x: '1', y: '1' }, isCorrect: false, points: 0, seconds: 61 });
    expect(stored.answers.s).toMatchObject({ isCorrect: false, points: 1 });
    expect(stored.answers.w).toMatchObject({ selection: 1, isCorrect: true, points: 1, seconds: null });
    expect(stored.answers.t).toMatchObject({ isCorrect: true, points: 1 });
    // Nothing about the device is stored.
    expect(Object.keys(stored).sort()).toEqual(
      ['answers', 'cohortCode', 'cohortId', 'id', 'name', 'quizChanged', 'quizId', 'quizVersion', 'score', 'skills', 'startedAt', 'submittedAt', 'timeTakenSeconds', 'total'].sort()
    );
  });

  it('ignores a score sent by the browser (unknown fields are refused, the score is always recomputed)', async () => {
    const { handler, db } = setup();
    const faked = await call(handler, jsonRequest({ ...body(), score: 999, total: 8 }));
    expect(faked.status).toBe(400);
    expect(db.rows.size).toBe(0);

    const allWrong = await call(handler, jsonRequest(body({ selections: { 1: 'A' } })));
    expect(allWrong.status).toBe(201);
    expect(allWrong.json.score).toBe(0);
    expect(db.rows.get(ID).score).toBe(0);
  });

  it('stores a submission sent twice only once', async () => {
    const { handler, db } = setup();
    const first = await call(handler, jsonRequest(body()));
    const second = await call(handler, jsonRequest(body({ name: 'Someone else' })));
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.json).toMatchObject({ ok: true, id: ID, duplicate: true });
    expect(db.rows.size).toBe(1);
    expect(db.rows.get(ID).name).toBe('Priya Sharma');
  });

  it('refuses a quiz without "collectResults": true, and an unknown quiz', async () => {
    const { handler, db } = setup();
    const closed = await call(handler, jsonRequest(body({ quizId: 'closed' })));
    expect(closed.status).toBe(403);
    expect(closed.json.ok).toBe(false);
    const unknown = await call(handler, jsonRequest(body({ quizId: 'nope' })));
    expect(unknown.status).toBe(404);
    expect(db.rows.size).toBe(0);
  });

  it.each([
    ['not an object', [1, 2]],
    ['a bad id', body({ id: 'abc' })],
    ['a bad quiz id', body({ quizId: '../etc' })],
    ['no quiz version', body({ quizVersion: undefined })],
    ['a malformed quiz version', body({ quizVersion: 'drop table' })],
    ['an empty name', body({ name: '   ' })],
    ['a missing name', body({ name: undefined })],
    ['a name of only invisible characters', body({ name: '​‍⁠ \u0000' })],
    ['no selections', body({ selections: undefined })],
    ['selections that are not an object', body({ selections: 'B' })],
    ['an mcq answer that is not an option', body({ selections: { 1: 'Z' } })],
    ['an mcq answer that is not text', body({ selections: { 1: 3 } })],
    ['a spot index out of range', body({ selections: { w: 99 } })],
    ['a matching key not in the question', body({ selections: { m: { z: '1' } } })],
    ['a statement choice that does not exist', body({ selections: { s: { 0: 'maybe' } } })],
    ['a statement index out of range', body({ selections: { s: { 5: 'true' } } })],
    ['a typed answer that is too long', body({ selections: { t: 'x'.repeat(1001) } })],
    ['a negative time taken', body({ timeTakenSeconds: -5 })],
    ['a bad start time', body({ startedAt: 'yesterday-ish' })],
    ['a bad time spent', body({ timeSpent: { 1: 'long' } })],
  ])('refuses a body with %s', async (label, payload) => {
    const { handler, db } = setup();
    const response = await call(handler, jsonRequest(payload));
    expect(response.status).toBe(400);
    expect(response.json.ok).toBe(false);
    expect(typeof response.json.error).toBe('string');
    expect(db.rows.size).toBe(0);
  });

  it('refuses answers to question ids that are not in the quiz (same quiz version)', async () => {
    const { handler, db } = setup();
    const response = await call(handler, jsonRequest(body({ selections: { 1: 'B', 999: 'A' } })));
    expect(response.status).toBe(400);
    expect(response.json.error).toContain('999');
    const times = await call(handler, jsonRequest(body({ timeSpent: { nope: 10 } })));
    expect(times.status).toBe(400);
    expect(db.rows.size).toBe(0);
  });

  it('refuses invalid JSON, the wrong content type and the wrong method', async () => {
    const { handler } = setup();
    expect((await call(handler, jsonRequest('{not json'))).status).toBe(400);
    expect((await call(handler, jsonRequest(''))).status).toBe(400);
    const text = await call(handler, fakeRequest({ method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: body() }));
    expect(text.status).toBe(415);
    const get = await call(handler, fakeRequest({ method: 'GET' }));
    expect(get.status).toBe(405);
    expect(get.headers.allow).toBe('POST');
  });

  it('refuses a body over the size limit', async () => {
    const { handler, db } = setup();
    const big = JSON.stringify(body({ name: 'x'.repeat(BODY_LIMIT_BYTES) }));
    const streamed = await call(handler, jsonRequest(big));
    expect(streamed.status).toBe(413);
    const declared = await call(handler, jsonRequest(body(), { 'Content-Length': String(BODY_LIMIT_BYTES + 1) }));
    expect(declared.status).toBe(413);
    expect(db.rows.size).toBe(0);
  });

  it('cuts a very long name to 80 characters', async () => {
    const { handler, db } = setup();
    const response = await call(handler, jsonRequest(body({ name: 'अ'.repeat(120) })));
    expect(response.status).toBe(201);
    expect(Array.from(db.rows.get(ID).name)).toHaveLength(80);
  });

  it('answers 503 without a database, and 500 when storing fails', async () => {
    const noDb = createSubmitHandler({ db: () => null, loadQuiz: async () => demoQuiz });
    expect((await call(noDb, jsonRequest(body()))).status).toBe(503);
    const broken = createSubmitHandler({
      db: () => ({ insertSubmission: async () => { throw new Error('connection lost'); } }),
      loadQuiz: async () => demoQuiz,
    });
    const response = await call(broken, jsonRequest(body()));
    expect(response.status).toBe(500);
    expect(response.json.error).not.toContain('connection lost');
  });

  it('works with a body already read by the platform (req.body)', async () => {
    const { handler, db } = setup();
    const req = fakeRequest({ method: 'POST', headers: { 'Content-Type': 'application/json' } });
    req.body = body();
    const response = await call(handler, req);
    expect(response.status).toBe(201);
    expect(db.rows.size).toBe(1);
  });
});

describe('text the database cannot store', () => {
  it('strips NUL and control characters and replaces lone surrogates in names and typed answers', async () => {
    const { handler, db } = setup();
    const response = await call(handler, jsonRequest(body({
      name: 'Pri\u0000ya\tS\uD800',
      selections: { t: '4\u00002\uDC00' },
    })));
    expect(response.status).toBe(201);
    const stored = db.rows.get(ID);
    expect(stored.name).toBe('Priya S�');
    expect(stored.answers.t.selection).toBe('42�');
    expect(JSON.stringify(stored)).not.toContain('\\u0000');
  });

  it('keeps zero-width joiners inside a visible name', async () => {
    const { handler, db } = setup();
    expect((await call(handler, jsonRequest(body({ name: 'क्‍ष' })))).status).toBe(201);
    expect(db.rows.get(ID).name).toBe('क्‍ष');
  });
});

describe('start times from a wrong clock', () => {
  it.each([
    ['in the future', Date.parse('2026-11-26T10:00:00Z')],
    ['more than 7 days before submitting', Date.parse('2026-11-10T10:00:00Z')],
  ])('stores no start time when it is %s', async (label, startedAt) => {
    const { handler, db } = setup();
    expect((await call(handler, jsonRequest(body({ startedAt })))).status).toBe(201);
    expect(db.rows.get(ID).startedAt).toBeNull();
  });
});

describe('a quiz edited while results were waiting to be sent', () => {
  it('grades what still fits, leaves out the rest and marks the submission', async () => {
    const { handler, db } = setup();
    const response = await call(handler, jsonRequest(body({
      quizVersion: '5-oldversion',
      selections: { 1: 'B', gone: 'A', m: { x: '1', removed: '9' }, t: '42' },
      timeSpent: { 1: 1000, gone: 5000 },
    })));
    expect(response.status).toBe(201);
    expect(response.json).toMatchObject({ ok: true, score: 3, quizChanged: true });
    const stored = db.rows.get(ID);
    expect(stored.quizVersion).toBe('5-oldversion');
    expect(stored.quizChanged).toBe(true);
    expect(stored.answers).not.toHaveProperty('gone');
    expect(stored.answers.m.selection).toBeNull();
    expect(stored.answers['1'].isCorrect).toBe(true);
  });

  it('still refuses a malformed request for an older version', async () => {
    const { handler } = setup();
    expect((await call(handler, jsonRequest(body({ quizVersion: '5-oldversion', selections: [] })))).status).toBe(400);
    expect((await call(handler, jsonRequest(body({ quizVersion: '5-oldversion', name: '' })))).status).toBe(400);
  });
});

describe('quizzes on disk', () => {
  it('loads the aptitude test from quizzes/, which collects results', async () => {
    const quiz = await loadQuizFromFiles('cit-aptitude');
    expect(quiz.meta.collectResults).toBe(true);
    expect(quiz.version).toBe(quizFingerprint(quiz.questions));
  });

  it('returns null for a quiz that does not exist, and the sample quiz does not collect results', async () => {
    expect(await loadQuizFromFiles('no-such-quiz')).toBeNull();
    const sample = await loadQuizFromFiles('sample');
    expect(sample.meta.collectResults).toBe(false);
  });

  it('grades a real aptitude submission with the default handler wiring', async () => {
    const db = createMemoryDb();
    const handler = createSubmitHandler({ db: () => db });
    const quiz = await loadQuizFromFiles('cit-aptitude');
    const first = quiz.questions.find((question) => question.type === 'mcq');
    const response = await call(handler, jsonRequest(body({
      quizId: 'cit-aptitude', quizVersion: quiz.version, startedAt: Date.now() - 60000,
      selections: { [first.id]: first.answer }, timeSpent: {}, optionOrders: undefined,
    })));
    expect(response.status).toBe(201);
    expect(response.json).toMatchObject({ score: first.points, total: 40, quizChanged: false });
  });
});
