const pool = require('./db');

async function checkEventsAll() {
  try {
    const res = await pool.query(`SELECT * FROM events ORDER BY event_id ASC`);
    console.log("=== ALL EVENTS & COLUMNS ===");
    console.log(JSON.stringify(res.rows, null, 2));

    const totalApproved = await pool.query(
      `SELECT COUNT(*) FROM registrations WHERE event_id = 1 AND payment_status != 'draft'`
    );
    console.log("\nTOTAL NON-DRAFT REGISTRATIONS FOR EVENT 1:", totalApproved.rows[0].count);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkEventsAll();
