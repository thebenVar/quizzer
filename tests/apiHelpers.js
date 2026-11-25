// Fake Node request/response objects for testing the api/ handlers.
import { Readable } from 'node:stream';

export function fakeRequest({ method = 'GET', url = '/', headers = {}, body } = {}) {
  const raw = body === undefined ? [] : [Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))];
  const req = Readable.from(raw);
  req.method = method;
  req.url = url;
  req.headers = Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]));
  return req;
}

export function jsonRequest(body, headers = {}) {
  return fakeRequest({ method: 'POST', url: '/api/submit', headers: { 'Content-Type': 'application/json', ...headers }, body });
}

export async function call(handler, req) {
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(chunk) { this.body = chunk === undefined ? '' : String(chunk); },
  };
  await handler(req, res);
  let json = null;
  try { json = JSON.parse(res.body); } catch { json = null; }
  return { status: res.statusCode, headers: res.headers, json };
}
