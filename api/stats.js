// GET /api/stats?quiz=<id>[&cohort=<code>|none][&from=<date>&to=<date>]:
// statistics per question for facilitators (same password as /api/results),
// computed here from the stored answers; see api/_lib/stats.js for what is counted.
import { STATS_LIMIT, getDb } from './_lib/db.js';
import { parseDateParam, requireFacilitator } from './_lib/auth.js';
import { queryParams, sendError, sendJson } from './_lib/http.js';
import { loadQuizFromFiles } from './_lib/quizFiles.js';
import { computeStats } from './_lib/stats.js';
import { parseCohortParam } from './_lib/cohorts.js';
import { QUIZ_ID_PATTERN } from './_lib/submission.js';

export function createStatsHandler({
  db: getStore = () => getDb(),
  env = process.env,
  loadQuiz = (quizId) => loadQuizFromFiles(quizId),
} = {}) {
  return async function handler(req, res) {
    if (req.method !== 'GET') {
      sendError(res, 405, 'Use GET.', { Allow: 'GET' });
      return;
    }
    if (!requireFacilitator(req, res, env)) return;
    const store = getStore();
    if (!store) {
      sendError(res, 503, 'No database is configured for this deployment (DATABASE_URL).');
      return;
    }

    const params = queryParams(req);
    const quizId = params.get('quiz') || '';
    if (!QUIZ_ID_PATTERN.test(quizId)) {
      sendError(res, 400, '"quiz" is not a valid quiz name.');
      return;
    }
    const from = parseDateParam(params.get('from'), 'from');
    const to = parseDateParam(params.get('to'), 'to');
    const cohort = parseCohortParam(params.get('cohort'));
    const error = from.error || to.error || cohort.error;
    if (error) {
      sendError(res, 400, error);
      return;
    }

    try {
      let quiz;
      try {
        quiz = await loadQuiz(quizId);
      } catch (loadError) {
        console.error(`Quiz "${quizId}" could not be loaded:`, loadError);
        sendError(res, 500, 'The quiz could not be loaded on the server.');
        return;
      }
      if (!quiz) {
        sendError(res, 404, `There is no quiz "${quizId}".`);
        return;
      }
      const { rows, excluded } = await store.listStatsRows({ quizId, version: quiz.version, from: from.value, to: to.value, cohort });
      const stats = computeStats(quiz, rows, { alreadyExcluded: excluded });
      // `truncated`: the limit was reached, so only the newest STATS_LIMIT submissions are counted.
      sendJson(res, 200, { ok: true, quiz: quizId, limit: STATS_LIMIT, truncated: rows.length >= STATS_LIMIT, ...stats });
    } catch (failure) {
      console.error('Statistics request failed:', failure);
      sendError(res, 500, 'The statistics could not be computed. Please try again later.');
    }
  };
}

export default createStatsHandler();
