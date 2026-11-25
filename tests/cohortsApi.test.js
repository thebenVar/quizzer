// Cohort codes: making them, checking them, and submissions that carry one.
import { describe, expect, it } from 'vitest';

import { createCohortCheckHandler } from '../api/cohort.js';
import { createCohortsHandler } from '../api/cohorts.js';
import { createResultsHandler } from '../api/results.js';
import { createSubmitHandler } from '../api/submit.js';
import { createMemoryDb } from '../api/_lib/memoryDb.js';
import {
  COHORT_ALPHABET,
  createCohort,
  generateCohortCode,
  normalizeCohortCode,
  parseCohortParam,
  rawCohortCode,
} from '../api/_lib/cohorts.js';
import { validateMeta, validateQuestions } from '../app/validate.js';
import { quizFingerprint } from '../app/progress.js';
import { call, fakeRequest, jsonRequest } from './apiHelpers.js';

const PASSWORD = 'facilitator-secret';
const env = { FACILITATOR_PASSWORD: PASSWORD };
const auth = { Authorization: `Bearer ${encodeURIComponent(PASSWORD)}` };

const questions = validateQuestions([{ id: 1, type: 'mcq', prompt: 'Pick B', options: ['A', 'B'], answer: 'B' }]);
function quiz(cohortCodes) {
  return { meta: validateMeta({ id: 'x', title: 'X', collectResults: true, cohortCodes }), questions, version: quizFingerprint(questions) };
}
const quizzes = { apt: quiz('optional'), req: quiz('required'), off: quiz('off') };
const loadQuiz = async (quizId) => quizzes[quizId] ?? null;

function cohortsHandler(db, options = {}) {
  return createCohortsHandler({ db: () => db, env, loadQuiz, ...options });
}

async function addCohort(db, quizId, label, code, active = true) {
  let index = 0;
  const cohort = await createCohort(db, { quizId, label, randomIndex: () => COHORT_ALPHABET.indexOf(code[index++ % 6]) });
  if (!active) await db.setCohortActive(cohort.id, false);
  return cohort;
}

describe('cohort codes', () => {
  it('are six characters from an alphabet without look-alikes', () => {
    expect(COHORT_ALPHABET).not.toMatch(/[01OIL]/);
    for (let index = 0; index < 200; index += 1) {
      const code = generateCohortCode();
      expect(code).toMatch(new RegExp(`^[${COHORT_ALPHABET}]{6}$`));
    }
  });

  it('are compared without case, spaces or hyphens', () => {
    expect(normalizeCohortCode(' abc-234 ')).toBe('ABC234');
    expect(normalizeCohortCode('ab c2 34')).toBe('ABC234');
    expect(normalizeCohortCode('ABC23O')).toBeNull(); // O is not in the alphabet
    expect(normalizeCohortCode('ABC2345')).toBeNull();
    expect(normalizeCohortCode(42)).toBeNull();
    expect(rawCohortCode(' wrong code\u0000! ')).toBe('WRONGCODE!');
    expect(rawCohortCode('')).toBeNull();
    expect(rawCohortCode(7)).toBeNull();
  });

  it('are unique: a clash makes a new code, and gives up after several tries', async () => {
    const db = createMemoryDb();
    await addCohort(db, 'apt', 'First', 'AAAAAA');
    let calls = 0;
    const second = await createCohort(db, { quizId: 'apt', label: 'Second', randomIndex: () => (calls++ < 6 ? 0 : 1) });
    expect(second.code).toBe('BBBBBB');
    await expect(createCohort(db, { quizId: 'apt', label: 'Third', randomIndex: () => 0 })).rejects.toThrow(/unique/);
  });

  it('parse the cohort filter', () => {
    expect(parseCohortParam(null)).toEqual({ mode: 'all', code: null });
    expect(parseCohortParam('none')).toEqual({ mode: 'none', code: null });
    expect(parseCohortParam('abc234')).toEqual({ mode: 'code', code: 'ABC234' });
    expect(parseCohortParam('nope!')).toHaveProperty('error');
  });
});

