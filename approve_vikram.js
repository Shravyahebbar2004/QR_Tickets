const pool = require('./db');
const QRCode = require('qrcode');

async function approveVikram() {
  try {
    const regId = 240;
    
    // Fetch current details for ID 240
    const check = await pool.query(`SELECT * FROM registrations WHERE registration_id = $1`, [regId]);
    if (check.rows.length === 0) {
      console.log('Registration 240 not found!');
      return;
    }

    const reg = check.rows[0];
    let qrCode = reg.qr_code;
    if (!qrCode && reg.qr_token) {
      qrCode = await QRCode.toDataURL(reg.qr_token);
    }

    const updateRes = await pool.query(
      `UPDATE registrations 
       SET payment_status = 'approved',
           qr_code = COALESCE(qr_code, $1)
       WHERE registration_id = $2
       RETURNING registration_id, full_name, email, phone_number, ticket_type, payment_status, bib_number`,
      [qrCode, regId]
    );

    console.log('Updated Vikram S to approved:', updateRes.rows[0]);

    // Check all registrations for spoorthi.socialmedia@gmail.com
    const all = await pool.query(
      `SELECT registration_id, event_id, full_name, email, phone_number, ticket_type, payment_status, bib_number
       FROM registrations
       WHERE email = 'spoorthi.socialmedia@gmail.com' AND event_id = 1
       ORDER BY registration_id ASC`
    );

    console.log('\nAll registrations for spoorthi.socialmedia@gmail.com in Event 1:');
    console.log(JSON.stringify(all.rows, null, 2));

  } catch (err) {
    console.error('Error approving Vikram:', err);
  } finally {
    await pool.end();
  }
}

approveVikram();
