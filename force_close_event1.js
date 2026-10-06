const pool = require('./db');

async function forceCloseEvent1() {
  try {
    const res = await pool.query(
      `UPDATE events 
       SET event_status = 'CLOSED',
           slab1_deadline = '2026-08-01 00:00:00+00',
           slab2_deadline = '2026-08-01 00:00:00+00'
       WHERE event_id = 1
       RETURNING event_id, title, event_status, slab1_deadline, slab2_deadline`
    );

    console.log("✅ FORCE CLOSED EVENT 1 IN DATABASE:");
    console.log(JSON.stringify(res.rows[0], null, 2));

  } catch (err) {
    console.error("Error force closing event 1:", err);
  } finally {
    await pool.end();
  }
}

forceCloseEvent1();
