const pool = require('./db');

async function checkNandakishore() {
  try {
    const res = await pool.query(
      `SELECT registration_id, event_id, full_name, email, phone_number, ticket_type, payment_status, bib_number, qr_token, qr_code, created_at 
       FROM registrations 
       WHERE email ILIKE '%nandakishore8@gmail.com%' 
          OR phone_number ILIKE '%7904649393%' 
          OR full_name ILIKE '%Ammu%'`
    );
    console.log("NANDAKISHORE REGISTRATIONS:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
checkNandakishore();
