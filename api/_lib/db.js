// Where submissions are stored: Neon Postgres, through @neondatabase/serverless.
// The connection string comes from DATABASE_URL (set by Vercel's Neon
// integration) or POSTGRES_URL. The table is created on first use.
//
// A store has four methods (memoryDb.js has the same interface, for tests):
//   insertSubmission(record)          -> { inserted: boolean }  (false when the id already exists)
//   listSubmissions({ quizId, from, to }) -> [record without answers], newest first, at most LIST_LIMIT
//   getSubmission(id)                 -> record with answers, or null
//   listQuizIds()                     -> [quizId] that have submissions
//   deleteSubmission(id)              -> boolean (whether a row was deleted)
// A record is { id, quizId, quizVersion, quizChanged, name, startedAt, submittedAt,
// timeTakenSeconds, score, total, skills, answers } (times as ISO strings).

// A list row without answers is about 1 KB, so 2000 rows stay well under
// Vercel's 4.5 MB response limit.
export const LIST_LIMIT = 2000;

// Errors from CREATE ... IF NOT EXISTS when two cold starts create the table at
// the same moment: the other one won, so the table is there.
const ALREADY_EXISTS_CODES = new Set(['23505', '42P07', '42710']);

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
    ...(row.answers === undefined ? {} : { answers: parseJson(row.answers) }),
  };
}

async function ignoreAlreadyExists(statement) {
  try {
    await statement();
  } catch (error) {
    if (!isAlreadyExistsError(error)) throw error;
  }
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
        await ignoreAlreadyExists(() => query`
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
        await ignoreAlreadyExists(() => query`CREATE INDEX IF NOT EXISTS submissions_quiz_submitted ON submissions (quiz_id, submitted_at DESC)`);
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
                                 time_taken_seconds, score, total, skills, answers)
        VALUES (${record.id}, ${record.quizId}, ${record.quizVersion}, ${Boolean(record.quizChanged)}, ${record.name}, ${record.startedAt},
                ${record.submittedAt}, ${record.timeTakenSeconds}, ${record.score}, ${record.total},
                ${JSON.stringify(record.skills)}::jsonb, ${JSON.stringify(record.answers)}::jsonb)
        ON CONFLICT (id) DO NOTHING
        RETURNING id`;
      return { inserted: rows.length > 0 };
    },

    async listSubmissions({ quizId, from = null, to = null }) {
      const query = await sql();
      const rows = await query`
        SELECT id, quiz_id, quiz_version, quiz_changed, name, started_at, submitted_at,
               time_taken_seconds, score, total, skills
        FROM submissions
        WHERE quiz_id = ${quizId}
          AND (${from}::timestamptz IS NULL OR submitted_at >= ${from}::timestamptz)
          AND (${to}::timestamptz IS NULL OR submitted_at < ${to}::timestamptz)
        ORDER BY submitted_at DESC
        LIMIT ${LIST_LIMIT}`;
      return rows.map(fromRow);
    },

    async getSubmission(id) {
      const query = await sql();
      const rows = await query`SELECT * FROM submissions WHERE id = ${id}`;
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
