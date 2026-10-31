const pool = require('./db');

async function main() {
  console.log('--- Checking current Event 1 Date & Time ---');
  const check = await pool.query('SELECT event_id, title, event_date, event_date::text as raw_text FROM events WHERE event_id = 1');
  console.log('Before update:', check.rows[0]);

  // 4:00 PM IST on Oct 31, 2026 = 16:00 IST = 10:30:00 UTC
  const newDate = '2026-10-31 10:30:00';

  const updateRes = await pool.query(
    'UPDATE events SET event_date = $1 WHERE event_id = 1 RETURNING event_id, title, event_date, event_date::text as raw_text',
    [newDate]
  );

  console.log('After update:', updateRes.rows[0]);
  const formattedIST = updateRes.rows[0].event_date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
  console.log('Formatted in Asia/Kolkata:', formattedIST);

  await pool.end();
}

main().catch(err => {
  console.error('Error updating event time:', err);
  process.exit(1);
});
