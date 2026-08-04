const pool = require('./db');
async function check() {
  try {
    const eventsRes = await pool.query('SELECT * FROM events WHERE event_id = 1');
    console.log('--- EVENT 1 DATA ---');
    console.log(eventsRes.rows);

    const regRes = await pool.query('SELECT * FROM registrations WHERE event_id = 1');
    console.log('--- REGISTRATIONS FOR EVENT 1 ---');
    console.log(regRes.rows);
  } catch (err) {
    console.error('Error fetching event 1:', err);
  } finally {
    await pool.end();
  }
}
check();
