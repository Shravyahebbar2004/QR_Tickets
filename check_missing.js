const pool = require('./db');

async function checkMissing() {
  try {
    const res = await pool.query(
      `SELECT * FROM registrations WHERE registration_id BETWEEN 237 AND 242 ORDER BY registration_id`
    );
    console.log("All rows 237-242:", res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
checkMissing();
