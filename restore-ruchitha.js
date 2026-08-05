const pool = require('./db');
const { randomUUID: uuidv4 } = require('crypto');

async function restoreRuchitha() {
  try {
    const email = 'ruchithagowda2825@gmail.com';
    const check = await pool.query('SELECT * FROM registrations WHERE email = $1', [email]);
    
    if (check.rows.length === 0) {
      console.log('Restoring Ruchitha Gowda (ruchithagowda2825@gmail.com)...');
      const eventRes = await pool.query('SELECT event_id FROM events ORDER BY created_at DESC LIMIT 1');
      const event_id = eventRes.rows[0]?.event_id || 1;
      const qr_token = uuidv4();

      await pool.query(
        `
        INSERT INTO registrations
        (
          registration_id, full_name, email, phone_number, ticket_type, total_amount, allowed_entries,
          used_entries, qr_token, payment_proof, payment_status, event_id,
          emergency_contact_name, emergency_contact, blood_group, gender, club_affiliation
        )
        VALUES (71, 'Ruchitha Gowda', $1, '', '3K', 0, 1, 0, $2, null, 'pending', $3, '', '', '', '', 'General Public / Other')
        `,
        [email, qr_token, event_id]
      );
      console.log('Successfully restored Ruchitha Gowda (registration_id 71)!');
    } else {
      console.log('Ruchitha Gowda is intact in database.');
    }
  } catch (err) {
    console.error('Error restoring Ruchitha:', err.message);
  } finally {
    await pool.end();
  }
}

restoreRuchitha();
