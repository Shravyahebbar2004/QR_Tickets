const pool = require('./db');

async function alterRegistrationsTable() {
  try {
    console.log('Adding tshirt_size column to registrations table...');
    await pool.query(`
      ALTER TABLE registrations
      ADD COLUMN IF NOT EXISTS tshirt_size VARCHAR(50);
    `);
    console.log('Successfully added tshirt_size column.');
  } catch (err) {
    console.error('Error altering table:', err.message);
  } finally {
    await pool.end();
  }
}

alterRegistrationsTable();
