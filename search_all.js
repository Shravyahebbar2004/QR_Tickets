const pool = require('./db');

async function searchAll() {
  try {
    const res = await pool.query(
      `SELECT registration_id, event_id, full_name, email, phone_number, payment_status, created_at
       FROM registrations
       WHERE full_name ILIKE '%manjunath%'
          OR full_name ILIKE '%spoorthi%'
          OR email ILIKE '%spoorthi%'
          OR phone_number ILIKE '%7338151287%'`
    );
    console.log("ALL MATCHES:", res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
searchAll();
