// GET / DELETE /api/results: password, listing and deleting.
import { describe, expect, it } from 'vitest';

import { bearerToken, createResultsHandler, passwordMatches } from '../api/results.js';
import { createNeonDb, isAlreadyExistsError } from '../api/_lib/db.js';
import { createMemoryDb } from '../api/_lib/memoryDb.js';
import { call, fakeRequest } from './apiHelpers.js';

const PASSWORD = 'correct horse battery staple';
const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'];

function record(id, quizId, submittedAt, name) {
  return {
    id, quizId, quizVersion: 'v1', name, startedAt: submittedAt, submittedAt, timeTakenSeconds: 60,
    score: 3, total: 5, skills: [{ id: 'logic', label: 'Logic', points: 3, outOf: 5, seconds: 60 }], answers: { q1: { selection: 'A', isCorrect: true, points: 3, seconds: 60 } }, quizChanged: false,
  };
}

async function setup(env = { FACILITATOR_PASSWORD: PASSWORD }) {
  const db = createMemoryDb();
  await db.insertSubmission(record(ids[0], 'cit-aptitude', '2026-11-20T10:00:00.000Z', 'Asha'));
  await db.insertSubmission(record(ids[1], 'cit-aptitude', '2026-11-24T10:00:00.000Z', 'Ben'));
  await db.insertSubmission(record(ids[2], 'other', '2026-11-22T10:00:00.000Z', 'Chen'));
  return { db, handler: createResultsHandler({ db: () => db, env }) };
}

// As the results page sends it: percent-encoded.
const auth = (password = PASSWORD) => ({ Authorization: `Bearer ${encodeURIComponent(password)}` });

describe('/api/results', () => {
  it('refuses requests without a password or with a wrong one', async () => {
    const { handler } = await setup();
    const none = await call(handler, fakeRequest({ url: '/api/results?quiz=cit-aptitude' }));
    expect(none.status).toBe(401);
    expect(none.json.submissions).toBeUndefined();
    const wrong = await call(handler, fakeRequest({ url: '/api/results?quiz=cit-aptitude', headers: auth('guess') }));
    expect(wrong.status).toBe(401);
    expect(wrong.headers['cache-control']).toBe('no-store');
    const basic = await call(handler, fakeRequest({ url: '/api/results', headers: { Authorization: `Basic ${PASSWORD}` } }));
    expect(basic.status).toBe(401);
  });

  it.each([[{}], [{ FACILITATOR_PASSWORD: '' }]])('always refuses when FACILITATOR_PASSWORD is not set (%j)', async (env) => {
    const { handler, db } = await setup(env);
    for (const password of ['', 'undefined', PASSWORD]) {
      const response = await call(handler, fakeRequest({ url: '/api/results?quiz=cit-aptitude', headers: auth(password) }));
      expect(response.status).toBe(503);
      expect(response.json.submissions).toBeUndefined();
    }
    const del = await call(handler, fakeRequest({ method: 'DELETE', url: `/api/results?id=${ids[0]}`, headers: auth() }));
    expect(del.status).toBe(503);
    expect(db.rows.size).toBe(3);
  });

  it('lists a quiz newest first, with the quiz ids that have results', async () => {
    const { handler } = await setup();
    const response = await call(handler, fakeRequest({ url: '/api/results?quiz=cit-aptitude', headers: auth() }));
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json.quizIds).toEqual(['cit-aptitude', 'other']);
    expect(response.json.submissions.map((item) => item.name)).toEqual(['Ben', 'Asha']);
    // The list leaves the answers out; they are fetched one submission at a time.
    expect(response.json.submissions[0]).not.toHaveProperty('answers');
    expect(response.json.submissions[0].skills).toHaveLength(1);
    expect(response.json).toMatchObject({ limit: 2000, truncated: false });
  });

  it('returns one submission with its answers', async () => {
    const { handler } = await setup();
    const response = await call(handler, fakeRequest({ url: `/api/results?id=${ids[1]}`, headers: auth() }));
    expect(response.status).toBe(200);
    expect(response.json.submission).toMatchObject({ id: ids[1], name: 'Ben', answers: { q1: { selection: 'A' } } });
    expect(response.headers['cache-control']).toBe('no-store');
    const missing = await call(handler, fakeRequest({ url: '/api/results?id=44444444-4444-4444-8444-444444444444', headers: auth() }));
    expect(missing.status).toBe(404);
    const bad = await call(handler, fakeRequest({ url: '/api/results?id=nope', headers: auth() }));
    expect(bad.status).toBe(400);
    const noAuth = await call(handler, fakeRequest({ url: `/api/results?id=${ids[1]}` }));
    expect(noAuth.status).toBe(401);
    expect(noAuth.json.submission).toBeUndefined();
  });

  it('accepts passwords in any script and keeps their leading spaces', async () => {
    for (const password of ['  पासवर्ड ü 密码', ' lead', '50%off']) {
      const { handler } = await setup({ FACILITATOR_PASSWORD: password });
      expect((await call(handler, fakeRequest({ url: '/api/results', headers: auth(password) }))).status).toBe(200);
      if (password.trim() !== password) {
        expect((await call(handler, fakeRequest({ url: '/api/results', headers: auth(password.trim()) }))).status).toBe(401);
      }
    }
    expect(bearerToken(fakeRequest({ headers: { Authorization: 'Bearer %E0%A4' } }))).toBeNull();
    expect(bearerToken(fakeRequest({ headers: { Authorization: 'bearer  x' } }))).toBe(' x');
  });

  it('filters by date (from inclusive, to exclusive) and lists quiz ids without a quiz', async () => {
    const { handler } = await setup();
    const filtered = await call(handler, fakeRequest({ url: '/api/results?quiz=cit-aptitude&from=2026-11-21&to=2026-11-25T00:00:00Z', headers: auth() }));
    expect(filtered.json.submissions.map((item) => item.name)).toEqual(['Ben']);
    const bad = await call(handler, fakeRequest({ url: '/api/results?quiz=cit-aptitude&from=soon', headers: auth() }));
    expect(bad.status).toBe(400);
    const idsOnly = await call(handler, fakeRequest({ url: '/api/results', headers: auth() }));
    expect(idsOnly.json).toMatchObject({ ok: true, quizIds: ['cit-aptitude', 'other'], submissions: [] });
  });

  it('deletes one submission', async () => {
    const { handler, db } = await setup();
    const response = await call(handler, fakeRequest({ method: 'DELETE', url: `/api/results?id=${ids[0]}`, headers: auth() }));
    expect(response.status).toBe(200);
    expect(db.rows.has(ids[0])).toBe(false);
    expect(db.rows.size).toBe(2);
    const again = await call(handler, fakeRequest({ method: 'DELETE', url: `/api/results?id=${ids[0]}`, headers: auth() }));
    expect(again.status).toBe(404);
    const bad = await call(handler, fakeRequest({ method: 'DELETE', url: '/api/results?id=1%20OR%201=1', headers: auth() }));
    expect(bad.status).toBe(400);
    const wrong = await call(handler, fakeRequest({ method: 'DELETE', url: `/api/results?id=${ids[1]}`, headers: auth('nope') }));
    expect(wrong.status).toBe(401);
    expect(db.rows.has(ids[1])).toBe(true);
  });

  it('refuses other methods', async () => {
    const { handler } = await setup();
    const response = await call(handler, fakeRequest({ method: 'POST', url: '/api/results', headers: auth() }));
    expect(response.status).toBe(405);
  });

  it('compares passwords exactly', () => {
    expect(passwordMatches(PASSWORD, PASSWORD)).toBe(true);
    expect(passwordMatches(`${PASSWORD} `, PASSWORD)).toBe(false);
    expect(passwordMatches('', PASSWORD)).toBe(false);
    expect(passwordMatches('', '')).toBe(false);
    expect(passwordMatches('x', undefined)).toBe(false);
  });
});

