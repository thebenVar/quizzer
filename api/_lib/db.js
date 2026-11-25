// Where submissions and cohorts are stored: Neon Postgres, through
// @neondatabase/serverless. The connection string comes from DATABASE_URL (set by
// Vercel's Neon integration) or POSTGRES_URL. The tables are created, and new
// columns added, on first use; every statement is additive and safe to run on
// the existing production tables (IF NOT EXISTS), and errors from two cold
// starts doing it at the same moment are ignored.
//
// A store has these methods (memoryDb.js has the same interface, for tests):
//   insertSubmission(record)          -> { inserted: boolean }  (false when the id already exists)
//   listSubmissions({ quizId, from, to, cohort }) -> [record without answers], newest first, at most LIST_LIMIT
//   listStatsRows({ quizId, version, from, to, cohort }) -> { rows: [{ id, quizVersion, score, skills, answers }] of that version, newest first, at most STATS_LIMIT; excluded: count of other versions }
//   getSubmission(id)                 -> record with answers, or null
//   listQuizIds()                     -> [quizId] that have submissions
//   deleteSubmission(id)              -> boolean (whether a row was deleted)
//   createCohort(cohort)              -> { created: boolean } (false when the code is taken)
//   findCohortByCode(code)            -> cohort or null
//   listCohorts(quizId)               -> [cohort with submissionCount], newest first
//   setCohortActive(id, active)       -> cohort or null
// A submission record is { id, quizId, quizVersion, quizChanged, name, startedAt,
// submittedAt, timeTakenSeconds, score, total, skills, answers, cohortCode,
// cohortId } (times as ISO strings); listed ones also carry cohortLabel.
// A cohort is { id, code, label, quizId, active, createdAt }.
// `cohort` filters: { mode: 'all' } | { mode: 'none' } (no valid cohort) | { mode: 'code', code }.

// A list row without answers is about 1 KB, so 2000 rows stay well under
// Vercel's 4.5 MB response limit.
export const LIST_LIMIT = 2000;
// Statistics read the answers of at most this many submissions (newest first);
// each carries its answers (3-6 KB), so this keeps a request to about 10 MB.
export const STATS_LIMIT = 2000;

// Errors from CREATE / ALTER ... IF NOT EXISTS when two cold starts run them at
// the same moment: the other one won, so the table, index or column is there.
const ALREADY_EXISTS_CODES = new Set(['23505', '42P07', '42710', '42701']);

export function isAlreadyExistsError(error) {
  return Boolean(error) && ALREADY_EXISTS_CODES.has(error.code);
}

export function databaseUrl(env = process.env) {
  return env.DATABASE_URL || env.POSTGRES_URL || '';
}

function iso(value) {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseJson(value) {
  return typeof value === 'string' ? JSON.parse(value) : value;
}

function fromRow(row) {
  return {
    id: row.id,
    quizId: row.quiz_id,
    quizVersion: row.quiz_version,
    quizChanged: Boolean(row.quiz_changed),
    name: row.name,
    startedAt: iso(row.started_at),
    submittedAt: iso(row.submitted_at),
    timeTakenSeconds: row.time_taken_seconds,
    score: Number(row.score),
    total: Number(row.total),
    skills: parseJson(row.skills),
    cohortCode: row.cohort_code ?? null,
    cohortId: row.cohort_id ?? null,
    ...(row.cohort_label === undefined ? {} : { cohortLabel: row.cohort_label ?? null }),
    ...(row.answers === undefined ? {} : { answers: parseJson(row.answers) }),
  };
}

function cohortFromRow(row) {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    quizId: row.quiz_id,
    active: Boolean(row.active),
    createdAt: iso(row.created_at),
    ...(row.submission_count === undefined ? {} : { submissionCount: Number(row.submission_count) }),
  };
}

async function ignoreAlreadyExists(statement) {
  try {
    await statement();
  } catch (error) {
    if (!isAlreadyExistsError(error)) throw error;
  }
}

// The filter as two query parameters: mode and the cohort code (or null).
function cohortParams(cohort) {
  const mode = cohort && (cohort.mode === 'none' || cohort.mode === 'code') ? cohort.mode : 'all';
  return { mode, code: mode === 'code' ? cohort.code : null };
}

// What the database already has (in the current schema): tables, columns of
// `submissions` and its indexes. Plain reads, no locks beyond the catalog's.
const NEEDED = { tables: ['submissions', 'cohorts'], columns: ['cohort_code', 'cohort_id'], indexes: ['submissions_quiz_submitted', 'submissions_cohort'] };

function asList(value) {
  if (Array.isArray(value)) return value;
  // A text[] that came back unparsed, e.g. '{a,b}'.
  if (typeof value === 'string' && value.startsWith('{')) return value.slice(1, -1).split(',').filter(Boolean).map((item) => item.replace(/^"|"$/g, ''));
  return [];
}

