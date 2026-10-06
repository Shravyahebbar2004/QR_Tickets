const pool = require('./db');

async function checkPhoneFormats() {
  try {
    const res = await pool.query(
      `SELECT registration_id, full_name, email, phone_number, payment_status, event_id FROM registrations LIMIT 30`
    );
    console.log("Sample Phone & Email formats:");
    res.rows.forEach(r => {
      console.log(`ID: ${r.registration_id} | Name: "${r.full_name}" | Email: "${r.email}" | Phone: "${r.phone_number}" | Status: ${r.payment_status}`);
    });
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

checkPhoneFormats();