describe('creating the table', () => {
  function fakeSql(failures) {
    const statements = [];
    const sql = async (strings) => {
      const text = strings.join('?').replace(/\s+/g, ' ').trim();
      statements.push(text);
      const failure = failures.find((item) => text.startsWith(item.startsWith));
      if (failure && !failure.used) {
        failure.used = true;
        throw Object.assign(new Error(failure.message), { code: failure.code });
      }
      return text.startsWith('INSERT') ? [{ id: 'x' }] : [];
    };
    return { sql, statements };
  }

  it('carries on when another cold start created the table at the same moment', async () => {
    const { sql, statements } = fakeSql([
      { startsWith: 'CREATE TABLE', code: '23505', message: 'duplicate key value violates unique constraint "pg_type_typname_nsp_index"' },
      { startsWith: 'CREATE INDEX', code: '42P07', message: 'relation already exists' },
    ]);
    const db = createNeonDb('postgres://unused', { connect: async () => sql });
    await expect(db.insertSubmission({ ...record(ids[0], 'q', '2026-11-20T10:00:00.000Z', 'A') })).resolves.toEqual({ inserted: true });
    expect(statements.filter((text) => text.startsWith('INSERT'))).toHaveLength(1);
  });

  it('fails on other errors, and tries to create the table again next time', async () => {
    const { sql, statements } = fakeSql([{ startsWith: 'CREATE TABLE', code: '28P01', message: 'password authentication failed' }]);
    const db = createNeonDb('postgres://unused', { connect: async () => sql });
    await expect(db.listQuizIds()).rejects.toThrow(/password authentication/);
    await expect(db.listQuizIds()).resolves.toEqual([]);
    expect(statements.filter((text) => text.startsWith('CREATE TABLE IF NOT EXISTS submissions'))).toHaveLength(2);
  });

  it('recognises only "already exists" errors', () => {
    expect(isAlreadyExistsError({ code: '23505' })).toBe(true);
    expect(isAlreadyExistsError({ code: '42P07' })).toBe(true);
    expect(isAlreadyExistsError({ code: '42710' })).toBe(true);
    expect(isAlreadyExistsError({ code: '08006' })).toBe(false);
    expect(isAlreadyExistsError(null)).toBe(false);
  });
});
