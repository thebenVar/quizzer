// Checks a submission sent by the browser (POST /api/submit) against the quiz
// it names. A malformed request is refused with a message saying what is wrong.
// A request for an older version of the quiz (the browser's quizVersion differs
// from the deployed one, for example results queued while the quiz was edited)
// is not refused: answers that no longer fit the quiz are left out, and the
// submission is marked quizChanged.
import { cleanTypedText, hasVisibleText, tokenizeSpotText } from '../../app/utils.js';
import { STATEMENT_ANSWERS } from '../../app/validate.js';
import { HttpError } from './http.js';

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const QUIZ_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,99}$/i;
const QUIZ_VERSION_PATTERN = /^[0-9]{1,6}-[0-9a-z]{1,13}$/;
export const NAME_MAX_LENGTH = 80;
const TEXT_ANSWER_MAX_LENGTH = 1000;
const MAX_SECONDS = 7 * 24 * 3600;
// A start time more than this after the submission, or more than MAX_SECONDS
// before it, is not plausible (a wrong clock); it is stored as unknown (null).
const START_CLOCK_SKEW_MS = 10 * 60 * 1000;
// `cohortCode` is optional and never a reason to refuse (see api/submit.js).
const ALLOWED_KEYS = new Set(['id', 'quizId', 'quizVersion', 'name', 'startedAt', 'timeTakenSeconds', 'selections', 'timeSpent', 'optionOrders', 'cohortCode']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function refuse(message) {
  throw new HttpError(400, message);
}

// The fields every submission needs before its quiz is loaded.
export function checkEnvelope(body) {
  if (!isPlainObject(body)) refuse('The request body must be a JSON object.');
  for (const key of Object.keys(body)) {
    if (!ALLOWED_KEYS.has(key)) refuse(`Unknown field "${key}".`);
  }
  if (typeof body.id !== 'string' || !UUID_PATTERN.test(body.id)) refuse('"id" must be a UUID.');
  if (typeof body.quizId !== 'string' || !QUIZ_ID_PATTERN.test(body.quizId)) refuse('"quizId" is not a valid quiz name.');
  if (typeof body.quizVersion !== 'string' || !QUIZ_VERSION_PATTERN.test(body.quizVersion)) refuse('"quizVersion" must be the quiz fingerprint.');
  return { id: body.id.toLowerCase(), quizId: body.quizId, quizVersion: body.quizVersion };
}

export function cleanName(name) {
  if (typeof name !== 'string') refuse('"name" is required.');
  const cleaned = cleanTypedText(name).normalize('NFC').trim();
  if (!hasVisibleText(cleaned)) refuse('"name" is required.');
  // Longer names are cut rather than refused, so a long name never loses the results.
  return Array.from(cleaned).slice(0, NAME_MAX_LENGTH).join('').trim();
}

// The answer to one question, checked by question type. Returns the value to
// grade, or throws an Error saying why it does not fit the question.
function checkSelection(question, value, where) {
  const misfit = (message) => { throw new Error(`${where} ${message}`); };
  if (value === null || value === undefined) return null;
  switch (question.type) {
    case 'mcq':
      if (typeof value !== 'string') misfit('must be one of the options.');
      if (value !== '' && !question.options.includes(value)) misfit("is not one of the question's options.");
      return value;
    case 'text':
      if (typeof value !== 'string' || value.length > TEXT_ANSWER_MAX_LENGTH) misfit(`must be text of at most ${TEXT_ANSWER_MAX_LENGTH} characters.`);
      return cleanTypedText(value);
    case 'spot': {
      const words = tokenizeSpotText(question.text).length;
      if (!Number.isInteger(value) || value < 0 || value >= words) misfit('must be the index of a word in the text.');
      return value;
    }
    case 'matching': {
      if (!isPlainObject(value)) misfit('must be an object of matches.');
      const lefts = new Set(question.pairs.map(([left]) => left));
      const rights = new Set(question.pairs.map(([, right]) => right));
      for (const [left, right] of Object.entries(value)) {
        if (!lefts.has(left)) misfit(`matches "${left}", which is not in the question.`);
        if (typeof right !== 'string' || (right !== '' && !rights.has(right))) misfit(`["${left}"] is not one of the question's matches.`);
      }
      return value;
    }
    case 'statements': {
      if (!isPlainObject(value)) misfit('must be an object of choices.');
      for (const [index, choice] of Object.entries(value)) {
        if (!/^\d+$/.test(index) || Number(index) >= question.statements.length) misfit(`has a choice for statement "${index}", which does not exist.`);
        if (choice !== '' && !STATEMENT_ANSWERS.includes(choice)) misfit(`["${index}"] must be one of ${STATEMENT_ANSWERS.join(', ')}.`);
      }
      return value;
    }
    default:
      return misfit(': unsupported question type.');
  }
}

// Entries keyed by question id. Same quiz version: an entry that does not fit
// is refused. Older version: it is left out.
function entriesById(value, field, questionsById, sameVersion, check) {
  if (value === undefined) return {};
  if (!isPlainObject(value)) refuse(`"${field}" must be an object keyed by question id.`);
  const result = {};
  for (const [id, entry] of Object.entries(value)) {
    const question = questionsById.get(id);
    try {
      if (!question) throw new Error(`"${field}" names question "${id}", which is not in this quiz.`);
      const checked = check(question, entry, `${field}["${id}"]`);
      if (checked !== null && checked !== undefined) result[id] = checked;
    } catch (error) {
      if (sameVersion) refuse(error.message);
    }
  }
  return result;
}

// The start time as an ISO string, or null when it is outside the plausible range.
function plausibleStart(startedAt, submittedAt) {
  const date = typeof startedAt === 'number' || typeof startedAt === 'string' ? new Date(startedAt) : null;
  if (!date || Number.isNaN(date.getTime())) refuse('"startedAt" must be a time (milliseconds or ISO date).');
  const ms = date.getTime();
  const end = submittedAt.getTime();
  if (ms > end + START_CLOCK_SKEW_MS || ms < end - MAX_SECONDS * 1000) return null;
  return date.toISOString();
}

// The submission checked against the deployed quiz's validated questions;
// `currentVersion` is that quiz's fingerprint.
export function checkSubmission(body, questions, currentVersion, submittedAt = new Date()) {
  const questionsById = new Map(questions.map((question) => [String(question.id), question]));
  const sameVersion = body.quizVersion === currentVersion;

  if (!isPlainObject(body.selections)) refuse('"selections" must be an object keyed by question id.');
  const selections = entriesById(body.selections, 'selections', questionsById, sameVersion, checkSelection);

  const timeSpent = entriesById(body.timeSpent, 'timeSpent', questionsById, sameVersion, (question, ms, where) => {
    if (!Number.isFinite(ms) || ms < 0 || ms > MAX_SECONDS * 1000) throw new Error(`${where} must be a number of milliseconds.`);
    return ms;
  });

  // The order options were shown in only letters them in the review, so entries
  // that do not fit (other question types, unknown ids) are dropped, not refused.
  const optionOrders = {};
  if (isPlainObject(body.optionOrders)) {
    for (const [id, order] of Object.entries(body.optionOrders)) {
      const question = questionsById.get(id);
      const isPermutation = question && question.type === 'mcq' && Array.isArray(order) &&
        order.length === question.options.length && order.every((option) => typeof option === 'string') &&
        [...order].sort().join('\u0000') === [...question.options].sort().join('\u0000');
      if (isPermutation) optionOrders[id] = order;
    }
  } else if (body.optionOrders !== undefined) {
    refuse('"optionOrders" must be an object keyed by question id.');
  }

  const timeTaken = body.timeTakenSeconds;
  if (!Number.isFinite(timeTaken) || timeTaken < 0 || timeTaken > MAX_SECONDS) refuse('"timeTakenSeconds" must be a number of seconds.');

  return {
    name: cleanName(body.name),
    startedAt: plausibleStart(body.startedAt, submittedAt),
    timeTakenSeconds: Math.round(timeTaken),
    selections,
    timeSpent,
    optionOrders,
    quizChanged: !sameVersion,
  };
}
