import { put, del, list } from '@vercel/blob';
import { slugify, verifySessionToken } from './_dish-utils.js';

const PREFIX = 'dishes/';
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // client compresses to ~1600px/JPEG 85%, this is a generous ceiling

function pathFor(name) {
  if (typeof name !== 'string' || !name.trim()) return null;
  const slug = slugify(name);
  return slug ? `${PREFIX}${slug}.jpg` : null;
}

function parseDataUrl(dataUrl) {
  const match = /^data:image\/jpeg;base64,(.+)$/.exec(dataUrl || '');
  if (!match) return null;
  return Buffer.from(match[1], 'base64');
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { blobs } = await list({ prefix: PREFIX });
    return res.status(200).json({
      photos: blobs.map((b) => ({ pathname: b.pathname, url: b.url })),
    });
  }

  if (req.method === 'POST') {
    const body = await readJsonBody(req);
    if (!body) return res.status(400).json({ error: 'Invalid JSON body' });
    if (!verifySessionToken(body.token)) return res.status(401).json({ error: 'Nicht angemeldet' });

    const pathname = pathFor(body.name);
    if (!pathname) return res.status(400).json({ error: 'name is required' });

    const buffer = parseDataUrl(body.image);
    if (!buffer) return res.status(400).json({ error: 'image must be a JPEG data URL' });
    if (buffer.byteLength > MAX_IMAGE_BYTES) return res.status(413).json({ error: 'Bild zu groß' });

    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType: 'image/jpeg',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return res.status(200).json({ url: blob.url });
  }

  if (req.method === 'DELETE') {
    const body = await readJsonBody(req);
    if (!body) return res.status(400).json({ error: 'Invalid JSON body' });
    if (!verifySessionToken(body.token)) return res.status(401).json({ error: 'Nicht angemeldet' });

    const pathname = pathFor(body.name);
    if (!pathname) return res.status(400).json({ error: 'name is required' });

    await del(pathname);
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
