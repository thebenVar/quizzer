import { validateMeta, validateQuestions } from './validate.js';

const QUIZ_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;

export class QuizLoadError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QuizLoadError';
  }
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

export async function resolveQuizId({ search = '', baseUrl = 'quizzes/', fetchFn = fetch } = {}) {
  const fromUrl = getQuizIdFromSearch(search);
  if (fromUrl) {
    return fromUrl;
  }

  const registry = await fetchJson(`${baseUrl}registry.json`, fetchFn);
  if (typeof registry?.defaultQuiz !== 'string' || registry.defaultQuiz.trim().length === 0) {
    throw new QuizLoadError(`${baseUrl}registry.json must set "defaultQuiz" to a quiz folder name`);
  }
  return registry.defaultQuiz.trim();
}

export async function loadQuiz(quizId, { baseUrl = 'quizzes/', fetchFn = fetch } = {}) {
  if (!QUIZ_ID_PATTERN.test(quizId)) {
    throw new QuizLoadError(`"${quizId}" is not a valid quiz name (use letters, numbers, - and _)`);
  }

  const quizFolder = `${baseUrl}${quizId}/`;
  const [rawMeta, rawQuestions] = await Promise.all([
    fetchJson(`${quizFolder}meta.json`, fetchFn),
    fetchJson(`${quizFolder}questions.json`, fetchFn),
  ]);

  let meta;
  let questions;
  try {
    // The folder name is the quiz id, so meta.json does not need to repeat it.
    meta = validateMeta({ ...rawMeta, id: quizId });
  } catch (error) {
    throw new QuizLoadError(`${quizFolder}meta.json: ${error.message}`);
  }
  try {
    questions = validateQuestions(rawQuestions);
  } catch (error) {
    throw new QuizLoadError(`${quizFolder}questions.json: ${error.message}`);
  }

  meta.branding.logoSrc = resolveAssetPath(meta.branding.logoSrc, quizFolder);

  return { meta, questions };
}
