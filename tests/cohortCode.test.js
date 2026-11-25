// The cohort code on the start screen: checking it, and when Start may go ahead.
import { describe, expect, it, vi } from 'vitest';

import { checkCohortCode, cohortAllowsStart, normalizeCohortCode, tidyCohortInput } from '../app/cohortCode.js';
import { buildSubmission } from '../app/submissions.js';
import { validateMeta } from '../app/validate.js';

function respond(status, body) {
  return vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => { if (body === undefined) throw new SyntaxError('not JSON'); return body; } }));
}

describe('checkCohortCode', () => {
  it('asks the server with the tidied code', async () => {
    const fetchFn = respond(200, { ok: true, code: 'ABC234', label: 'Nov 2026 workshop' });
    expect(await checkCohortCode('cit-aptitude', ' abc-234 ', fetchFn)).toEqual({ status: 'valid', code: 'ABC234', label: 'Nov 2026 workshop' });
    expect(fetchFn.mock.calls[0][0]).toBe('api/cohort?quiz=cit-aptitude&code=ABC234');
  });

  it('treats nothing typed as no code, without asking', async () => {
    const fetchFn = respond(200, {});
    expect(await checkCohortCode('q', '   ', fetchFn)).toEqual({ status: 'none' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('says invalid for text that cannot be a code, and for a 404 or 400 from the server', async () => {
    const fetchFn = respond(200, {});
    expect(await checkCohortCode('q', 'hello!', fetchFn)).toEqual({ status: 'invalid' });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(await checkCohortCode('q', 'ZZZ999', respond(404, { ok: false, error: 'not valid' }))).toEqual({ status: 'invalid' });
    expect(await checkCohortCode('q', 'ZZZ999', respond(400, { ok: false, error: 'bad' }))).toEqual({ status: 'invalid' });
  });

  it('keeps the code unchecked when the server cannot answer (offline, static server, 5xx)', async () => {
    const offline = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    expect(await checkCohortCode('q', 'abc234', offline)).toEqual({ status: 'unchecked', code: 'ABC234' });
    expect(await checkCohortCode('q', 'abc234', respond(404))).toEqual({ status: 'unchecked', code: 'ABC234' });
    expect(await checkCohortCode('q', 'abc234', respond(503, { ok: false, error: 'down' }))).toEqual({ status: 'unchecked', code: 'ABC234' });
  });
});

describe('cohortAllowsStart', () => {
  it('optional: starts without a code or with an unchecked one, not with an invalid one', () => {
    expect(cohortAllowsStart('optional', { status: 'none' })).toBe(true);
    expect(cohortAllowsStart('optional', { status: 'valid' })).toBe(true);
    expect(cohortAllowsStart('optional', { status: 'unchecked' })).toBe(true);
    expect(cohortAllowsStart('optional', { status: 'invalid' })).toBe(false);
  });

  it('required: needs a code; a valid one, or one that could not be checked', () => {
    expect(cohortAllowsStart('required', { status: 'none' })).toBe(false);
    expect(cohortAllowsStart('required', { status: 'invalid' })).toBe(false);
    expect(cohortAllowsStart('required', { status: 'valid' })).toBe(true);
    expect(cohortAllowsStart('required', { status: 'unchecked' })).toBe(true);
  });
});

describe('cohort code helpers', () => {
  it('tidies and normalises', () => {
    expect(tidyCohortInput(' ab c-2 ')).toBe('ABC2');
    expect(normalizeCohortCode('abc234')).toBe('ABC234');
    expect(normalizeCohortCode('ABCD1O')).toBeNull();
  });

  it('sends the code with the results, and leaves it out when there is none', () => {
    const base = { id: 'x', quizId: 'q', quizVersion: '1-a', name: 'Asha', startedAt: 1, timeTakenSeconds: 1, selections: {} };
    expect(buildSubmission({ ...base, cohortCode: 'ABC234' }).cohortCode).toBe('ABC234');
    expect(buildSubmission({ ...base, cohortCode: '' })).not.toHaveProperty('cohortCode');
    expect(buildSubmission(base)).not.toHaveProperty('cohortCode');
  });
});

describe('meta.json "cohortCodes"', () => {
  const base = { id: 'q', title: 'Q', collectResults: true };
  it('defaults to off and accepts off, optional and required', () => {
    expect(validateMeta(base).cohortCodes).toBe('off');
    for (const mode of ['off', 'optional', 'required']) expect(validateMeta({ ...base, cohortCodes: mode }).cohortCodes).toBe(mode);
  });

  it('rejects other values, and cohort codes without collectResults', () => {
    expect(() => validateMeta({ ...base, cohortCodes: 'yes' })).toThrow(/cohortCodes must be one of/);
    expect(() => validateMeta({ id: 'q', title: 'Q', cohortCodes: 'optional' })).toThrow(/collectResults/);
  });
});
