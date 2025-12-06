// api/sell.js
import { v4 as uuidv4 } from 'uuid';
import { getClient } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userId, invId, price } = req.body || {};
  if (!userId || !invId || !price) return res.status(400).json({ error: 'userId+invId+price required' });
  const client = await getClient();

  // verify inventory ownership
  const inv = (await client.query('SELECT * FROM inventory WHERE id = $1 AND user_id = $2', [invId, userId])).rows[0];
  if (!inv) return res.status(404).json({ error: 'inventory not found' });

  const id = uuidv4();
  await client.query('BEGIN');
  try {
    await client.query('INSERT INTO shop_items (id, name, price, seller, created_at) VALUES ($1,$2,$3,$4,now())', [
      id, inv.item_name, price, userId
    ]);
    await client.query('DELETE FROM inventory WHERE id = $1', [invId]);
    await client.query('COMMIT');
    return res.json({ ok: true, id });
  } catch (err) {
    await client.query('ROLLBACK').catch(()=>{});
    return res.status(500).json({ error: err.message });
  }
}
