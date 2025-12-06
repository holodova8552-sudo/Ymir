// api/_db.js
import pkg from 'pg';
const { Client } = pkg;

let client;

export async function getClient() {
  if (client && client._connected) return client;
  client = new Client({
    connectionString: process.env.DATABASE_URL,
    // SSL mode may be required depending on provider:
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  client._connected = true;
  return client;
}
