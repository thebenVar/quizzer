// The database setup looks at what exists first and runs only the DDL that is missing,
// so a cold start on an up-to-date database takes no table lock.
import { describe, expect, it } from 'vitest';

import { createNeonDb, readSchema } from '../api/_lib/db.js';

function fakeSql(schemaRow, failures = []) {
  const statements = [];
  const sql = async (strings) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    statements.push(text);
    if (text.startsWith('SELECT ARRAY(')) return schemaRow ? [schemaRow] : [];
    const failure = failures.find((item) => text.startsWith(item.startsWith) && !item.used);
    if (failure) {
      failure.used = true;
      throw Object.assign(new Error(failure.message), { code: failure.code });
    }
    return [];
  };
  return { sql, statements };
}

const ddl = (statements) => statements.filter((text) => /^(CREATE|ALTER)/.test(text));

const FULL = {
  tables: ['submissions', 'cohorts'],
  columns: ['id', 'quiz_id', 'cohort_code', 'cohort_id'],
  indexes: ['submissions_pkey', 'submissions_quiz_submitted', 'submissions_cohort'],
};

describe('database setup', () => {
  it('runs no DDL when everything is already there', async () => {
    const { sql, statements } = fakeSql(FULL);
    const db = createNeonDb('postgres://unused', { connect: async () => sql });
    await db.listQuizIds();
    await db.listQuizIds();
    expect(ddl(statements)).toEqual([]);
    expect(statements.filter((text) => text.startsWith('SELECT ARRAY('))).toHaveLength(1); // checked once per instance
  });

  it('on the production table from the first release, only adds the cohort parts', async () => {
    const { sql, statements } = fakeSql({ tables: ['submissions'], columns: ['id', 'quiz_id'], indexes: ['submissions_quiz_submitted'] });
    const db = createNeonDb('postgres://unused', { connect: async () => sql });
    await db.listQuizIds();
    const run = ddl(statements);
    expect(run).toHaveLength(4);
    expect(run[0]).toContain('ADD COLUMN IF NOT EXISTS cohort_code');
    expect(run[1]).toContain('ADD COLUMN IF NOT EXISTS cohort_id');
    expect(run[2]).toContain('CREATE TABLE IF NOT EXISTS cohorts');
    expect(run[3]).toContain('CREATE INDEX IF NOT EXISTS submissions_cohort');
    expect(run.some((text) => text.includes('TABLE IF NOT EXISTS submissions'))).toBe(false);
  });

  it('on an empty database creates everything, ignoring errors from a concurrent cold start', async () => {
    const { sql, statements } = fakeSql({ tables: [], columns: [], indexes: [] }, [
      { startsWith: 'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS cohort_code', code: '42701', message: 'column already exists' },
      { startsWith: 'CREATE TABLE IF NOT EXISTS cohorts', code: '23505', message: 'duplicate key value violates unique constraint "pg_type_typname_nsp_index"' },
    ]);
    const db = createNeonDb('postgres://unused', { connect: async () => sql });
    await expect(db.listQuizIds()).resolves.toEqual([]);
    expect(ddl(statements)).toHaveLength(6);
  });

  it('reads arrays whether or not the driver parsed them', async () => {
    const parsed = await readSchema(async () => [FULL]);
    expect(parsed.complete).toBe(true);
    const unparsed = await readSchema(async () => [{ tables: '{submissions,cohorts}', columns: '{cohort_code,cohort_id}', indexes: '{submissions_quiz_submitted,submissions_cohort}' }]);
    expect(unparsed.complete).toBe(true);
    const missing = await readSchema(async () => [{ tables: null, columns: null, indexes: null }]);
    expect(missing.complete).toBe(false);
  });
});
