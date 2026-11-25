import { validateMeta, validateQuestions, validateQuizConsistency } from './validate.js';

const QUIZ_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;

export class QuizLoadError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QuizLoadError';
  }
}

// ?quiz=<id>-ans opens the answer key of quiz <id>, so no quiz folder may end in "-ans".
export const ANSWER_KEY_SUFFIX = '-ans';

export function parseQuizRequest(quizParam) {
  if (quizParam.endsWith(ANSWER_KEY_SUFFIX) && quizParam.length > ANSWER_KEY_SUFFIX.length) {
    return { quizId: quizParam.slice(0, -ANSWER_KEY_SUFFIX.length), answerKey: true };
  }
  return { quizId: quizParam, answerKey: false };
}

export function getQuizIdFromSearch(search) {
  const quizId = new URLSearchParams(search).get('quiz');
  return quizId && quizId.trim().length > 0 ? quizId.trim() : null;
}

async function fetchJson(url, fetchFn) {
  let response;
  try {
    response = await fetchFn(url);
  } catch (error) {
    throw new QuizLoadError(`Could not load ${url}: ${error.message}`);
  }

  if (!response.ok) {
    throw new QuizLoadError(`Could not load ${url} (HTTP ${response.status})`);
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new QuizLoadError(`${url} is not valid JSON: ${error.message}`);
  }
}

// A logo path in meta.json is relative to the quiz's own folder,
// unless it is a full URL or starts with "/".
function resolveAssetPath(src, quizFolder) {
  if (!src || /^([a-z]+:|\/)/i.test(src)) {
    return src;
  }
  return quizFolder + src;
}

function quizFolderFor(quizId, baseUrl) {
  if (typeof quizId !== 'string' || !QUIZ_ID_PATTERN.test(quizId)) {
    throw new QuizLoadError(`"${quizId}" is not a valid quiz name (use letters, numbers, - and _)`);
  }
  return `${baseUrl}${quizId}/`;
}

async function loadMeta(quizId, quizFolder, fetchFn) {
  const rawMeta = await fetchJson(`${quizFolder}meta.json`, fetchFn);
  let meta;
  try {
    // The folder name is the quiz id, so meta.json does not need to repeat it.
    meta = validateMeta({ ...rawMeta, id: quizId });
  } catch (error) {
    throw new QuizLoadError(`${quizFolder}meta.json: ${error.message}`);
  }
  meta.branding.logoSrc = resolveAssetPath(meta.branding.logoSrc, quizFolder);
  return meta;
}

export async function loadQuiz(quizId, { baseUrl = 'quizzes/', fetchFn = fetch } = {}) {
  const quizFolder = quizFolderFor(quizId, baseUrl);
  // Fetch both at once, but report a meta.json problem first so errors are predictable.
  const [metaResult, questionsResult] = await Promise.allSettled([
    loadMeta(quizId, quizFolder, fetchFn),
    fetchJson(`${quizFolder}questions.json`, fetchFn),
  ]);
  for (const result of [metaResult, questionsResult]) {
    if (result.status === 'rejected') {
      throw result.reason;
    }
  }
  const meta = metaResult.value;
  const rawQuestions = questionsResult.value;

  let questions;
  try {
    questions = validateQuestions(rawQuestions);
    validateQuizConsistency(meta, questions);
  } catch (error) {
    throw new QuizLoadError(`${quizFolder}questions.json: ${error.message}`);
  }

  return { meta, questions };
}

// Reads quizzes/registry.json: "quizzes" are shown on the home page, in that order;
// "unlisted" quizzes are kept off it (drafts, examples) but still open with ?quiz=<id>.
export async function loadRegistry({ baseUrl = 'quizzes/', fetchFn = fetch } = {}) {
  const url = `${baseUrl}registry.json`;
  const registry = await fetchJson(url, fetchFn);

  const fail = (message) => { throw new QuizLoadError(`${url}: ${message}`); };
  if (registry === null || typeof registry !== 'object' || Array.isArray(registry)) fail('must be an object');
  if (!Array.isArray(registry.quizzes)) fail('"quizzes" must be a list of quiz folder names');
  const unlisted = registry.unlisted ?? [];
  if (!Array.isArray(unlisted)) fail('"unlisted" must be a list of quiz folder names');

  const seen = new Set();
  for (const [listName, list] of [['quizzes', registry.quizzes], ['unlisted', unlisted]]) {
    list.forEach((quizId, index) => {
      if (typeof quizId !== 'string' || !QUIZ_ID_PATTERN.test(quizId)) fail(`${listName}[${index}] "${quizId}" is not a valid quiz folder name`);
      if (quizId.endsWith(ANSWER_KEY_SUFFIX)) fail(`${listName}[${index}] "${quizId}" cannot end in "${ANSWER_KEY_SUFFIX}"; that ending opens a quiz's answer key`);
      if (seen.has(quizId)) fail(`"${quizId}" is listed more than once`);
      seen.add(quizId);
    });
  }
  for (const key of ['title', 'description']) {
    if (registry[key] !== undefined && typeof registry[key] !== 'string') fail(`"${key}" must be text`);
  }

  return {
    title: registry.title?.trim() || 'Quizzes',
    description: registry.description?.trim() || '',
    quizzes: [...registry.quizzes],
    unlisted: [...unlisted],
  };
}

// The home page list: each registered quiz with its meta, or the error that stopped it loading.
export async function loadQuizList({ baseUrl = 'quizzes/', fetchFn = fetch } = {}) {
  const registry = await loadRegistry({ baseUrl, fetchFn });
  const quizzes = await Promise.all(
    registry.quizzes.map(async (quizId) => {
      try {
        return { id: quizId, meta: await loadMeta(quizId, quizFolderFor(quizId, baseUrl), fetchFn) };
      } catch (error) {
        return { id: quizId, error };
      }
    })
  );
  return { ...registry, quizzes };
}
