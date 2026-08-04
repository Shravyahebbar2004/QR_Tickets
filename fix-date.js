const pool = require('./db');

async function fixEventDate() {
  try {
    // 01:00 UTC = 06:30 AM IST
    const res = await pool.query(
      "UPDATE events SET event_date = '2026-08-16 01:00:00+00' WHERE event_id = 1 RETURNING event_date"
    );
    console.log('UPDATED EVENT DATE IN DB:', res.rows[0]);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

fixEventDate();
