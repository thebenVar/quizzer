// The browser's outbox of results for the facilitators: queue, send, retry, drop.
import { describe, expect, it, vi } from 'vitest';

import {
  OUTBOX_KEY,
  buildSubmission,
  classifyResponse,
  createSubmissionId,
  enqueueSubmission,
  flushOutbox,
  readOutbox,
  sendSubmission,
} from '../app/submissions.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function memoryStorage() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

function submission(id) {
  return buildSubmission({ id, quizId: 'cit-aptitude', quizVersion: '37-abc', name: 'Asha', startedAt: 1, timeTakenSeconds: 10, selections: { 1: 'B' }, timeSpent: { 1: 1500 } });
}

function respond(status, body) {
  return async () => ({ status, json: async () => { if (body === undefined) throw new SyntaxError('not JSON'); return body; } });
}

describe('submission ids', () => {
  it('uses crypto.randomUUID when available', () => {
    expect(createSubmissionId({ randomUUID: () => 'from-crypto' })).toBe('from-crypto');
  });

  it('falls back to getRandomValues, then to Math.random, still giving a v4 UUID', () => {
    const viaRandomValues = createSubmissionId({ getRandomValues: (bytes) => bytes.fill(255) });
    expect(viaRandomValues).toMatch(UUID);
    const viaMathRandom = createSubmissionId(undefined, () => 0.5);
    expect(viaMathRandom).toMatch(UUID);
    expect(createSubmissionId()).toMatch(UUID);
  });
});

describe('buildSubmission', () => {
  it('trims and cuts the name, rounds the times and leaves out empty option orders', () => {
    const built = buildSubmission({ id: 'x', quizId: 'q', name: `  ${'n'.repeat(100)} `, startedAt: 5, timeTakenSeconds: 10.6, selections: { a: 'A' }, timeSpent: { a: 1200.4, b: NaN } });
    expect(built.name).toHaveLength(80);
    expect(built.timeTakenSeconds).toBe(11);
    expect(built.timeSpent).toEqual({ a: 1200 });
    expect(built).not.toHaveProperty('optionOrders');
  });

  it('sends the quiz version and strips characters the server cannot store', () => {
    const built = buildSubmission({ id: 'x', quizId: 'q', quizVersion: '37-abc', name: 'A\u0000s\tha\uD800', startedAt: 5, timeTakenSeconds: 1, selections: {} });
    expect(built.quizVersion).toBe('37-abc');
    expect(built.name).toBe('As ha�');
  });
});

describe('outbox', () => {
  it('enqueues, replaces by id and survives unreadable storage', () => {
    const storage = memoryStorage();
    enqueueSubmission(storage, submission('a'));
    enqueueSubmission(storage, submission('b'));
    enqueueSubmission(storage, { ...submission('a'), name: 'Asha K' });
    expect(readOutbox(storage).map((entry) => entry.submission.id)).toEqual(['b', 'a']);
    expect(readOutbox(storage)[1].submission.name).toBe('Asha K');

    storage.setItem(OUTBOX_KEY, '{broken');
    expect(readOutbox(storage)).toEqual([]);
    const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() {} };
    expect(readOutbox(throwing)).toEqual([]);
    expect(enqueueSubmission(throwing, submission('c'))).toBe(false);
    expect(enqueueSubmission(null, submission('c'))).toBe(false);
  });

  it('keeps at most the 20 newest submissions', () => {
    const storage = memoryStorage();
    for (let index = 0; index < 25; index += 1) enqueueSubmission(storage, submission(`s${index}`));
    const ids = readOutbox(storage).map((entry) => entry.submission.id);
    expect(ids).toHaveLength(20);
    expect(ids[0]).toBe('s5');
  });

  it('classifies responses: 2xx sent, our 4xx rejected, everything else retried', () => {
    expect(classifyResponse(201, { ok: true })).toBe('sent');
    expect(classifyResponse(200, null)).toBe('sent');
    expect(classifyResponse(400, { ok: false, error: 'bad' })).toBe('rejected');
    expect(classifyResponse(403, { ok: false, error: 'closed' })).toBe('rejected');
    expect(classifyResponse(404, null)).toBe('retry'); // a static server without /api
    expect(classifyResponse(405, null)).toBe('retry');
    expect(classifyResponse(429, { ok: false })).toBe('retry');
    expect(classifyResponse(500, { ok: false })).toBe('retry');
    expect(classifyResponse(503, { ok: false })).toBe('retry');
  });

  it('removes a submission once the server accepts it', async () => {
    const storage = memoryStorage();
    const item = submission('a');
    enqueueSubmission(storage, item);
    const fetchFn = vi.fn(respond(201, { ok: true, id: 'a', score: 1, total: 40 }));
    const result = await sendSubmission(storage, item, fetchFn);
    expect(result.outcome).toBe('sent');
    expect(readOutbox(storage)).toEqual([]);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('api/submit');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual(item);
  });

  it('drops a submission the server refuses for good (4xx), and logs it', async () => {
    const storage = memoryStorage();
    const item = submission('a');
    enqueueSubmission(storage, item);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await sendSubmission(storage, item, respond(400, { ok: false, error: 'Unknown field' }));
    expect(result.outcome).toBe('rejected');
    expect(readOutbox(storage)).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('keeps a submission on a network error, a 5xx or a static server without /api', async () => {
    const storage = memoryStorage();
    const item = submission('a');
    enqueueSubmission(storage, item);
    const offline = async () => { throw new TypeError('Failed to fetch'); };
    expect((await sendSubmission(storage, item, offline)).outcome).toBe('retry');
    expect((await sendSubmission(storage, item, respond(503, { ok: false, error: 'down' }))).outcome).toBe('retry');
    expect((await sendSubmission(storage, item, respond(404))).outcome).toBe('retry');
    expect(readOutbox(storage).map((entry) => entry.submission.id)).toEqual(['a']);
  });

  it('retries the whole outbox, keeping only what still failed', async () => {
    const storage = memoryStorage();
    for (const id of ['a', 'b', 'c']) enqueueSubmission(storage, submission(id));
    const fetchFn = vi.fn(async (url, init) => {
      const { id } = JSON.parse(init.body);
      if (id === 'a') return { status: 201, json: async () => ({ ok: true }) };
      if (id === 'b') return { status: 400, json: async () => ({ ok: false, error: 'bad' }) };
      throw new TypeError('offline');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const outcomes = await flushOutbox(storage, fetchFn);
    warn.mockRestore();
    expect(outcomes).toEqual({ a: 'sent', b: 'rejected', c: 'retry' });
    expect(readOutbox(storage).map((entry) => entry.submission.id)).toEqual(['c']);
  });

  it('sends a submission once when it is retried while already being sent', async () => {
    const storage = memoryStorage();
    const item = submission('a');
    enqueueSubmission(storage, item);
    let release;
    const fetchFn = vi.fn(() => new Promise((resolve) => { release = () => resolve({ status: 201, json: async () => ({ ok: true }) }); }));
    const first = sendSubmission(storage, item, fetchFn);
    const second = sendSubmission(storage, item, fetchFn);
    release();
    expect((await first).outcome).toBe('sent');
    expect((await second).outcome).toBe('sent');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
