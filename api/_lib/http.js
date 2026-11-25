// Small helpers for the Vercel Node functions in api/. They use only the plain
// Node request/response API, so the handlers also run in tests with fakes.

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function sendJson(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  res.end(JSON.stringify(body));
}

export function sendError(res, status, message, headers) {
  sendJson(res, status, { ok: false, error: message }, headers);
}

export function header(req, name) {
  const value = req.headers ? req.headers[name.toLowerCase()] : undefined;
  return Array.isArray(value) ? value[0] : value;
}

// Reads and parses a JSON request body of at most `limit` bytes.
// Throws HttpError 413 (too large), 415 (not JSON) or 400 (unreadable).
export async function readJsonBody(req, limit) {
  const contentType = String(header(req, 'content-type') || '').toLowerCase();
  if (!/^application\/json\s*(;|$)/.test(contentType)) {
    throw new HttpError(415, 'Send the results as JSON (Content-Type: application/json).');
  }
  const declared = Number(header(req, 'content-length'));
  if (Number.isFinite(declared) && declared > limit) {
    throw new HttpError(413, `The request is too large (limit ${limit} bytes).`);
  }

  // Read the stream ourselves, stopping as soon as the limit is passed.
  const chunks = [];
  let size = 0;
  if (typeof req[Symbol.asyncIterator] === 'function' && !req.readableEnded) {
    for await (const chunk of req) {
      const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      size += buffer.length;
      if (size > limit) throw new HttpError(413, `The request is too large (limit ${limit} bytes).`);
      chunks.push(buffer);
    }
  }
  let raw = Buffer.concat(chunks).toString('utf8');

  // A platform may already have read the body (Vercel's req.body helper).
  if (size === 0) {
    let preRead;
    try {
      preRead = req.body;
    } catch {
      throw new HttpError(400, 'The request body is not valid JSON.');
    }
    if (typeof preRead === 'string' || Buffer.isBuffer(preRead)) {
      raw = preRead.toString();
    } else if (preRead !== undefined && preRead !== null) {
      raw = JSON.stringify(preRead);
    }
    if (Buffer.byteLength(raw) > limit) throw new HttpError(413, `The request is too large (limit ${limit} bytes).`);
  }

  if (raw.trim() === '') throw new HttpError(400, 'The request body is empty.');
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'The request body is not valid JSON.');
  }
}

export function queryParams(req) {
  return new URL(req.url || '/', 'http://localhost').searchParams;
}
