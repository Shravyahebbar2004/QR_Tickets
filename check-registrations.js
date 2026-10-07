const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false
});

async function main() {
  const events = await pool.query('SELECT event_id, title, category FROM events');
  console.log('EVENTS:', events.rows);

  for (const ev of events.rows) {
    const regs = await pool.query(
      "SELECT registration_id, full_name, email, payment_status, allowed_entries, created_at FROM registrations WHERE event_id = $1 ORDER BY registration_id ASC",
      [ev.event_id]
    );
    console.log(`\n--- Registrations for Event ID ${ev.event_id}: "${ev.title}" (Total Count: ${regs.rows.length}) ---`);
    console.table(regs.rows);
  }

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
