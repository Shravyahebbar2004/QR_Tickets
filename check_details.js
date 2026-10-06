const pool = require('./db');

async function check() {
  try {
    const regRes = await pool.query(
      `SELECT registration_id, event_id, full_name, email, phone_number, payment_status, created_at 
       FROM registrations 
       WHERE full_name ILIKE '%manjunath%' 
          OR email ILIKE '%spoorthi%' 
          OR phone_number ILIKE '%7338151287%'`
    );
    console.log("MATCHING REGISTRATIONS:");
    regRes.rows.forEach(r => console.log(r));

    const otpsRes = await pool.query(
      `SELECT * FROM email_otps 
       WHERE email ILIKE '%spoorthi%'`
    );
    console.log("\nMATCHING OTPS:");
    otpsRes.rows.forEach(r => console.log(r));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
