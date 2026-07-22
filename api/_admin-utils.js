import crypto from 'node:crypto';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h, matches the previous sessionStorage-based admin session

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

export function slugify(name) {
  return String(name)
    .normalize('NFKD')
    .replace(COMBINING_DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getSecret() {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error('ADMIN_PASSWORD is not configured');
  }
  return secret;
}

// @vercel/blob liest ohne explizites `token` nur BLOB_READ_WRITE_TOKEN automatisch —
// unser Store-Token heißt im Projekt aber ADMIN_READ_WRITE_TOKEN, daher explizit reichen.
export function getBlobToken() {
  const token = process.env.ADMIN_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('ADMIN_READ_WRITE_TOKEN is not configured');
  }
  return token;
}

export function checkPassword(password) {
  const secret = getSecret();
  const a = Buffer.from(String(password || ''));
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createSessionToken() {
  const secret = getSecret();
  const expires = Date.now() + SESSION_TTL_MS;
  const hmac = crypto.createHmac('sha256', secret).update(String(expires)).digest('hex');
  return `${expires}.${hmac}`;
}

export function verifySessionToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return false;
  const [expiresStr, hmac] = token.split('.');
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  let secret;
  try {
    secret = getSecret();
  } catch {
    return false;
  }
  const expected = crypto.createHmac('sha256', secret).update(expiresStr).digest('hex');
  const a = Buffer.from(hmac || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
