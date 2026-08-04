const pool = require('./db');

async function updateDate() {
  try {
    // 2026-08-16 06:30:00 IST
    const updateRes = await pool.query(
      "UPDATE events SET event_date = '2026-08-16 06:30:00+05:30' WHERE event_id = 1 RETURNING event_date"
    );
    console.log('UPDATED EVENT 1 DATE:', updateRes.rows[0]);
  } catch (err) {
    console.error('Error updating date:', err);
  } finally {
    await pool.end();
  }
}

updateDate();
