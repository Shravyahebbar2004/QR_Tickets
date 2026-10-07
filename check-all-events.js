const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false
});

async function main() {
  const ev = await pool.query('SELECT event_id, title, event_date FROM events');
  console.log('ALL EVENTS IN DB:', ev.rows);

  for (const r of ev.rows) {
    const d = new Date(r.event_date);
    console.log(`Event ID ${r.event_id}: "${r.title}"`);
    console.log(` Raw DB Date:`, r.event_date);
    console.log(` IST Date String:`, d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }));
    console.log(` IST Time String:`, d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }));
  }

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