export async function readSchema(query) {
  const rows = await query`
    SELECT
      ARRAY(SELECT name FROM unnest(ARRAY['submissions', 'cohorts']) AS name WHERE to_regclass(name) IS NOT NULL) AS tables,
      ARRAY(SELECT column_name::text FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'submissions') AS columns,
      ARRAY(SELECT indexname::text FROM pg_indexes
            WHERE schemaname = current_schema() AND tablename = 'submissions') AS indexes`;
  const row = rows[0] || {};
  const schema = { tables: new Set(asList(row.tables)), columns: new Set(asList(row.columns)), indexes: new Set(asList(row.indexes)) };
  schema.complete = NEEDED.tables.every((name) => schema.tables.has(name))
    && NEEDED.columns.every((name) => schema.columns.has(name))
    && NEEDED.indexes.every((name) => schema.indexes.has(name));
  return schema;
}

// `connect` (tests only) returns the tagged-template query function.
export function createNeonDb(connectionString, { connect = async () => (await import('@neondatabase/serverless')).neon(connectionString) } = {}) {
  let sqlPromise = null;
  let ready = null;

  async function sql() {
    if (!sqlPromise) {
      sqlPromise = connect().catch((error) => {
        sqlPromise = null;
        throw error;
      });
    }
    const query = await sqlPromise;
    if (!ready) {
      ready = (async () => {
        // Look first, so a cold start on an up-to-date database runs no DDL
        // (ALTER TABLE takes an exclusive lock on the table, even when nothing changes).
        const schema = await readSchema(query);
        if (schema.complete) return;
        if (!schema.tables.has('submissions')) await ignoreAlreadyExists(() => query`
          CREATE TABLE IF NOT EXISTS submissions (
            id text PRIMARY KEY,
            quiz_id text NOT NULL,
            quiz_version text NOT NULL,
            quiz_changed boolean NOT NULL DEFAULT false,
            name varchar(80) NOT NULL,
            started_at timestamptz,
            submitted_at timestamptz NOT NULL DEFAULT now(),
            time_taken_seconds integer NOT NULL,
            score numeric NOT NULL,
            total numeric NOT NULL,
            skills jsonb NOT NULL,
            answers jsonb NOT NULL
          )`);
        if (!schema.indexes.has('submissions_quiz_submitted')) {
          await ignoreAlreadyExists(() => query`CREATE INDEX IF NOT EXISTS submissions_quiz_submitted ON submissions (quiz_id, submitted_at DESC)`);
        }
        // Cohort codes (added after the first release: additive only).
        if (!schema.columns.has('cohort_code')) await ignoreAlreadyExists(() => query`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS cohort_code text`);
        if (!schema.columns.has('cohort_id')) await ignoreAlreadyExists(() => query`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS cohort_id text`);
        if (!schema.tables.has('cohorts')) await ignoreAlreadyExists(() => query`
          CREATE TABLE IF NOT EXISTS cohorts (
            id text PRIMARY KEY,
            code text NOT NULL UNIQUE,
            label varchar(80) NOT NULL,
            quiz_id text NOT NULL,
            active boolean NOT NULL DEFAULT true,
            created_at timestamptz NOT NULL DEFAULT now()
          )`);
        if (!schema.indexes.has('submissions_cohort')) {
          await ignoreAlreadyExists(() => query`CREATE INDEX IF NOT EXISTS submissions_cohort ON submissions (cohort_id)`);
        }
      })().catch((error) => {
        ready = null; // try again on the next request
        throw error;
      });
    }
    await ready;
    return query;
  }

  return {
    async insertSubmission(record) {
      const query = await sql();
      const rows = await query`
        INSERT INTO submissions (id, quiz_id, quiz_version, quiz_changed, name, started_at, submitted_at,
                                 time_taken_seconds, score, total, skills, answers, cohort_code, cohort_id)
        VALUES (${record.id}, ${record.quizId}, ${record.quizVersion}, ${Boolean(record.quizChanged)}, ${record.name}, ${record.startedAt},
                ${record.submittedAt}, ${record.timeTakenSeconds}, ${record.score}, ${record.total},
                ${JSON.stringify(record.skills)}::jsonb, ${JSON.stringify(record.answers)}::jsonb,
                ${record.cohortCode ?? null}, ${record.cohortId ?? null})
        ON CONFLICT (id) DO NOTHING
        RETURNING id`;
      return { inserted: rows.length > 0 };
    },

    async listSubmissions({ quizId, from = null, to = null, cohort = null }) {
      const query = await sql();
      const { mode, code } = cohortParams(cohort);
      const rows = await query`
        SELECT s.id, s.quiz_id, s.quiz_version, s.quiz_changed, s.name, s.started_at, s.submitted_at,
               s.time_taken_seconds, s.score, s.total, s.skills, s.cohort_code, s.cohort_id, c.label AS cohort_label
        FROM submissions s
        LEFT JOIN cohorts c ON c.id = s.cohort_id
        WHERE s.quiz_id = ${quizId}
          AND (${from}::timestamptz IS NULL OR s.submitted_at >= ${from}::timestamptz)
          AND (${to}::timestamptz IS NULL OR s.submitted_at < ${to}::timestamptz)
          AND (${mode}::text = 'all'
               OR (${mode}::text = 'none' AND s.cohort_id IS NULL)
               OR (${mode}::text = 'code' AND c.code = ${code}::text))
        ORDER BY s.submitted_at DESC
        LIMIT ${LIST_LIMIT}`;
      return rows.map(fromRow);
    },

    async listStatsRows({ quizId, version, from = null, to = null, cohort = null }) {
      const query = await sql();
      const { mode, code } = cohortParams(cohort);
      // Only the current version's rows, and only the columns the statistics use.
      const rows = await query`
        SELECT s.id, s.score, s.skills, s.answers
        FROM submissions s
        LEFT JOIN cohorts c ON c.id = s.cohort_id
        WHERE s.quiz_id = ${quizId}
          AND s.quiz_version = ${version}
          AND (${from}::timestamptz IS NULL OR s.submitted_at >= ${from}::timestamptz)
          AND (${to}::timestamptz IS NULL OR s.submitted_at < ${to}::timestamptz)
          AND (${mode}::text = 'all'
               OR (${mode}::text = 'none' AND s.cohort_id IS NULL)
               OR (${mode}::text = 'code' AND c.code = ${code}::text))
        ORDER BY s.submitted_at DESC
        LIMIT ${STATS_LIMIT}`;
      const counted = await query`
        SELECT count(*) AS excluded
        FROM submissions s
        LEFT JOIN cohorts c ON c.id = s.cohort_id
        WHERE s.quiz_id = ${quizId}
          AND s.quiz_version <> ${version}
          AND (${from}::timestamptz IS NULL OR s.submitted_at >= ${from}::timestamptz)
          AND (${to}::timestamptz IS NULL OR s.submitted_at < ${to}::timestamptz)
          AND (${mode}::text = 'all'
               OR (${mode}::text = 'none' AND s.cohort_id IS NULL)
               OR (${mode}::text = 'code' AND c.code = ${code}::text))`;
      return {
        rows: rows.map((row) => ({
          id: row.id,
          quizVersion: version,
          score: Number(row.score),
          skills: parseJson(row.skills),
          answers: parseJson(row.answers),
        })),
        excluded: Number(counted[0]?.excluded ?? 0),
      };
    },

    async getSubmission(id) {
      const query = await sql();
      const rows = await query`
        SELECT s.*, c.label AS cohort_label FROM submissions s
        LEFT JOIN cohorts c ON c.id = s.cohort_id
        WHERE s.id = ${id}`;
      return rows.length > 0 ? fromRow(rows[0]) : null;
    },

    async listQuizIds() {
      const query = await sql();
      const rows = await query`SELECT DISTINCT quiz_id FROM submissions ORDER BY quiz_id`;
      return rows.map((row) => row.quiz_id);
    },

    async deleteSubmission(id) {
      const query = await sql();
      const rows = await query`DELETE FROM submissions WHERE id = ${id} RETURNING id`;
      return rows.length > 0;
    },

    async createCohort(cohort) {
      const query = await sql();
      const rows = await query`
        INSERT INTO cohorts (id, code, label, quiz_id, active, created_at)
        VALUES (${cohort.id}, ${cohort.code}, ${cohort.label}, ${cohort.quizId}, ${cohort.active}, ${cohort.createdAt})
        ON CONFLICT DO NOTHING
        RETURNING id`;
      return { created: rows.length > 0 };
    },

    async findCohortByCode(code) {
      const query = await sql();
      const rows = await query`SELECT * FROM cohorts WHERE code = ${code}`;
      return rows.length > 0 ? cohortFromRow(rows[0]) : null;
    },

    async listCohorts(quizId) {
      const query = await sql();
      const rows = await query`
        SELECT c.*, (SELECT count(*) FROM submissions s WHERE s.cohort_id = c.id) AS submission_count
        FROM cohorts c
        WHERE c.quiz_id = ${quizId}
        ORDER BY c.created_at DESC`;
      return rows.map(cohortFromRow);
    },

    async setCohortActive(id, active) {
      const query = await sql();
      const rows = await query`UPDATE cohorts SET active = ${Boolean(active)} WHERE id = ${id} RETURNING *`;
      return rows.length > 0 ? cohortFromRow(rows[0]) : null;
    },
  };
}

let cached = null;

// The store for this deployment, or null when no database is configured.
export function getDb(env = process.env) {
  const url = databaseUrl(env);
  if (!url) return null;
  if (!cached || cached.url !== url) cached = { url, db: createNeonDb(url) };
  return cached.db;
}
