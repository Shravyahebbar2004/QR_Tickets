const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false
});

async function main() {
  const evRes = await pool.query("SELECT * FROM events WHERE event_id = 1");
  console.log("Event 1 data:", JSON.stringify(evRes.rows[0], null, 2));

  const regsRes = await pool.query("SELECT * FROM registrations WHERE event_id = 1");
  console.log("Event 1 registrations:", JSON.stringify(regsRes.rows, null, 2));

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
