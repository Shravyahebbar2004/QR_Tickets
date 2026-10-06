const pool = require('./db');

async function checkTharika() {
  try {
    const res = await pool.query(
      `SELECT registration_id, event_id, full_name, email, phone_number, ticket_type, payment_status, bib_number, qr_token, qr_code, created_at
       FROM registrations
       WHERE email ILIKE '%aakash2001spike@outlook.com%'
          OR phone_number ILIKE '%7892984274%'
          OR full_name ILIKE '%Tharika%'
          OR bib_number = 5075`
    );
    console.log("THARIKA M L REGISTRATION DETAILS:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

checkTharika();
