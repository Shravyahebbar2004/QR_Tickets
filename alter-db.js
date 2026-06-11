const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function alterDb() {
  try {
    console.log('Adding slab columns to events table...');
    await pool.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS slab1_price NUMERIC,
      ADD COLUMN IF NOT EXISTS slab1_deadline TIMESTAMP,
      ADD COLUMN IF NOT EXISTS slab2_price NUMERIC,
      ADD COLUMN IF NOT EXISTS slab2_deadline TIMESTAMP,
      ADD COLUMN IF NOT EXISTS slab3_price NUMERIC,
      ADD COLUMN IF NOT EXISTS slab3_deadline TIMESTAMP;
    `);
    console.log('Columns added successfully.');
  } catch (error) {
    console.error('Error altering table:', error);
  } finally {
    await pool.end();
  }
}

alterDb();
