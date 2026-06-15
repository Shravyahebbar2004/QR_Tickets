const pool = require('./db');

async function alterEventsTable() {
  try {
    console.log('Adding custom_pricing column to events table...');
    await pool.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS custom_pricing JSONB DEFAULT '[]'::jsonb;
    `);
    console.log('Successfully added custom_pricing column.');
  } catch (err) {
    console.error('Error altering table:', err.message);
  } finally {
    process.exit();
  }
}

alterEventsTable();
