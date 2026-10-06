const pool = require('./db');

async function addColumnAndClose() {
  try {
    await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS event_status VARCHAR(50) DEFAULT 'ACTIVE'`);
    console.log("Added event_status column to events table");

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
    console.error("Error adding column / closing event 1:", err);
  } finally {
    await pool.end();
  }
}

addColumnAndClose();
