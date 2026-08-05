const pool = require('./db');

async function alterRegistrationsTable() {
  try {
    console.log('Adding club_affiliation column to registrations table...');
    await pool.query(`
      ALTER TABLE registrations
      ADD COLUMN IF NOT EXISTS club_affiliation VARCHAR(255);
    `);
    console.log('Successfully added club_affiliation column.');
  } catch (err) {
    console.error('Error altering table:', err.message);
  } finally {
    await pool.end();
  }
}

alterRegistrationsTable();
