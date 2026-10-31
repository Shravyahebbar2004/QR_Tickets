const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false
});

async function main() {
  console.log('--- Checking current Event 1 Date & Time ---');
  const check = await pool.query('SELECT event_id, title, event_date FROM events WHERE event_id = 1');
  console.log('Before update:', check.rows[0]);

  // 4:00 PM IST on Oct 31, 2026 => 2026-10-31 16:00:00 +05:30 => 2026-10-31T10:30:00.000Z
  const newDate = '2026-10-31T16:00:00+05:30';

  const updateRes = await pool.query(
    'UPDATE events SET event_date = $1 WHERE event_id = 1 RETURNING event_id, title, event_date',
    [newDate]
  );

  console.log('After update:', updateRes.rows[0]);
  const formattedIST = updateRes.rows[0].event_date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
  console.log('Formatted in Asia/Kolkata:', formattedIST);

  await pool.end();
}

main().catch(err => {
  console.error('Error updating event time:', err);
  process.exit(1);
});
