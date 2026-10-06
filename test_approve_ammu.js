const pool = require('./db');
const { randomUUID: uuidv4 } = require('crypto');
const QRCode = require('qrcode');

async function approveAmmuDirect() {
  try {
    const id = 15;
    const user = await pool.query(
      `SELECT r.*, e.title, e.venue, e.event_date, e.organizer_name, e.category, e.custom_pricing, e.whatsapp_link
       FROM registrations r
       JOIN events e ON r.event_id = e.event_id
       WHERE r.registration_id = $1`,
      [id]
    );

    if (user.rows.length === 0) {
      console.log('User not found');
      return;
    }

    const attendee = user.rows[0];
    const generated_bib_number = attendee.bib_number || 3008;
    const qr_code = await QRCode.toDataURL(attendee.qr_token || uuidv4());

    await pool.query(
      `UPDATE registrations
       SET payment_status = 'approved',
           qr_code = $1,
           bib_number = $3
       WHERE registration_id = $2
       RETURNING registration_id, full_name, email, payment_status, bib_number`,
      [qr_code, id, generated_bib_number]
    );

    console.log('✅ AMMU RAJEEV APPROVED IN DB:', attendee.full_name, 'BIB:', generated_bib_number);

  } catch (err) {
    console.error('Error approving Ammu:', err);
  } finally {
    await pool.end();
  }
}

approveAmmuDirect();
