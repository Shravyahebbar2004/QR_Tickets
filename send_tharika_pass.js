const pool = require('./db');
const nodemailer = require('nodemailer');

async function sendTharikaEmail() {
  try {
    const res = await pool.query(
      `SELECT r.*, e.title, e.venue, e.event_date, e.organizer_name, e.category, e.custom_pricing, e.whatsapp_link
       FROM registrations r
       JOIN events e ON r.event_id = e.event_id
       WHERE r.registration_id = 268`
    );

    if (res.rows.length === 0) {
      console.log('Tharika registration 268 not found');
      return;
    }

    const attendee = res.rows[0];
    console.log("Found Tharika registration:", attendee.full_name, attendee.email, "BIB:", attendee.bib_number);

    // Temporarily set to pending so admin can re-approve if needed
    await pool.query(
      `UPDATE registrations SET payment_status = 'pending' WHERE registration_id = 268`
    );
    console.log("Set Tharika M L status to 'pending' (BIB #5075 preserved)");

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

sendTharikaEmail();
