// Cohort codes: six characters from an alphabet without look-alikes
// (no 0/O, 1/I/L), made on the server. A participant may type a code in any
// case and with spaces or hyphens; it is compared in upper case without them.
import { randomInt, randomUUID } from 'node:crypto';
import { cleanTypedText } from '../../app/utils.js';
import { COHORT_ALPHABET, COHORT_CODE_LENGTH, normalizeCohortCode } from '../../app/cohortCode.js';

export { COHORT_ALPHABET, COHORT_CODE_LENGTH, normalizeCohortCode };
export const COHORT_LABEL_MAX_LENGTH = 80;
const RAW_CODE_MAX_LENGTH = 20;

export function generateCohortCode(randomIndex = (max) => randomInt(max)) {
  let code = '';
  for (let index = 0; index < COHORT_CODE_LENGTH; index += 1) code += COHORT_ALPHABET[randomIndex(COHORT_ALPHABET.length)];
  return code;
}

// What a submission stores of the code it carried, even one that is not valid
// (so a facilitator can see what was typed): cleaned, upper case, at most 20 characters.
export function rawCohortCode(value) {
  if (typeof value !== 'string') return null;
  const cleaned = Array.from(cleanTypedText(value).replace(/[\s-]+/g, '').toUpperCase()).slice(0, RAW_CODE_MAX_LENGTH).join('');
  return cleaned === '' ? null : cleaned;
}

export function cleanCohortLabel(value) {
  if (typeof value !== 'string') return null;
  const label = Array.from(cleanTypedText(value).normalize('NFC').trim()).slice(0, COHORT_LABEL_MAX_LENGTH).join('').trim();
  return label === '' ? null : label;
}

// The cohort filter of the list and the statistics: absent or "" = every
// submission, "none" = submissions without a valid cohort, otherwise a cohort code.
// Returns { mode: 'all' | 'none' | 'code', code } or { error }.
export function parseCohortParam(value) {
  if (value === null || value === '' || value === 'all') return { mode: 'all', code: null };
  if (value === 'none') return { mode: 'none', code: null };
  const code = normalizeCohortCode(value);
  if (!code) return { error: '"cohort" must be a cohort code or "none".' };
  return { mode: 'code', code };
}

// The cohort a code stands for, for this quiz, when it is active; otherwise null.
export async function activeCohortFor(store, quizId, value) {
  const code = normalizeCohortCode(value);
  if (!code) return null;
  const cohort = await store.findCohortByCode(code);
  return cohort && cohort.active && cohort.quizId === quizId ? cohort : null;
}

// Creates a cohort with a new unique code (tries again on the rare clash).
export async function createCohort(store, { quizId, label, now = new Date(), randomIndex } = {}) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const cohort = {
      id: randomUUID(),
      code: generateCohortCode(randomIndex),
      label,
      quizId,
      active: true,
      createdAt: now.toISOString(),
    };
    const { created } = await store.createCohort(cohort);
    if (created) return cohort;
  }
  throw new Error('Could not make a unique cohort code.');
}
