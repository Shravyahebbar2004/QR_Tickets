const pool = require('./db');

async function checkDeadlines() {
  try {
    const res = await pool.query(
      `SELECT event_id, title, event_date, slab1_deadline, slab2_deadline, registration_deadline, category, custom_pricing
       FROM events
       ORDER BY event_id ASC`
    );

    console.log("=== EVENT DEADLINES & CLOSING TIMINGS ===");
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error("Error checking deadlines:", err);
  } finally {
    await pool.end();
  }
}

checkDeadlines();
