const pool = require('./db');
const { randomUUID: uuidv4 } = require('crypto');

async function recoverPastOtpsAsDrafts() {
  try {
    // Get latest active event ID
    const eventRes = await pool.query('SELECT event_id FROM events ORDER BY created_at DESC LIMIT 1');
    const latestEventId = eventRes.rows[0]?.event_id || 1;

    const uncompletedEmails = [
      'kumarismita1980@gmail.com',
      'sharmashreya1605@gmail.com',
      'peeelldee@gmail.com',
      'pradeep.j86@gmail.com',
      'narayananr2000@gmail.com'
    ];

    console.log(`Recovering ${uncompletedEmails.length} past OTP requests as Draft Registrations for Event ID ${latestEventId}...`);

    for (const email of uncompletedEmails) {
      // Check if already in registrations
      const check = await pool.query('SELECT * FROM registrations WHERE email = $1 AND event_id = $2', [email, latestEventId]);
      if (check.rows.length === 0) {
        const qr_token = uuidv4();
        await pool.query(
          `
          INSERT INTO registrations
          (
            full_name, email, phone_number, ticket_type, total_amount, allowed_entries,
            used_entries, qr_token, payment_proof, payment_status, event_id,
            emergency_contact_name, emergency_contact, blood_group, gender, club_affiliation
          )
          VALUES ($1, $2, $3, $4, 0, 1, 0, $5, null, 'draft', $6, '', '', '', '', '')
          `,
          ['Incomplete User', email, 'N/A (Past OTP)', 'solo', qr_token, latestEventId]
        );
        console.log(`Recovered draft for ${email}`);
      } else {
        console.log(`Skipped ${email} (already present in registrations)`);
      }
    }

    console.log('\nAll past OTP requests successfully recovered into Admin Portal under Incomplete / Drafts tab!');
  } catch (err) {
    console.error('Error recovering drafts:', err.message);
  } finally {
    await pool.end();
  }
}

recoverPastOtpsAsDrafts();
