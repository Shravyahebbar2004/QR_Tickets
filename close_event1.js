const pool = require('./db');

async function closeEvent1() {
  try {
    const res = await pool.query(
      `UPDATE events 
       SET slab1_deadline = '2026-08-01 00:00:00+00',
           slab2_deadline = '2026-08-01 00:00:00+00'
       WHERE event_id = 1
       RETURNING event_id, title, slab1_deadline, slab2_deadline`
    );

    console.log("✅ ONLINE REGISTRATION CLOSED FOR EVENT 1 IN DATABASE:");
    console.log(JSON.stringify(res.rows[0], null, 2));

  } catch (err) {
    console.error("Error closing event 1:", err);
  } finally {
    await pool.end();
  }
}

closeEvent1();
