import { describe, expect, it } from 'vitest';

import { getQuizIdFromSearch, loadQuiz, resolveQuizId } from '../app/loader.js';

const sampleMeta = {
  title: 'Sample Quiz',
  branding: { logoSrc: 'logo.png' },
};

const sampleQuestions = [
  {
    id: 1,
    type: 'mcq',
    prompt: 'Who was the first king of Israel?',
    options: ['David', 'Saul'],
    answer: 'Saul',
    points: 1,
  },
];

// A fake fetch that serves the given { url: body } map; strings are served as-is.
function fakeFetch(files) {
  return async (url) => {
    if (!(url in files)) {
      return { ok: false, status: 404, text: async () => 'Not found' };
    }
    const body = files[url];
    return { ok: true, status: 200, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) };
  };
}

describe('getQuizIdFromSearch', () => {
  it('reads the quiz parameter', () => {
    expect(getQuizIdFromSearch('?quiz=sample')).toBe('sample');
  });

  it('returns null when the parameter is missing or empty', () => {
    expect(getQuizIdFromSearch('')).toBeNull();
    expect(getQuizIdFromSearch('?quiz=')).toBeNull();
  });
});

describe('resolveQuizId', () => {
  it('prefers the quiz named in the URL', async () => {
    const quizId = await resolveQuizId({ search: '?quiz=sample', fetchFn: fakeFetch({}) });
    expect(quizId).toBe('sample');
  });

  it('falls back to the registry default', async () => {
    const fetchFn = fakeFetch({ 'quizzes/registry.json': { defaultQuiz: 'gethsemane' } });
    expect(await resolveQuizId({ fetchFn })).toBe('gethsemane');
  });

  it('explains a registry without a default', async () => {
    const fetchFn = fakeFetch({ 'quizzes/registry.json': {} });
    await expect(resolveQuizId({ fetchFn })).rejects.toThrow(/must set "defaultQuiz"/);
  });
});

describe('loadQuiz', () => {
  it('loads and validates a quiz folder, using the folder name as id', async () => {
    const fetchFn = fakeFetch({
      'quizzes/sample/meta.json': sampleMeta,
      'quizzes/sample/questions.json': sampleQuestions,
    });

    const quiz = await loadQuiz('sample', { fetchFn });

    expect(quiz.meta.id).toBe('sample');
    expect(quiz.meta.title).toBe('Sample Quiz');
    expect(quiz.questions).toHaveLength(1);
    expect(quiz.questions[0]).toMatchObject({ type: 'mcq', answer: 'Saul', isBonus: false });
  });

  it('resolves a relative logo path against the quiz folder', async () => {
    const fetchFn = fakeFetch({
      'quizzes/sample/meta.json': sampleMeta,
      'quizzes/sample/questions.json': sampleQuestions,
    });

    const quiz = await loadQuiz('sample', { fetchFn });
    expect(quiz.meta.branding.logoSrc).toBe('quizzes/sample/logo.png');
  });

  it('leaves absolute logo URLs alone', async () => {
    const fetchFn = fakeFetch({
      'quizzes/sample/meta.json': { ...sampleMeta, branding: { logoSrc: 'https://example.com/logo.png' } },
      'quizzes/sample/questions.json': sampleQuestions,
    });

    const quiz = await loadQuiz('sample', { fetchFn });
    expect(quiz.meta.branding.logoSrc).toBe('https://example.com/logo.png');
  });

  it('reports a missing quiz folder', async () => {
    await expect(loadQuiz('nope', { fetchFn: fakeFetch({}) })).rejects.toThrow(/quizzes\/nope\/meta\.json \(HTTP 404\)/);
  });

  it('reports invalid JSON with the file name', async () => {
    const fetchFn = fakeFetch({
      'quizzes/sample/meta.json': sampleMeta,
      'quizzes/sample/questions.json': '[{ "id": 1, }]',
    });

    await expect(loadQuiz('sample', { fetchFn })).rejects.toThrow(/quizzes\/sample\/questions\.json is not valid JSON/);
  });

  it('reports content errors with the file name', async () => {
    const fetchFn = fakeFetch({
      'quizzes/sample/meta.json': {},
      'quizzes/sample/questions.json': sampleQuestions,
    });

    await expect(loadQuiz('sample', { fetchFn })).rejects.toThrow(/quizzes\/sample\/meta\.json: meta\.title is required/);
  });

  it('rejects quiz names that are not plain folder names', async () => {
    await expect(loadQuiz('../secret', { fetchFn: fakeFetch({}) })).rejects.toThrow(/not a valid quiz name/);
  });
});
