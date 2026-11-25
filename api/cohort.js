// GET /api/cohort?quiz=<id>&code=<code>: checks a cohort code typed on the
// start screen. { ok: true, label, code } when the code is active for that
// quiz; otherwise 400 (not a code at all) or 404 (the same answer for an
// unknown code, an inactive one or one for another quiz, so nothing leaks).
// Public: no password. Nothing is listed.
import { getDb } from './_lib/db.js';
import { activeCohortFor, normalizeCohortCode } from './_lib/cohorts.js';
import { queryParams, sendError, sendJson } from './_lib/http.js';
import { QUIZ_ID_PATTERN } from './_lib/submission.js';

export function createCohortCheckHandler({ db: getStore = () => getDb() } = {}) {
  return async function handler(req, res) {
    if (req.method !== 'GET') {
      sendError(res, 405, 'Use GET.', { Allow: 'GET' });
      return;
    }
    const params = queryParams(req);
    const quizId = params.get('quiz') || '';
    if (!QUIZ_ID_PATTERN.test(quizId)) {
      sendError(res, 400, '"quiz" is not a valid quiz name.');
      return;
    }
    const code = normalizeCohortCode(params.get('code') || '');
    if (!code) {
      sendError(res, 400, 'That is not a cohort code (6 letters and digits).');
      return;
    }
    const store = getStore();
    if (!store) {
      sendError(res, 503, 'Cohort codes cannot be checked at the moment.');
      return;
    }
    try {
      const cohort = await activeCohortFor(store, quizId, code);
      if (!cohort) {
        sendError(res, 404, 'This code is not valid for this quiz.');
        return;
      }
      sendJson(res, 200, { ok: true, code: cohort.code, label: cohort.label });
    } catch (error) {
      console.error('Cohort check failed:', error);
      sendError(res, 500, 'The code could not be checked. Please try again later.');
    }
  };
}

export default createCohortCheckHandler();
