// api/leaderboard.js
import { getClient } from './_db.js';

export default async function handler(req, res) {
  const client = await getClient();
  const { rows } = await client.query('SELECT name, balance FROM users ORDER BY balance DESC LIMIT 10');
  return res.json({ top: rows });
}
