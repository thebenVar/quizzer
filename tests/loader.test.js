import { describe, expect, it } from 'vitest';

import { getQuizIdFromSearch, loadQuiz, loadQuizList, loadRegistry, parseQuizRequest } from '../app/loader.js';

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

describe('parseQuizRequest', () => {
  it('reads <id>-ans as the answer key of <id>', () => {
    expect(parseQuizRequest('cit-aptitude-ans')).toEqual({ quizId: 'cit-aptitude', answerKey: true });
  });

  it('reads anything else as the quiz itself', () => {
    expect(parseQuizRequest('sample')).toEqual({ quizId: 'sample', answerKey: false });
    expect(parseQuizRequest('-ans')).toEqual({ quizId: '-ans', answerKey: false });
  });
});

describe('loadRegistry', () => {
  it('reads the title, description and quiz lists, with defaults', async () => {
    const fetchFn = fakeFetch({ 'quizzes/registry.json': { quizzes: ['a', 'b'] } });
    expect(await loadRegistry({ fetchFn })).toEqual({ title: 'Quizzes', description: '', quizzes: ['a', 'b'], unlisted: [] });
  });

  it('requires a quizzes list', async () => {
    const fetchFn = fakeFetch({ 'quizzes/registry.json': {} });
    await expect(loadRegistry({ fetchFn })).rejects.toThrow(/"quizzes" must be a list/);
  });

  it('rejects a quiz listed twice, even across quizzes and unlisted', async () => {
    const fetchFn = fakeFetch({ 'quizzes/registry.json': { quizzes: ['a'], unlisted: ['a'] } });
    await expect(loadRegistry({ fetchFn })).rejects.toThrow(/"a" is listed more than once/);
  });

  it('rejects quiz names ending in -ans, which open answer keys', async () => {
    const fetchFn = fakeFetch({ 'quizzes/registry.json': { quizzes: ['bible-ans'] } });
    await expect(loadRegistry({ fetchFn })).rejects.toThrow(/cannot end in "-ans"/);
  });

  it('rejects names that are not plain folder names', async () => {
    const fetchFn = fakeFetch({ 'quizzes/registry.json': { quizzes: ['../x'] } });
    await expect(loadRegistry({ fetchFn })).rejects.toThrow(/quizzes\[0\] "\.\.\/x" is not a valid quiz folder name/);
  });
});

describe('loadQuizList', () => {
  it('loads the meta of each listed quiz, in order, and reports ones that fail', async () => {
    const fetchFn = fakeFetch({
      'quizzes/registry.json': { title: 'My Quizzes', quizzes: ['sample', 'missing'], unlisted: ['draft'] },
      'quizzes/sample/meta.json': sampleMeta,
    });

    const list = await loadQuizList({ fetchFn });

    expect(list.title).toBe('My Quizzes');
    expect(list.quizzes.map((quiz) => quiz.id)).toEqual(['sample', 'missing']);
    expect(list.quizzes[0].meta).toMatchObject({ title: 'Sample Quiz', branding: { logoSrc: 'quizzes/sample/logo.png' } });
    expect(list.quizzes[1].error.message).toMatch(/quizzes\/missing\/meta\.json \(HTTP 404\)/);
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
