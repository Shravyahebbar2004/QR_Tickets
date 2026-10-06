const pool = require('./db');

async function checkAround240() {
  try {
    const res = await pool.query(
      `SELECT registration_id, event_id, full_name, email, phone_number, ticket_type, payment_status, created_at
       FROM registrations
       WHERE registration_id BETWEEN 230 AND 250
       ORDER BY registration_id ASC`
    );
    console.log("Registrations 230-250:", res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
checkAround240();
