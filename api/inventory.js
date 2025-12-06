// api/inventory.js
import { getClient } from './_db.js';

export default async function handler(req, res) {
  const client = await getClient();
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const { rows } = await client.query('SELECT id, item_name, created_at FROM inventory WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return res.json({ items: rows });
}
