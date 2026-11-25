/**
 * @vitest-environment jsdom
 */
// Quizzes that need a code: the answer key gate, and how the facilitators' page lists and explains them.
import { describe, expect, it, vi } from 'vitest';

import { answerKeyNeedsCode, renderCodeGate } from '../app/answerKey.js';
import { isFacilitatorQuiz, notCollectedMessage } from '../app/resultsPage.js';
import { DEFAULT_UI_TEXT, validateMeta } from '../app/validate.js';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function setupGate(check, initialCode = '') {
  const root = document.createElement('div');
  const onUnlock = vi.fn(() => root.replaceChildren(Object.assign(document.createElement('p'), { textContent: 'ANSWERS' })));
  const form = renderCodeGate(root, { text: DEFAULT_UI_TEXT, initialCode, check, onUnlock });
  return { root, form, onUnlock };
}

describe('answer key gate', () => {
  it('applies only to quizzes whose code is required', () => {
    expect(answerKeyNeedsCode(validateMeta({ id: 'g', title: 'G', cohortCodes: 'required' }))).toBe(true);
    expect(answerKeyNeedsCode(validateMeta({ id: 'o', title: 'O', collectResults: true, cohortCodes: 'optional' }))).toBe(false);
    expect(answerKeyNeedsCode(validateMeta({ id: 's', title: 'S' }))).toBe(false);
  });

  it('asks for the code and shows nothing of the answers before it is confirmed', () => {
    const { root, onUnlock } = setupGate(vi.fn());
    expect(root.textContent).toContain(DEFAULT_UI_TEXT.answerKeyCodeNeeded);
    expect(root.querySelector('input').value).toBe('');
    expect(root.textContent).not.toContain('ANSWERS');
    expect(onUnlock).not.toHaveBeenCalled();
  });

  it('opens with a code the server confirms', async () => {
    const check = vi.fn(async () => ({ status: 'valid', code: 'ABC234', label: 'Group A' }));
    const { root, form, onUnlock } = setupGate(check, 'ABC234');
    expect(root.querySelector('input').value).toBe('ABC234');
    form.requestSubmit();
    await flush();
    expect(check).toHaveBeenCalledWith('ABC234');
    expect(onUnlock).toHaveBeenCalledTimes(1);
    expect(root.textContent).toBe('ANSWERS');
  });

  it.each([
    ['an invalid code', { status: 'invalid' }, 'cohortInvalid'],
    ['no code', { status: 'none' }, 'cohortCodeRequiredHint'],
    ['a server that cannot be reached', { status: 'unchecked', code: 'ABC234' }, 'cohortCheckUnavailable'],
  ])('stays closed for %s, with a clear message', async (label, result, key) => {
    const { root, form, onUnlock } = setupGate(vi.fn(async () => result), 'ABC234');
    form.requestSubmit();
    await flush();
    expect(onUnlock).not.toHaveBeenCalled();
    expect(root.querySelector('.ak-gate-status').textContent).toBe(DEFAULT_UI_TEXT[key]);
    expect(root.querySelector('.ak-gate-error')).not.toBeNull();
  });

  it('stays closed when the check itself fails', async () => {
    const { root, form, onUnlock } = setupGate(vi.fn(async () => { throw new Error('boom'); }), 'ABC234');
    form.requestSubmit();
    await flush();
    expect(onUnlock).not.toHaveBeenCalled();
    expect(root.querySelector('.ak-gate-status').textContent).toBe(DEFAULT_UI_TEXT.cohortCheckUnavailable);
  });
});

describe("facilitators' page and quizzes that send no results", () => {
  const gateOnly = validateMeta({ id: 'gethsemane', title: 'Gethsemane <Quiz>', cohortCodes: 'required' });
  const collecting = validateMeta({ id: 'apt', title: 'Aptitude', collectResults: true, cohortCodes: 'optional' });
  const plain = validateMeta({ id: 'sample', title: 'Sample' });

  it('lists quizzes that collect results or use cohort codes', () => {
    expect(isFacilitatorQuiz(gateOnly)).toBe(true);
    expect(isFacilitatorQuiz(collecting)).toBe(true);
    expect(isFacilitatorQuiz(validateMeta({ id: 'r', title: 'R', collectResults: true }))).toBe(true);
    expect(isFacilitatorQuiz(plain)).toBe(false);
    expect(isFacilitatorQuiz(undefined)).toBe(false);
  });

  it('explains on the result tabs that a code-only quiz sends no results', () => {
    const message = notCollectedMessage(gateOnly);
    expect(message).toContain('Gethsemane <Quiz>');
    expect(message).toContain('does not send results');
    expect(message).toContain('Cohorts tab');
    expect(notCollectedMessage(collecting)).toBeNull();
  });
});