describe('GET /api/cohort (public check)', () => {
  async function setup() {
    const db = createMemoryDb();
    await addCohort(db, 'apt', 'NLCI Nov 2026', 'ABC234');
    await addCohort(db, 'apt', 'Old group', 'DEF567', false);
    await addCohort(db, 'req', 'Other quiz', 'GHJ892');
    return { db, handler: createCohortCheckHandler({ db: () => db }) };
  }

  it('accepts an active code for the quiz, in any case and with spaces', async () => {
    const { handler } = await setup();
    const response = await call(handler, fakeRequest({ url: '/api/cohort?quiz=apt&code=%20abc%20234%20' }));
    expect(response.status).toBe(200);
    expect(response.json).toEqual({ ok: true, code: 'ABC234', label: 'NLCI Nov 2026' });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('gives the same 404 for an unknown, inactive or other-quiz code', async () => {
    const { handler } = await setup();
    const answers = [];
    for (const code of ['ZZZ999', 'DEF567', 'GHJ892']) {
      const response = await call(handler, fakeRequest({ url: `/api/cohort?quiz=apt&code=${code}` }));
      expect(response.status).toBe(404);
      expect(response.json.label).toBeUndefined();
      answers.push(response.json.error);
    }
    expect(new Set(answers).size).toBe(1);
  });

  it('refuses something that is not a code, a bad quiz name and other methods', async () => {
    const { handler } = await setup();
    expect((await call(handler, fakeRequest({ url: '/api/cohort?quiz=apt&code=hello' }))).status).toBe(400);
    expect((await call(handler, fakeRequest({ url: '/api/cohort?quiz=../x&code=ABC234' }))).status).toBe(400);
    expect((await call(handler, fakeRequest({ method: 'POST', url: '/api/cohort?quiz=apt&code=ABC234' }))).status).toBe(405);
  });
});

describe('/api/cohorts (facilitators)', () => {
  it('needs the facilitator password', async () => {
    const db = createMemoryDb();
    const handler = cohortsHandler(db);
    expect((await call(handler, fakeRequest({ url: '/api/cohorts?quiz=apt' }))).status).toBe(401);
    const post = jsonRequest({ quizId: 'apt', label: 'X' });
    post.url = '/api/cohorts';
    expect((await call(handler, post)).status).toBe(401);
    expect(db.cohorts.size).toBe(0);
    const unset = cohortsHandler(db, { env: {} });
    expect((await call(unset, fakeRequest({ url: '/api/cohorts?quiz=apt', headers: auth }))).status).toBe(503);
  });

  it('creates, lists with counts, deactivates and reactivates', async () => {
    const db = createMemoryDb();
    const handler = cohortsHandler(db, { now: () => new Date('2026-11-25T10:00:00Z') });
    const created = await call(handler, jsonRequest({ quizId: 'apt', label: '  NLCI <Nov> 2026 ' }, auth));
    expect(created.status).toBe(201);
    const { cohort } = created.json;
    expect(cohort).toMatchObject({ label: 'NLCI <Nov> 2026', quizId: 'apt', active: true, submissionCount: 0 });
    expect(normalizeCohortCode(cohort.code)).toBe(cohort.code);

    await db.insertSubmission({ id: 's1', quizId: 'apt', submittedAt: '2026-11-25T11:00:00Z', cohortCode: cohort.code, cohortId: cohort.id });
    const list = await call(handler, fakeRequest({ url: '/api/cohorts?quiz=apt', headers: auth }));
    expect(list.status).toBe(200);
    expect(list.json.cohorts).toEqual([expect.objectContaining({ code: cohort.code, submissionCount: 1 })]);

    const off = await call(handler, fakeRequest({ method: 'PATCH', url: `/api/cohorts?id=${cohort.id}`, headers: { ...auth, 'Content-Type': 'application/json' }, body: { active: false } }));
    expect(off.status).toBe(200);
    expect(off.json.cohort.active).toBe(false);
    const on = await call(handler, fakeRequest({ method: 'PATCH', url: `/api/cohorts?id=${cohort.id}`, headers: { ...auth, 'Content-Type': 'application/json' }, body: { active: true } }));
    expect(on.json.cohort.active).toBe(true);
  });

  it('refuses a missing label, an unknown quiz, a quiz without cohort codes and a bad update', async () => {
    const db = createMemoryDb();
    const handler = cohortsHandler(db);
    expect((await call(handler, jsonRequest({ quizId: 'apt', label: '   ' }, auth))).status).toBe(400);
    expect((await call(handler, jsonRequest({ quizId: 'nope', label: 'A' }, auth))).status).toBe(404);
    const off = await call(handler, jsonRequest({ quizId: 'off', label: 'A' }, auth));
    expect(off.status).toBe(400);
    expect(off.json.error).toMatch(/cohortCodes/);
    const patch = await call(handler, fakeRequest({ method: 'PATCH', url: '/api/cohorts?id=6f1c8d1e-1111-4111-8111-111111111111', headers: { ...auth, 'Content-Type': 'application/json' }, body: { active: 'no' } }));
    expect(patch.status).toBe(400);
    const missing = await call(handler, fakeRequest({ method: 'PATCH', url: '/api/cohorts?id=6f1c8d1e-1111-4111-8111-111111111111', headers: { ...auth, 'Content-Type': 'application/json' }, body: { active: false } }));
    expect(missing.status).toBe(404);
    expect(db.cohorts.size).toBe(0);
  });
});

describe('submissions with a cohort code (never refused because of it)', () => {
  const ID = '1b4e28ba-2fa1-4d2b-883f-0016d3cca427';
  async function setup() {
    const db = createMemoryDb();
    const active = await addCohort(db, 'apt', 'NLCI Nov 2026', 'ABC234');
    await addCohort(db, 'apt', 'Old group', 'DEF567', false);
    await addCohort(db, 'req', 'Other quiz', 'GHJ892');
    const handler = createSubmitHandler({ db: () => db, loadQuiz, now: () => new Date('2026-11-25T10:00:00Z') });
    return { db, handler, active };
  }
  const body = (quizId, cohortCode) => ({
    id: ID, quizId, quizVersion: quizzes.apt.version, name: 'Asha', startedAt: Date.parse('2026-11-25T09:30:00Z'),
    timeTakenSeconds: 60, selections: { 1: 'B' }, ...(cohortCode === undefined ? {} : { cohortCode }),
  });

  it.each([
    ['a valid code (any case)', 'apt', ' abc-234 ', 'ABC234', true],
    ['an unknown code', 'apt', 'zzz999', 'ZZZ999', false],
    ['an inactive code', 'apt', 'DEF567', 'DEF567', false],
    ["another quiz's code", 'apt', 'GHJ892', 'GHJ892', false],
    ['text that is not a code', 'apt', 'my group!', 'MYGROUP!', false],
    ['no code', 'apt', undefined, null, false],
    ['a code that is not text', 'apt', 12345, null, false],
    ['a code for a quiz without cohort codes', 'off', 'ABC234', null, false],
  ])('stores %s', async (label, quizId, sent, storedCode, hasCohort) => {
    const { db, handler, active } = await setup();
    const response = await call(handler, jsonRequest(body(quizId, sent)));
    expect(response.status).toBe(201);
    expect(response.json.cohort).toBe(hasCohort);
    expect(response.json.cohortLabel).toBe(hasCohort ? 'NLCI Nov 2026' : null);
    const stored = db.rows.get(ID);
    expect(stored.cohortCode).toBe(storedCode);
    expect(stored.cohortId).toBe(hasCohort ? active.id : null);
  });

  it('answers a retry with the cohort stored the first time, even if the code was deactivated since', async () => {
    const { db, handler, active } = await setup();
    await call(handler, jsonRequest(body('apt', 'ABC234')));
    await db.setCohortActive(active.id, false);
    const retry = await call(handler, jsonRequest(body('apt', 'ABC234')));
    expect(retry.status).toBe(200);
    expect(retry.json).toMatchObject({ duplicate: true, cohort: true, cohortLabel: 'NLCI Nov 2026' });
  });

  it('filters the results list by cohort and shows its label', async () => {
    const { db, handler } = await setup();
    await call(handler, jsonRequest(body('apt', 'abc234')));
    await call(handler, jsonRequest({ ...body('apt', 'ZZZ999'), id: '2b4e28ba-2fa1-4d2b-883f-0016d3cca427', name: 'Ben' }));
    const results = createResultsHandler({ db: () => db, env });
    const inCohort = await call(results, fakeRequest({ url: '/api/results?quiz=apt&cohort=abc234', headers: auth }));
    expect(inCohort.json.submissions.map((row) => [row.name, row.cohortLabel])).toEqual([['Asha', 'NLCI Nov 2026']]);
    const none = await call(results, fakeRequest({ url: '/api/results?quiz=apt&cohort=none', headers: auth }));
    expect(none.json.submissions.map((row) => [row.name, row.cohortCode, row.cohortLabel])).toEqual([['Ben', 'ZZZ999', null]]);
    const all = await call(results, fakeRequest({ url: '/api/results?quiz=apt', headers: auth }));
    expect(all.json.submissions).toHaveLength(2);
    expect((await call(results, fakeRequest({ url: '/api/results?quiz=apt&cohort=bad!', headers: auth }))).status).toBe(400);
  });
});
