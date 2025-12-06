// api/shop.js
import { v4 as uuidv4 } from 'uuid';
import { getClient } from './_db.js';

export default async function handler(req, res) {
  const client = await getClient();

  if (req.method === 'GET') {
    const { rows } = await client.query('SELECT id, name, price, seller, created_at FROM shop_items ORDER BY created_at DESC');
    return res.json({ items: rows });
  }

  if (req.method === 'POST') {
    const { name, price, seller } = req.body || {};
    if (!name || !price) return res.status(400).json({ error: 'name+price required' });
    const id = uuidv4();
    await client.query('INSERT INTO shop_items (id, name, price, seller, created_at) VALUES ($1,$2,$3,$4,now())', [
      id, name, price, seller || null
    ]);
    return res.json({ ok: true, id });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
