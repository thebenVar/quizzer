// Cohort codes for facilitators (same password as /api/results):
// GET   /api/cohorts?quiz=<id>      the quiz's cohorts, newest first, with the number of submissions
// POST  /api/cohorts                { quizId, label } -> a new cohort with a code made here
// PATCH /api/cohorts?id=<cohort id> { active: true | false } -> deactivates or reactivates
// A quiz must exist and have "cohortCodes" set to "optional" or "required".
import { getDb } from './_lib/db.js';
import { requireFacilitator } from './_lib/auth.js';
import { cleanCohortLabel, createCohort } from './_lib/cohorts.js';
import { HttpError, queryParams, readJsonBody, sendError, sendJson } from './_lib/http.js';
import { loadQuizFromFiles } from './_lib/quizFiles.js';
import { QUIZ_ID_PATTERN, UUID_PATTERN } from './_lib/submission.js';

const BODY_LIMIT_BYTES = 4 * 1024;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function createCohortsHandler({
  db: getStore = () => getDb(),
  env = process.env,
  loadQuiz = (quizId) => loadQuizFromFiles(quizId),
  now = () => new Date(),
} = {}) {
  return async function handler(req, res) {
    if (!['GET', 'POST', 'PATCH'].includes(req.method)) {
      sendError(res, 405, 'Use GET, POST or PATCH.', { Allow: 'GET, POST, PATCH' });
      return;
    }
    if (!requireFacilitator(req, res, env)) return;
    const store = getStore();
    if (!store) {
      sendError(res, 503, 'No database is configured for this deployment (DATABASE_URL).');
      return;
    }

    try {
      const params = queryParams(req);
      if (req.method === 'GET') {
        const quizId = params.get('quiz') || '';
        if (!QUIZ_ID_PATTERN.test(quizId)) throw new HttpError(400, '"quiz" is not a valid quiz name.');
        sendJson(res, 200, { ok: true, quiz: quizId, cohorts: await store.listCohorts(quizId) });
        return;
      }

      if (req.method === 'POST') {
        const body = await readJsonBody(req, BODY_LIMIT_BYTES);
        if (!isPlainObject(body)) throw new HttpError(400, 'The request body must be a JSON object.');
        const quizId = typeof body.quizId === 'string' ? body.quizId : '';
        if (!QUIZ_ID_PATTERN.test(quizId)) throw new HttpError(400, '"quizId" is not a valid quiz name.');
        const label = cleanCohortLabel(body.label);
        if (!label) throw new HttpError(400, 'Give the cohort a name (at most 80 characters), e.g. "NLCI Nov 2026".');
        const quiz = await loadQuiz(quizId);
        if (!quiz) throw new HttpError(404, `There is no quiz "${quizId}".`);
        if (quiz.meta.cohortCodes === 'off') {
          throw new HttpError(400, `The quiz "${quizId}" does not use cohort codes (set "cohortCodes" in its meta.json).`);
        }
        const cohort = await createCohort(store, { quizId, label, now: now() });
        sendJson(res, 201, { ok: true, cohort: { ...cohort, submissionCount: 0 } });
        return;
      }

      // PATCH
      const id = params.get('id') || '';
      if (!UUID_PATTERN.test(id)) throw new HttpError(400, '"id" must be a cohort id.');
      const body = await readJsonBody(req, BODY_LIMIT_BYTES);
      if (!isPlainObject(body) || typeof body.active !== 'boolean') throw new HttpError(400, 'Send { "active": true } or { "active": false }.');
      const cohort = await store.setCohortActive(id.toLowerCase(), body.active);
      if (!cohort) throw new HttpError(404, 'No such cohort.');
      sendJson(res, 200, { ok: true, cohort });
    } catch (error) {
      if (error instanceof HttpError) {
        sendError(res, error.status, error.message);
      } else {
        console.error('Cohorts request failed:', error);
        sendError(res, 500, 'The cohorts could not be read or changed. Please try again later.');
      }
    }
  };
}

export default createCohortsHandler();
