// Loads a quiz from the deployed quizzes/ folder with the same loader and
// validation as the browser (app/loader.js). vercel.json includes quizzes/**
// in the function bundle, at the same path relative to the project root.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadQuiz } from '../../app/loader.js';
import { quizFingerprint } from '../../app/progress.js';

// The project root: two folders up from api/_lib/.
export function defaultProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
}

function fileFetchFor(root) {
  return async (url) => {
    const filePath = path.resolve(root, url);
    if (!filePath.startsWith(path.resolve(root, 'quizzes') + path.sep)) {
      return { ok: false, status: 404, text: async () => 'Not found' };
    }
    try {
      const content = await readFile(filePath, 'utf8');
      return { ok: true, status: 200, text: async () => content };
    } catch {
      return { ok: false, status: 404, text: async () => 'Not found' };
    }
  };
}

// { meta, questions, version } or null when the quiz does not exist.
// A quiz that exists but fails validation throws (a server-side problem).
export async function loadQuizFromFiles(quizId, root = defaultProjectRoot()) {
  const fetchFn = fileFetchFor(root);
  const metaProbe = await fetchFn(`quizzes/${quizId}/meta.json`);
  if (!metaProbe.ok) return null;
  const { meta, questions } = await loadQuiz(quizId, { baseUrl: 'quizzes/', fetchFn });
  return { meta, questions, version: quizFingerprint(questions) };
}
