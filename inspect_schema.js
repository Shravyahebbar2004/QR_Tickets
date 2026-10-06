const pool = require('./db');

async function inspectSchema() {
  try {
    const res = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'registrations' 
       ORDER BY ordinal_position`
    );
    console.log("REGISTRATIONS COLUMNS:", res.rows);

    const reg240 = await pool.query(
      `SELECT * FROM registrations WHERE registration_id = 240`
    );
    console.log("\nREGISTRATION 240 DETAILS:", reg240.rows[0]);

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
inspectSchema();
