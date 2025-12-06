// api/deck.js
import { getClient } from './_db.js';

export default async function handler(req, res) {
  const client = await getClient();
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const { rows } = await client.query('SELECT id, item_name FROM inventory WHERE user_id = $1 LIMIT 5', [userId]);
  return res.json({ deck: rows });
}
