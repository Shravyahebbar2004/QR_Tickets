const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function alterDb() {
  try {
    console.log('Adding bulk pass columns to events table...');
    await pool.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS bulk_pass_price NUMERIC,
      ADD COLUMN IF NOT EXISTS bulk_pass_entries INTEGER;
    `);
    console.log('Bulk columns added successfully.');
  } catch (error) {
    console.error('Error altering table:', error);
  } finally {
    await pool.end();
  }
}

alterDb();
