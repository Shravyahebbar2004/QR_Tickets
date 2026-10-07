const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false
});

async function main() {
  console.log('--- Checking tables referencing registrations ---');
  
  // Check if there are any attendees or other dependent tables
  const tables = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  console.log('Tables in database:', tables.rows.map(r => r.table_name));

  for (const t of tables.rows.map(r => r.table_name)) {
    if (t === 'events') continue;
    try {
      const res = await pool.query(`SELECT COUNT(*) FROM ${t}`);
      console.log(`Table ${t} row count:`, res.rows[0].count);
    } catch(e) {
      console.log(`Could not count table ${t}:`, e.message);
    }
  }

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
