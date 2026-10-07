const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false
});

async function main() {
  const summary = await pool.query("SELECT * FROM registration_summary");
  console.log("registration_summary:", summary.rows);
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
