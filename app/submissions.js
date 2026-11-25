// Sending a participant's answers to the facilitators (quizzes with
// meta.json "collectResults": true). Each submission gets an id made in the
// browser, so sending it twice stores it once. It is kept in an outbox in
// localStorage until the server accepts it, and the outbox is retried whenever
// a page of the app loads. Every storage access is wrapped in try/catch.

import { cleanTypedText } from './utils.js';

export const OUTBOX_KEY = 'quizzer:outbox';
export const SUBMIT_URL = 'api/submit';
const OUTBOX_LIMIT = 20;
const NAME_MAX_LENGTH = 80;

// A random version 4 UUID: crypto.randomUUID where available, otherwise
// crypto.getRandomValues, otherwise Math.random (old browsers).
export function createSubmissionId(cryptoObject = globalThis.crypto, randomFn = Math.random) {
  if (cryptoObject && typeof cryptoObject.randomUUID === 'function') {
    try {
      return cryptoObject.randomUUID();
    } catch {
      // Not allowed here (for example an insecure origin); fall through.
    }
  }
  const bytes = new Uint8Array(16);
  if (cryptoObject && typeof cryptoObject.getRandomValues === 'function') {
    cryptoObject.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(randomFn() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// The request body for POST /api/submit. `quizVersion` is the fingerprint of
// the questions the participant took (quizFingerprint in progress.js).
export function buildSubmission({ id, quizId, quizVersion, name, startedAt, timeTakenSeconds, selections, timeSpent, optionOrders }) {
  const submission = {
    id,
    quizId,
    quizVersion,
    name: Array.from(cleanTypedText(name).trim()).slice(0, NAME_MAX_LENGTH).join('').trim(),
    startedAt,
    timeTakenSeconds: Math.max(0, Math.round(Number(timeTakenSeconds) || 0)),
    selections: { ...(selections || {}) },
    timeSpent: {},
  };
  for (const [questionId, ms] of Object.entries(timeSpent || {})) {
    if (Number.isFinite(ms) && ms >= 0) submission.timeSpent[questionId] = Math.round(ms);
  }
  if (optionOrders && Object.keys(optionOrders).length > 0) submission.optionOrders = { ...optionOrders };
  return submission;
}

export function readOutbox(storage) {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(OUTBOX_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((entry) => entry && typeof entry === 'object' && entry.submission && typeof entry.submission.id === 'string')
      : [];
  } catch {
    return [];
  }
}

function writeOutbox(storage, entries) {
  if (!storage) return false;
  try {
    if (entries.length === 0) storage.removeItem(OUTBOX_KEY);
    else storage.setItem(OUTBOX_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

// Adds (or replaces, by id) a submission; the oldest are dropped beyond OUTBOX_LIMIT.
export function enqueueSubmission(storage, submission, now = Date.now()) {
  const entries = readOutbox(storage).filter((entry) => entry.submission.id !== submission.id);
  entries.push({ submission, queuedAt: now });
  return writeOutbox(storage, entries.slice(-OUTBOX_LIMIT));
}

export function removeSubmission(storage, id) {
  const entries = readOutbox(storage);
  const remaining = entries.filter((entry) => entry.submission.id !== id);
  if (remaining.length !== entries.length) writeOutbox(storage, remaining);
}

// 'sent': stored (2xx). 'rejected': our server refused it for good (a 4xx with
// its JSON error body); it will never succeed, so it leaves the outbox.
// 'retry': anything else (network error, 5xx, 408/429, or a 4xx that did not
// come from our server, such as a plain static server without /api): kept.
export function classifyResponse(status, body) {
  if (status >= 200 && status < 300) return 'sent';
  const fromOurServer = body !== null && typeof body === 'object' && body.ok === false;
  if (status >= 400 && status < 500 && status !== 408 && status !== 429 && fromOurServer) return 'rejected';
  return 'retry';
}

export async function postSubmission(submission, fetchFn = globalThis.fetch, url = SUBMIT_URL) {
  let response;
  try {
    response = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
      credentials: 'same-origin',
    });
  } catch (error) {
    return { outcome: 'retry', status: 0, error: error && error.message ? error.message : String(error) };
  }
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { outcome: classifyResponse(response.status, body), status: response.status, body };
}

const inFlight = new Map();

// Sends one submission (it should already be in the outbox) and updates the
// outbox: removed when sent or rejected, kept otherwise. Concurrent calls for
// the same id share one request.
export function sendSubmission(storage, submission, fetchFn = globalThis.fetch, url = SUBMIT_URL) {
  if (inFlight.has(submission.id)) return inFlight.get(submission.id);
  const request = postSubmission(submission, fetchFn, url)
    .then((result) => {
      if (result.outcome === 'rejected') {
        console.warn(`Results ${submission.id} were refused by the server and will not be retried:`, result.body && result.body.error);
      }
      if (result.outcome !== 'retry') removeSubmission(storage, submission.id);
      return result;
    })
    .finally(() => inFlight.delete(submission.id));
  inFlight.set(submission.id, request);
  return request;
}

// Retries everything in the outbox, one after another. Resolves to { id: outcome }.
export async function flushOutbox(storage, fetchFn = globalThis.fetch, url = SUBMIT_URL) {
  const outcomes = {};
  for (const entry of readOutbox(storage)) {
    const result = await sendSubmission(storage, entry.submission, fetchFn, url);
    outcomes[entry.submission.id] = result.outcome;
  }
  return outcomes;
}
