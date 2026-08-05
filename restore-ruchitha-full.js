const pool = require('./db');
const { randomUUID: uuidv4 } = require('crypto');
const QRCode = require('qrcode');

async function restoreRuchithaFull() {
  try {
    const email = 'ruchithagowda2825@gmail.com';
    const name = 'Ruchitha Gowda';
    const bib_number = 3021;
    const ticket_type = '3K';

    const qr_token = uuidv4();
    const qr_code = await QRCode.toDataURL(qr_token);

    console.log(`Restoring complete record for ${name} (${email}) with BIB #${bib_number}...`);

    const updateRes = await pool.query(
      `
      UPDATE registrations
      SET
        full_name = $1,
        ticket_type = $2,
        payment_status = 'approved',
        bib_number = $3,
        qr_token = $4,
        qr_code = $5
      WHERE email = $6
      RETURNING *
      `,
      [name, ticket_type, bib_number, qr_token, qr_code, email]
    );

    if (updateRes.rows.length > 0) {
      console.log('Successfully updated Ruchitha Gowda:', updateRes.rows[0]);
    } else {
      console.log('No record found for email, inserting fresh record...');
      const eventRes = await pool.query('SELECT event_id FROM events ORDER BY created_at DESC LIMIT 1');
      const event_id = eventRes.rows[0]?.event_id || 1;

      const insertRes = await pool.query(
        `
        INSERT INTO registrations
        (
          registration_id, full_name, email, phone_number, ticket_type, total_amount, allowed_entries,
          used_entries, qr_token, qr_code, payment_proof, payment_status, event_id,
          emergency_contact_name, emergency_contact, blood_group, gender, club_affiliation, bib_number
        )
        VALUES (71, $1, $2, '', $3, 0, 1, 0, $4, $5, null, 'approved', $6, '', '', '', '', 'General Public / Other', $7)
        RETURNING *
        `,
        [name, email, ticket_type, qr_token, qr_code, event_id, bib_number]
      );
      console.log('Successfully inserted Ruchitha Gowda:', insertRes.rows[0]);
    }
  } catch (err) {
    console.error('Error restoring Ruchitha:', err.message);
  } finally {
    await pool.end();
  }
}

restoreRuchithaFull();
