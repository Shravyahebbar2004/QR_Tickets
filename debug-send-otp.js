const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function debugOtp() {
  try {
    const cleanEmail = 'rotaractyelahanka.events@gmail.com';
    const event_id = '1';
    console.log('Testing DB operations for /api/send-otp...');

    // 1. Clean old OTPs
    await pool.query('DELETE FROM email_otps WHERE email = $1', [cleanEmail]);
    console.log('✅ Deleted old OTPs');

    // 2. Insert new OTP
    const otp = '123456';
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await pool.query(
      'INSERT INTO email_otps (email, otp, expires_at) VALUES ($1, $2, $3)',
      [cleanEmail, otp, expiresAt]
    );
    console.log('✅ Inserted new OTP');

    // 3. Draft Auto-Save
    console.log('Testing draft insert...');
    const full_name = 'Test User';
    const phone_number = '9845276525';
    const ticket_type = 'solo';
    const total_amount = 0;
    const qr_token = 'test-token-123';
    const emergency_contact_name = 'Test';
    const emergency_contact = '9845276525';
    const blood_group = 'O+';
    const gender = 'Male';
    const club_affiliation = 'General Public';

    await pool.query(
      `DELETE FROM registrations WHERE email = $1 AND event_id = $2 AND payment_status = 'draft'`,
      [cleanEmail, event_id]
    );
    console.log('✅ Deleted old draft');

    await pool.query(
      `
      INSERT INTO registrations
      (
        full_name, email, phone_number, ticket_type, total_amount, allowed_entries,
        used_entries, qr_token, payment_proof, payment_status, event_id,
        emergency_contact_name, emergency_contact, blood_group, gender, club_affiliation
      )
      VALUES ($1, $2, $3, $4, $5, 1, 0, $6, $7, 'draft', $8, $9, $10, $11, $12, $13)
      `,
      [
        full_name, cleanEmail, phone_number, ticket_type, total_amount,
        qr_token, null, event_id, emergency_contact_name, emergency_contact,
        blood_group, gender, club_affiliation
      ]
    );
    console.log('✅ Inserted new draft');
    
  } catch (e) {
    console.error('❌ DB ERROR:', e.message);
  } finally {
    await pool.end();
  }
}

debugOtp();
