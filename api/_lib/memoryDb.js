// An in-memory store with the same interface as createNeonDb (see db.js), for tests.
import { LIST_LIMIT } from './db.js';

export function createMemoryDb() {
  const rows = new Map();
  const copy = (value) => JSON.parse(JSON.stringify(value));

  return {
    rows,
    async insertSubmission(record) {
      if (rows.has(record.id)) return { inserted: false };
      rows.set(record.id, copy(record));
      return { inserted: true };
    },
    async listSubmissions({ quizId, from = null, to = null }) {
      return [...rows.values()]
        .filter((row) => row.quizId === quizId)
        .filter((row) => !from || row.submittedAt >= new Date(from).toISOString())
        .filter((row) => !to || row.submittedAt < new Date(to).toISOString())
        .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
        .slice(0, LIST_LIMIT)
        .map(({ answers, ...row }) => copy(row));
    },
    async getSubmission(id) {
      return rows.has(id) ? copy(rows.get(id)) : null;
    },
    async listQuizIds() {
      return [...new Set([...rows.values()].map((row) => row.quizId))].sort();
    },
    async deleteSubmission(id) {
      return rows.delete(id);
    },
  };
}
