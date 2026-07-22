import { put, del } from '@vercel/blob';
import { verifySessionToken, getBlobToken } from './_admin-utils.js';
import crypto from 'node:crypto';

const PREFIX = 'gallery/photos/';
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // client compresses to ~1600px/JPEG 85%, this is a generous ceiling

function parseDataUrl(dataUrl) {
  const match = /^data:image\/jpeg;base64,(.+)$/.exec(dataUrl || '');
  if (!match) return null;
  return Buffer.from(match[1], 'base64');
}

function pathFor(id) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9-]+$/.test(id)) return null;
  return `${PREFIX}${id}.jpg`;
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

function blobErrorMessage(err) {
  const msg = err && err.message ? err.message : '';
  if (msg.includes('No blob credentials') || msg.includes('ADMIN_READ_WRITE_TOKEN') || msg.includes('BLOB_READ_WRITE_TOKEN')) {
    return 'Kein Blob-Store verbunden — im Vercel-Projekt unter Storage einen Blob-Store anlegen und mit diesem Projekt verknüpfen, dann neu deployen.';
  }
  return 'Foto-Speicher ist gerade nicht erreichbar. Bitte später erneut versuchen.';
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const body = await readJsonBody(req);
    if (!body) return res.status(400).json({ error: 'Invalid JSON body' });
    if (!verifySessionToken(body.token)) return res.status(401).json({ error: 'Nicht angemeldet' });

    const buffer = parseDataUrl(body.image);
    if (!buffer) return res.status(400).json({ error: 'image must be a JPEG data URL' });
    if (buffer.byteLength > MAX_IMAGE_BYTES) return res.status(413).json({ error: 'Bild zu groß' });

    const id = crypto.randomUUID();
    const pathname = pathFor(id);

    try {
      const blob = await put(pathname, buffer, {
        access: 'public',
        contentType: 'image/jpeg',
        addRandomSuffix: false,
        allowOverwrite: false,
        token: getBlobToken(),
      });
      return res.status(200).json({ id, url: blob.url });
    } catch (err) {
      return res.status(502).json({ error: blobErrorMessage(err) });
    }
  }

  if (req.method === 'DELETE') {
    const body = await readJsonBody(req);
    if (!body) return res.status(400).json({ error: 'Invalid JSON body' });
    if (!verifySessionToken(body.token)) return res.status(401).json({ error: 'Nicht angemeldet' });

    const pathname = pathFor(body.id);
    if (!pathname) return res.status(400).json({ error: 'id is required' });

    try {
      await del(pathname, { token: getBlobToken() });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(502).json({ error: blobErrorMessage(err) });
    }
  }

  res.setHeader('Allow', 'POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
