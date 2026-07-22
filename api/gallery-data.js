import { put, list } from '@vercel/blob';
import { verifySessionToken, getBlobToken } from './_admin-utils.js';

const DATA_PATH = 'gallery/data.json';

// Deckt sich 1:1 mit den bisherigen window.GALERIE_DATA / window.ALBEN_DATA
// Blöcken in galerie.html — dient nur als einmaliger Startzustand.
const SEED = {
  albums: {
    interieur: { title: 'Café & Interieur', order: 1, cover: 'interieur-hero-webp', subalbums: null },
    'kaffee-kueche': { title: 'Kaffee & Küche', order: 2, cover: 'kaffee-kueche-kaffee-jpeg', subalbums: null },
    'team-geschichte': { title: 'Team & Geschichte', order: 3, cover: 'team-geschichte-team-jpg', subalbums: null },
    sonstige: { title: 'Weitere Eindrücke', order: 99, cover: null, subalbums: null },
  },
  photos: [
    { id: 'interieur-hero-webp', src: 'hero.WEBP', source: 'local', title: 'Das Café', cat: 'Interieur', orient: 'landscape', album: 'interieur', subalbum: null },
    { id: 'interieur-cafe-innen-jpg', src: 'cafe-innen.JPG', source: 'local', title: 'Innenraum', cat: 'Interieur', orient: 'both', album: 'interieur', subalbum: null },
    { id: 'kaffee-kueche-kaffee-jpeg', src: 'kaffee.jpeg', source: 'local', title: 'Specialty Coffee', cat: 'Kaffee', orient: 'portrait', album: 'kaffee-kueche', subalbum: null },
    { id: 'kaffee-kueche-fruehstueck-jpeg', src: 'fruehstueck.jpeg', source: 'local', title: 'Frühstück', cat: 'Frühstück', orient: 'portrait', album: 'kaffee-kueche', subalbum: null },
    { id: 'kaffee-kueche-essen-jpg-jpg', src: 'essen.JPG.jpg', source: 'local', title: 'Mittagessen', cat: 'Essen', orient: 'landscape', album: 'kaffee-kueche', subalbum: null },
    { id: 'team-geschichte-team-jpg', src: 'team.JPG', source: 'local', title: 'Unser Team', cat: 'Team', orient: 'landscape', album: 'team-geschichte', subalbum: null },
    { id: 'team-geschichte-story-bild-webp', src: 'story-bild.WEBP', source: 'local', title: 'Unsere Geschichte', cat: 'Geschichte', orient: 'landscape', album: 'team-geschichte', subalbum: null },
    { id: 'sonstige-tisch-jpg', src: 'tisch.jpg', source: 'local', title: 'tisch', cat: 'Neu', orient: 'portrait', album: 'sonstige', subalbum: null },
  ],
};

async function readData() {
  const { blobs } = await list({ prefix: DATA_PATH, token: getBlobToken() });
  const match = blobs.find((b) => b.pathname === DATA_PATH);
  if (!match) return null;
  const res = await fetch(match.url, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

async function writeData(data) {
  await put(DATA_PATH, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
    token: getBlobToken(),
  });
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
  return 'Galerie-Speicher ist gerade nicht erreichbar. Bitte später erneut versuchen.';
}

function isValidStructure(albums, photos) {
  if (!albums || typeof albums !== 'object' || Array.isArray(albums)) return false;
  if (!Array.isArray(photos)) return false;
  for (const slug of Object.keys(albums)) {
    const a = albums[slug];
    if (!a || typeof a.title !== 'string' || !a.title.trim()) return false;
  }
  for (const p of photos) {
    if (!p || typeof p.id !== 'string' || !p.id) return false;
    if (typeof p.src !== 'string' || !p.src) return false;
    if (typeof p.album !== 'string' || !albums[p.album]) return false;
    if (p.source !== 'local' && p.source !== 'blob') return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      let data = await readData();
      if (!data) {
        data = { ...SEED, version: 1, updatedAt: new Date().toISOString() };
        await writeData(data);
      }
      return res.status(200).json(data);
    } catch (err) {
      return res.status(502).json({ error: blobErrorMessage(err) });
    }
  }

  if (req.method === 'PUT') {
    const body = await readJsonBody(req);
    if (!body) return res.status(400).json({ error: 'Invalid JSON body' });
    if (!verifySessionToken(body.token)) return res.status(401).json({ error: 'Nicht angemeldet' });
    if (!isValidStructure(body.albums, body.photos)) {
      return res.status(400).json({ error: 'Ungültige Daten' });
    }

    try {
      const current = await readData();
      if (current && body.version !== current.version) {
        return res.status(409).json({ error: 'Daten wurden zwischenzeitlich geändert', current });
      }
      const next = {
        albums: body.albums,
        photos: body.photos,
        version: (current?.version || 0) + 1,
        updatedAt: new Date().toISOString(),
      };
      await writeData(next);
      return res.status(200).json(next);
    } catch (err) {
      return res.status(502).json({ error: blobErrorMessage(err) });
    }
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
}
