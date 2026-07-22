import { checkPassword, createSessionToken } from './_dish-utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const password = body && body.password;
  if (!password) {
    return res.status(400).json({ error: 'password is required' });
  }

  let valid;
  try {
    valid = checkPassword(password);
  } catch {
    return res.status(500).json({ error: 'Admin login is not configured on the server' });
  }

  if (!valid) {
    return res.status(401).json({ error: 'Falsches Passwort' });
  }

  return res.status(200).json({ token: createSessionToken() });
}
