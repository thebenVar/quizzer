// GET /api/results?quiz=<id>[&from=<date>&to=<date>]: a quiz's submissions
//   without their answers, newest first (at most LIST_LIMIT), and the ids of
//   every quiz with submissions. `from` is inclusive, `to` exclusive (ISO dates or date-times).
// GET /api/results?id=<submission id>: one submission with its answers.
// DELETE /api/results?id=<submission id>: deletes one submission.
// All need "Authorization: Bearer <password>" matching FACILITATOR_PASSWORD, the
// password percent-encoded (encodeURIComponent) so any characters can be sent in
// a header; a plain ASCII password without "%" is sent as is. Without
// FACILITATOR_PASSWORD every request is refused.
import { createHash, timingSafeEqual } from 'node:crypto';
import { LIST_LIMIT, getDb } from './_lib/db.js';
import { header, queryParams, sendError, sendJson } from './_lib/http.js';
import { QUIZ_ID_PATTERN, UUID_PATTERN } from './_lib/submission.js';

// Compares the two passwords in constant time (hashing first makes the lengths equal).
export function passwordMatches(given, expected) {
  if (typeof expected !== 'string' || expected === '' || typeof given !== 'string') return false;
  const left = createHash('sha256').update(given, 'utf8').digest();
  const right = createHash('sha256').update(expected, 'utf8').digest();
  return timingSafeEqual(left, right);
}

// The password from "Bearer <password>": everything after the first space, so
// a password's own leading spaces are kept; percent-decoded.
export function bearerToken(req) {
  const value = String(header(req, 'authorization') || '');
  if (value.slice(0, 7).toLowerCase() !== 'bearer ') return null;
  try {
    return decodeURIComponent(value.slice(7));
  } catch {
    return null;
  }
}

function parseDateParam(value, name) {
  if (value === null || value === '') return { value: null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { error: `"${name}" must be a date (YYYY-MM-DD) or an ISO date-time.` };
  return { value: date.toISOString() };
}

export function createResultsHandler({
  db: getStore = () => getDb(),
  env = process.env,
} = {}) {
  return async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'DELETE') {
      sendError(res, 405, 'Use GET or DELETE.', { Allow: 'GET, DELETE' });
      return;
    }

    const expected = env.FACILITATOR_PASSWORD;
    if (typeof expected !== 'string' || expected === '') {
      sendError(res, 503, 'The results page is not set up: FACILITATOR_PASSWORD is not configured.');
      return;
    }
    const token = bearerToken(req);
    if (!token || !passwordMatches(token, expected)) {
      sendError(res, 401, 'Wrong password.', { 'WWW-Authenticate': 'Bearer' });
      return;
    }

    const store = getStore();
    if (!store) {
      sendError(res, 503, 'No database is configured for this deployment (DATABASE_URL).');
      return;
    }

    const params = queryParams(req);
    try {
      if (req.method === 'DELETE') {
        const id = params.get('id') || '';
        if (!UUID_PATTERN.test(id)) {
          sendError(res, 400, '"id" must be a submission id.');
          return;
        }
        const deleted = await store.deleteSubmission(id.toLowerCase());
        if (!deleted) {
          sendError(res, 404, 'No such submission.');
          return;
        }
        sendJson(res, 200, { ok: true, id: id.toLowerCase() });
        return;
      }

      const submissionId = params.get('id');
      if (submissionId !== null) {
        if (!UUID_PATTERN.test(submissionId)) {
          sendError(res, 400, '"id" must be a submission id.');
          return;
        }
        const submission = await store.getSubmission(submissionId.toLowerCase());
        if (!submission) {
          sendError(res, 404, 'No such submission.');
          return;
        }
        sendJson(res, 200, { ok: true, submission });
        return;
      }

      const quizId = params.get('quiz');
      if (quizId !== null && quizId !== '' && !QUIZ_ID_PATTERN.test(quizId)) {
        sendError(res, 400, '"quiz" is not a valid quiz name.');
        return;
      }
      const from = parseDateParam(params.get('from'), 'from');
      const to = parseDateParam(params.get('to'), 'to');
      const dateError = from.error || to.error;
      if (dateError) {
        sendError(res, 400, dateError);
        return;
      }

      const quizIds = await store.listQuizIds();
      const submissions = quizId ? await store.listSubmissions({ quizId, from: from.value, to: to.value }) : [];
      sendJson(res, 200, { ok: true, quizIds, quiz: quizId || null, submissions, limit: LIST_LIMIT, truncated: submissions.length >= LIST_LIMIT });
    } catch (error) {
      console.error('Results request failed:', error);
      sendError(res, 500, 'The results could not be read. Please try again later.');
    }
  };
}

export default createResultsHandler();
