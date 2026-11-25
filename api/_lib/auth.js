// The facilitator password: "Authorization: Bearer <password>" matching
// FACILITATOR_PASSWORD, percent-encoded (encodeURIComponent) so any characters
// fit in a header. Without FACILITATOR_PASSWORD every request is refused.
import { createHash, timingSafeEqual } from 'node:crypto';
import { header, sendError } from './http.js';

// Compares the two passwords in constant time (hashing first makes the lengths equal).
export function passwordMatches(given, expected) {
  if (typeof expected !== 'string' || expected === '' || typeof given !== 'string') return false;
  const left = createHash('sha256').update(given, 'utf8').digest();
  const right = createHash('sha256').update(expected, 'utf8').digest();
  return timingSafeEqual(left, right);
}

// The password from "Bearer <password>": everything after the first space, so
// a password's own leading spaces are kept; percent-decoded.
export function bearerToken(req) {
  const value = String(header(req, 'authorization') || '');
  if (value.slice(0, 7).toLowerCase() !== 'bearer ') return null;
  try {
    return decodeURIComponent(value.slice(7));
  } catch {
    return null;
  }
}

// True when the request carries the facilitator password; otherwise sends the
// refusal (503 when no password is configured, 401 when it is wrong) and returns false.
export function requireFacilitator(req, res, env = process.env) {
  const expected = env.FACILITATOR_PASSWORD;
  if (typeof expected !== 'string' || expected === '') {
    sendError(res, 503, 'The results page is not set up: FACILITATOR_PASSWORD is not configured.');
    return false;
  }
  const token = bearerToken(req);
  if (!token || !passwordMatches(token, expected)) {
    sendError(res, 401, 'Wrong password.', { 'WWW-Authenticate': 'Bearer' });
    return false;
  }
  return true;
}

export function parseDateParam(value, name) {
  if (value === null || value === '') return { value: null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { error: `"${name}" must be a date (YYYY-MM-DD) or an ISO date-time.` };
  return { value: date.toISOString() };
}
