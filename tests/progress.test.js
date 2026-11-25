import { describe, expect, it } from 'vitest';

import {
  clearProgress,
  computeDeadline,
  getStorage,
  isExpired,
  loadProgress,
  progressKey,
  quizFingerprint,
  restoreQuestionOrder,
  saveProgress,
  secondsLeft,
} from '../app/progress.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    data,
  };
}

const throwingStorage = {
  getItem() { throw new Error('denied'); },
  setItem() { throw new Error('denied'); },
  removeItem() { throw new Error('denied'); },
};

const questions = [{ id: 'a' }, { id: 2 }, { id: 'c' }];
const state = {
  order: ['c', 'a', 2],
  index: 1,
  selections: { c: 'x' },
  name: 'Asha',
  startedAt: 1000,
  deadline: 61000,
  timeSpent: { c: 4000 },
  optionOrder: { c: ['x', 'y'] },
  cohortCode: 'ABC234',
  cohortLabel: 'NLCI Nov 2026',
};

describe('quizFingerprint', () => {
  it('is stable for the same ids and changes when the ids change', () => {
    expect(quizFingerprint(questions)).toBe(quizFingerprint([{ id: 'a' }, { id: 2 }, { id: 'c' }]));
    expect(quizFingerprint(questions)).not.toBe(quizFingerprint([{ id: 'a' }, { id: 2 }]));
    expect(quizFingerprint(questions)).not.toBe(quizFingerprint([{ id: 'a' }, { id: '2' }, { id: 'c' }]));
  });

  it('changes when a question’s content changes, so a saved word index cannot point at the wrong word', () => {
    const spot = { id: 'e1', type: 'spot', text: 'Have faith in Good.', answer: 'Good' };
    expect(quizFingerprint([spot])).not.toBe(quizFingerprint([{ ...spot, text: 'Have strong faith in Good.' }]));
    expect(quizFingerprint([spot])).toBe(quizFingerprint([{ ...spot }]));
  });
});

describe('saveProgress / loadProgress', () => {
  it('round-trips the saved state under a key with the quiz id', () => {
    const storage = memoryStorage();
    const fingerprint = quizFingerprint(questions);
    expect(saveProgress(storage, 'demo', fingerprint, state)).toBe(true);
    expect(storage.data.has(progressKey('demo'))).toBe(true);
    expect(loadProgress(storage, 'demo', fingerprint)).toEqual(state);
  });

  it('reads progress saved before cohort codes existed', () => {
    const storage = memoryStorage();
    const fingerprint = quizFingerprint(questions);
    const { cohortCode, cohortLabel, ...older } = state;
    saveProgress(storage, 'demo', fingerprint, older);
    expect(loadProgress(storage, 'demo', fingerprint)).toMatchObject({ cohortCode: '', cohortLabel: '' });
  });

  it('discards progress saved for a different version of the quiz', () => {
    const storage = memoryStorage();
    saveProgress(storage, 'demo', 'old', state);
    expect(loadProgress(storage, 'demo', 'new')).toBeNull();
    expect(storage.data.has(progressKey('demo'))).toBe(false);
  });

  it('discards unreadable progress', () => {
    const storage = memoryStorage();
    storage.setItem(progressKey('demo'), '{not json');
    expect(loadProgress(storage, 'demo', 'x')).toBeNull();
    storage.setItem(progressKey('demo'), JSON.stringify({ version: 1, fingerprint: 'x', order: 'nope' }));
    expect(loadProgress(storage, 'demo', 'x')).toBeNull();
  });

  it('clears progress', () => {
    const storage = memoryStorage();
    saveProgress(storage, 'demo', 'f', state);
    clearProgress(storage, 'demo');
    expect(loadProgress(storage, 'demo', 'f')).toBeNull();
  });

  it('works without storage, or when storage throws', () => {
    expect(saveProgress(null, 'demo', 'f', state)).toBe(false);
    expect(loadProgress(null, 'demo', 'f')).toBeNull();
    expect(() => clearProgress(null, 'demo')).not.toThrow();
    expect(saveProgress(throwingStorage, 'demo', 'f', state)).toBe(false);
    expect(loadProgress(throwingStorage, 'demo', 'f')).toBeNull();
    expect(() => clearProgress(throwingStorage, 'demo')).not.toThrow();
  });
});

describe('getStorage', () => {
  it('returns null when localStorage is missing or blocked', () => {
    expect(getStorage(undefined)).toBeNull();
    expect(getStorage({})).toBeNull();
    expect(getStorage({ localStorage: throwingStorage })).toBeNull();
    const blocked = {};
    Object.defineProperty(blocked, 'localStorage', { get() { throw new Error('SecurityError'); } });
    expect(getStorage(blocked)).toBeNull();
  });

  it('returns a working storage', () => {
    const storage = memoryStorage();
    expect(getStorage({ localStorage: storage })).toBe(storage);
  });
});

describe('restoreQuestionOrder', () => {
  it('maps saved ids (numbers or strings) back to questions', () => {
    expect(restoreQuestionOrder(['c', '2', 'a'], questions).map((q) => q.id)).toEqual(['c', 2, 'a']);
  });

  it('returns null when a saved question no longer exists', () => {
    expect(restoreQuestionOrder(['c', 'gone'], questions)).toBeNull();
    expect(restoreQuestionOrder([], questions)).toBeNull();
  });
});

describe('deadline', () => {
  it('is an absolute time, so time keeps running while away', () => {
    const deadline = computeDeadline(10_000, 60);
    expect(deadline).toBe(70_000);
    expect(secondsLeft(deadline, 10_000)).toBe(60);
    expect(secondsLeft(deadline, 69_500)).toBe(1);
    expect(secondsLeft(deadline, 99_000)).toBe(0);
    expect(isExpired(deadline, 69_999)).toBe(false);
    expect(isExpired(deadline, 70_000)).toBe(true);
  });
});
