// api/user.js
import { v4 as uuidv4 } from 'uuid';
import { getClient } from './_db.js';

export default async function handler(req, res) {
  const client = await getClient();

  if (req.method === 'POST') {
    // create user
    const { name, phone } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = uuidv4();
    try {
      await client.query(
        'INSERT INTO users (id, phone, name, balance, joined) VALUES ($1, $2, $3, $4, now())',
        [id, phone || null, name, 1000]
      );
      const { rows } = await client.query('SELECT id, name, phone, balance, level, xp FROM users WHERE id = $1', [id]);
      return res.json({ ok: true, user: rows[0] });
    } catch (err) {
      // phone constraint
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'GET') {
    const id = req.query.id || req.query.userId;
    if (!id) return res.status(400).json({ error: 'user id required' });
    const { rows } = await client.query('SELECT id, name, phone, balance, level, xp FROM users WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    return res.json({ user: rows[0] });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
