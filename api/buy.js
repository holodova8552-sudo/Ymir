// api/buy.js
import { getClient } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const client = await getClient();
  const { userId, listingId } = req.body || {};
  if (!userId || !listingId) return res.status(400).json({ error: 'userId+listingId required' });

  try {
    await client.query('BEGIN');

    const userRes = await client.query('SELECT id, balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (!userRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'user not found' }); }
    const user = userRes.rows[0];

    const listingRes = await client.query('SELECT id, name, price FROM shop_items WHERE id = $1', [listingId]);
    if (!listingRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'listing not found' }); }
    const listing = listingRes.rows[0];

    if (user.balance < listing.price) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'insufficient balance' }); }

    // deduct
    await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [listing.price, userId]);

    // add to inventory
    const invId = require('uuid').v4();
    await client.query('INSERT INTO inventory (id, user_id, item_name, created_at) VALUES ($1,$2,$3,now())', [
      invId, userId, listing.name
    ]);

    // remove listing
    await client.query('DELETE FROM shop_items WHERE id = $1', [listingId]);

    await client.query('COMMIT');

    const newBal = (await client.query('SELECT balance FROM users WHERE id = $1', [userId])).rows[0].balance;
    return res.json({ ok: true, invId, newBal });

  } catch (err) {
    await client.query('ROLLBACK').catch(()=>{});
    return res.status(500).json({ error: err.message });
  }
}
