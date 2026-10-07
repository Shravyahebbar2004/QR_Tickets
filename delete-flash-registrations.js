const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false
});

async function main() {
  console.log('--- Deleting all registrations for Event ID 1 (Flash Sale Reset) ---');

  const deleteRes = await pool.query(
    "DELETE FROM registrations WHERE event_id = 1 RETURNING registration_id, full_name, email, allowed_entries"
  );

  console.log(`Successfully deleted ${deleteRes.rowCount} registration(s):`, deleteRes.rows);

  // Check new total registrations count
  const countRes = await pool.query(
    "SELECT COALESCE(SUM(CASE WHEN allowed_entries > 0 THEN allowed_entries ELSE 1 END), 0) as count FROM registrations WHERE event_id = 1 AND payment_status != 'draft'"
  );

  console.log(`New total registrations count for Event ID 1: ${countRes.rows[0].count} / 50`);

  await pool.end();
}

main().catch(err => {
  console.error('Error deleting registrations:', err);
  process.exit(1);
});
