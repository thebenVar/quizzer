// An in-memory store with the same interface as createNeonDb (see db.js), for tests.
import { LIST_LIMIT, STATS_LIMIT } from './db.js';

export function createMemoryDb() {
  const rows = new Map();
  const cohorts = new Map();
  const copy = (value) => JSON.parse(JSON.stringify(value));

  function withCohortLabel(row) {
    const cohort = row.cohortId ? cohorts.get(row.cohortId) : null;
    return { cohortCode: null, cohortId: null, ...row, cohortLabel: cohort ? cohort.label : null };
  }

  function matching({ quizId, from = null, to = null, cohort = null }) {
    const mode = cohort && cohort.mode ? cohort.mode : 'all';
    return [...rows.values()]
      .filter((row) => row.quizId === quizId)
      .filter((row) => !from || row.submittedAt >= new Date(from).toISOString())
      .filter((row) => !to || row.submittedAt < new Date(to).toISOString())
      .filter((row) => {
        if (mode === 'none') return !row.cohortId;
        if (mode === 'code') return Boolean(row.cohortId) && cohorts.get(row.cohortId)?.code === cohort.code;
        return true;
      })
      .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
  }

  return {
    rows,
    cohorts,
    async insertSubmission(record) {
      if (rows.has(record.id)) return { inserted: false };
      rows.set(record.id, copy({ cohortCode: null, cohortId: null, ...record }));
      return { inserted: true };
    },
    async listSubmissions(filter) {
      return matching(filter)
        .slice(0, LIST_LIMIT)
        .map(({ answers, ...row }) => copy(withCohortLabel(row)));
    },
    async listStatsRows(filter) {
      const all = matching(filter);
      return {
        rows: all
          .filter((row) => row.quizVersion === filter.version)
          .slice(0, STATS_LIMIT)
          .map((row) => copy({ id: row.id, quizVersion: row.quizVersion, score: row.score, skills: row.skills, answers: row.answers })),
        excluded: all.filter((row) => row.quizVersion !== filter.version).length,
      };
    },
    async getSubmission(id) {
      return rows.has(id) ? copy(withCohortLabel(rows.get(id))) : null;
    },
    async listQuizIds() {
      return [...new Set([...rows.values()].map((row) => row.quizId))].sort();
    },
    async deleteSubmission(id) {
      return rows.delete(id);
    },
    async createCohort(cohort) {
      if (cohorts.has(cohort.id) || [...cohorts.values()].some((item) => item.code === cohort.code)) return { created: false };
      cohorts.set(cohort.id, copy(cohort));
      return { created: true };
    },
    async findCohortByCode(code) {
      const found = [...cohorts.values()].find((item) => item.code === code);
      return found ? copy(found) : null;
    },
    async listCohorts(quizId) {
      return [...cohorts.values()]
        .filter((item) => item.quizId === quizId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map((item) => ({ ...copy(item), submissionCount: [...rows.values()].filter((row) => row.cohortId === item.id).length }));
    },
    async setCohortActive(id, active) {
      const cohort = cohorts.get(id);
      if (!cohort) return null;
      cohort.active = Boolean(active);
      return copy(cohort);
    },
  };
}
