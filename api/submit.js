// POST /api/submit: a participant's answers to a quiz with "collectResults": true.
// The answers are re-graded here from the quiz files; the browser's own score
// is never trusted. Stored: the name, times, score, score per skill and the
// answers, and the cohort code typed (with its cohort when the code is active for
// this quiz). Not stored: IP address, user agent or anything else about the device.
// A cohort code never makes a submission fail: an unknown or inactive code is
// stored as typed, without a cohort, so results are never lost.
import { summarizeSubmission } from '../app/grading.js';
import { getDb } from './_lib/db.js';
import { activeCohortFor, rawCohortCode } from './_lib/cohorts.js';
import { HttpError, readJsonBody, sendError, sendJson } from './_lib/http.js';
import { loadQuizFromFiles } from './_lib/quizFiles.js';
import { checkEnvelope, checkSubmission } from './_lib/submission.js';

export const BODY_LIMIT_BYTES = 100 * 1024;

export function createSubmitHandler({
  db: getStore = () => getDb(),
  loadQuiz = (quizId) => loadQuizFromFiles(quizId),
  now = () => new Date(),
} = {}) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      sendError(res, 405, 'Use POST.', { Allow: 'POST' });
      return;
    }
    try {
      const body = await readJsonBody(req, BODY_LIMIT_BYTES);
      const { id, quizId, quizVersion } = checkEnvelope(body);

      let quiz;
      try {
        quiz = await loadQuiz(quizId);
      } catch (error) {
        console.error(`Quiz "${quizId}" could not be loaded:`, error);
        sendError(res, 500, 'The quiz could not be loaded on the server.');
        return;
      }
      if (!quiz) throw new HttpError(404, `There is no quiz "${quizId}".`);
      if (quiz.meta.collectResults !== true) throw new HttpError(403, `The quiz "${quizId}" does not collect results.`);

      const submittedAt = now();
      const submission = checkSubmission(body, quiz.questions, quiz.version, submittedAt);
      const graded = summarizeSubmission(quiz.meta, quiz.questions, submission.selections, submission.timeSpent, submission.optionOrders);

      const store = getStore();
      if (!store) {
        console.error('No database configured: set DATABASE_URL (Neon) for this deployment.');
        sendError(res, 503, 'Results cannot be stored at the moment.');
        return;
      }
      let cohortCode = null;
      let cohortId = null;
      let cohortLabel = null;
      if (quiz.meta.cohortCodes !== 'off') {
        cohortCode = rawCohortCode(body.cohortCode);
        const cohort = cohortCode ? await activeCohortFor(store, quizId, cohortCode) : null;
        if (cohort) {
          cohortCode = cohort.code;
          cohortId = cohort.id;
          cohortLabel = cohort.label;
        }
      }
      const record = {
        id,
        quizId,
        quizVersion, // the version the participant took
        quizChanged: submission.quizChanged, // it differs from the deployed one; answers that no longer fit were left out
        name: submission.name,
        startedAt: submission.startedAt,
        submittedAt: submittedAt.toISOString(),
        timeTakenSeconds: submission.timeTakenSeconds,
        score: graded.score,
        total: graded.total,
        skills: graded.skills,
        answers: graded.answers,
        cohortCode,
        cohortId,
      };
      const { inserted } = await store.insertSubmission(record);
      if (!inserted) {
        // Sent again (a retry): answer with the cohort it was stored with the first time.
        const stored = store.getSubmission ? await store.getSubmission(id) : null;
        if (stored) {
          cohortId = stored.cohortId ?? null;
          cohortLabel = stored.cohortLabel ?? null;
        }
      }
      // `cohort` / `cohortLabel`: whether the results were stored with a cohort, so
      // the results screen shows the cohort the server accepted, not what was typed.
      sendJson(res, inserted ? 201 : 200, {
        ok: true, id, score: graded.score, total: graded.total, duplicate: !inserted, quizChanged: submission.quizChanged,
        cohort: cohortId !== null, cohortLabel: cohortId !== null ? cohortLabel : null,
      });
    } catch (error) {
      if (error instanceof HttpError) {
        sendError(res, error.status, error.message);
      } else {
        console.error('Submission failed:', error);
        sendError(res, 500, 'The results could not be stored. Please try again later.');
      }
    }
  };
}

export default createSubmitHandler();
