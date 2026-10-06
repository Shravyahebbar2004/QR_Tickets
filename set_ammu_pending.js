const pool = require('./db');

async function setAmmuPending() {
  try {
    const res = await pool.query(
      `UPDATE registrations 
       SET payment_status = 'pending' 
       WHERE registration_id = 15
       RETURNING registration_id, full_name, email, phone_number, ticket_type, payment_status, bib_number`
    );
    console.log("Updated Ammu Rajeev to pending:", res.rows[0]);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
setAmmuPending();
