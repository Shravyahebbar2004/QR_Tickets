const pool = require('./db');

async function checkEvents() {
  try {
    const res = await pool.query(`SELECT * FROM events ORDER BY event_id ASC`);
    console.log("ALL EVENTS IN DATABASE:");
    console.log(JSON.stringify(res.rows, null, 2));

    const regCounts = await pool.query(
      `SELECT event_id, COUNT(*) as count FROM registrations GROUP BY event_id`
    );
    console.log("\nREGISTRATION COUNTS PER EVENT:");
    console.log(JSON.stringify(regCounts.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

checkEvents();
