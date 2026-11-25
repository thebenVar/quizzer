// Cohort codes as the participant types them (shared with the server, which
// makes the codes: api/_lib/cohorts.js). Six characters from an alphabet
// without look-alikes (no 0/O, 1/I/L); case, spaces and hyphens do not matter.

export const COHORT_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const COHORT_CODE_LENGTH = 6;
export const COHORT_CHECK_URL = 'api/cohort';
const CODE_PATTERN = new RegExp(`^[${COHORT_ALPHABET}]{${COHORT_CODE_LENGTH}}$`);

// The code in its stored form, or null when it cannot be a cohort code.
export function normalizeCohortCode(value) {
  if (typeof value !== 'string') return null;
  const code = value.replace(/[\s-]+/g, '').toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

// What the participant typed, tidied for display and sending (upper case, no spaces).
export function tidyCohortInput(value) {
  return String(value ?? '').replace(/[\s-]+/g, '').toUpperCase();
}

// Checks a code with the server before the quiz starts.
//   { status: 'none' }               nothing typed
//   { status: 'valid', code, label } active for this quiz
//   { status: 'invalid' }            not a code, or the server says it is not valid for this quiz
//   { status: 'unchecked', code }    the server could not be reached or could not answer
//                                    (offline, a static server without /api, a 5xx): start anyway,
//                                    the server decides when the results are sent
export async function checkCohortCode(quizId, typed, fetchFn = globalThis.fetch, url = COHORT_CHECK_URL) {
  const tidy = tidyCohortInput(typed);
  if (tidy === '') return { status: 'none' };
  const code = normalizeCohortCode(tidy);
  if (!code) return { status: 'invalid' };

  let response;
  try {
    response = await fetchFn(`${url}?${new URLSearchParams({ quiz: quizId, code }).toString()}`, { cache: 'no-store', credentials: 'same-origin' });
  } catch {
    return { status: 'unchecked', code };
  }
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (response.ok && body && body.ok === true && typeof body.label === 'string') {
    return { status: 'valid', code: body.code || code, label: body.label };
  }
  // A 400/404 from our own API (JSON with ok: false) is a real answer: not valid.
  const fromOurServer = body !== null && typeof body === 'object' && body.ok === false;
  if (fromOurServer && (response.status === 400 || response.status === 404)) return { status: 'invalid' };
  return { status: 'unchecked', code };
}

// Whether Start may go ahead after a check, for the quiz's "cohortCodes" setting.
// A code that could not be checked is accepted when the results are collected
// (the server checks it again when they arrive). When nothing is collected the
// code only unlocks the quiz, so "required" then needs a confirmed code: there
// is no later check. (A test already running is resumed without a new check.)
export function cohortAllowsStart(mode, result, { collectResults = true } = {}) {
  if (result.status === 'invalid') return false;
  if (mode === 'required' && result.status === 'none') return false;
  if (mode === 'required' && !collectResults && result.status === 'unchecked') return false;
  return true;
}

// The uiText key explaining why Start did not go ahead (see cohortAllowsStart).
export function cohortRefusalText(result) {
  if (result.status === 'none') return 'cohortCodeRequiredHint';
  if (result.status === 'unchecked') return 'cohortCheckUnavailable';
  return 'cohortInvalid';
}
