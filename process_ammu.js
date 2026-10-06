const pool = require('./db');

async function processAmmu() {
  try {
    const regId = 15;
    const res = await pool.query(
      `UPDATE registrations 
       SET payment_status = 'pending' 
       WHERE registration_id = $1
       RETURNING registration_id, full_name, email, phone_number, ticket_type, payment_status, bib_number`,
      [regId]
    );

    console.log("Updated Ammu Rajeev status to pending:", res.rows[0]);

    const all = await pool.query(
      `SELECT registration_id, full_name, email, phone_number, ticket_type, payment_status, bib_number
       FROM registrations
       WHERE email ILIKE '%nandakishore8@gmail.com%'
       ORDER BY registration_id ASC`
    );

    console.log("\nALL REGISTRATIONS FOR nandakishore8@gmail.com:");
    console.log(JSON.stringify(all.rows, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

processAmmu();
