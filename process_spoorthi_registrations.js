const pool = require('./db');
const { randomUUID: uuidv4 } = require('crypto');

async function processRegistrations() {
  try {
    const email = 'spoorthi.socialmedia@gmail.com';
    const phone = '7338151287';
    const event_id = 1;

    console.log(`Processing registrations for ${email} / ${phone} on Event ID ${event_id}...`);

    // 1. Update existing registration (ID 240 - Vikram S) to payment_status = 'pending'
    const updateRes = await pool.query(
      `UPDATE registrations 
       SET payment_status = 'pending'
       WHERE registration_id = 240 AND email = $1
       RETURNING registration_id, full_name, email, phone_number, payment_status`,
      [email]
    );

    if (updateRes.rows.length > 0) {
      console.log('Updated Vikram S registration to pending:', updateRes.rows[0]);
    } else {
      console.log('No matching registration found for ID 240 with email', email);
    }

    // 2. Check if Manjunath R registration already exists for this email & event
    const checkManjunath = await pool.query(
      `SELECT * FROM registrations WHERE email = $1 AND event_id = $2 AND full_name ILIKE '%manjunath%'`,
      [email, event_id]
    );

    if (checkManjunath.rows.length > 0) {
      console.log('Manjunath R registration already exists:', checkManjunath.rows[0]);
      // Make sure it is also pending
      await pool.query(
        `UPDATE registrations SET payment_status = 'pending' WHERE registration_id = $1`,
        [checkManjunath.rows[0].registration_id]
      );
      console.log('Set existing Manjunath R registration to pending.');
    } else {
      // 3. Insert Manjunath R registration
      const qr_token = uuidv4();
      const insertRes = await pool.query(
        `INSERT INTO registrations
         (
           full_name, email, phone_number, ticket_type, total_amount, allowed_entries,
           used_entries, qr_token, payment_proof, payment_status, event_id,
           emergency_contact_name, emergency_contact, blood_group, gender, tshirt_size, club_affiliation, discount_amount
         )
         VALUES ($1, $2, $3, $4, $5, 1, 0, $6, $7, 'pending', $8, $9, $10, $11, $12, $13, $14, 0)
         RETURNING registration_id, full_name, email, phone_number, ticket_type, payment_status, created_at`,
        [
          'Manjunath R',
          email,
          phone,
          '5K',
          449,
          qr_token,
          'https://res.cloudinary.com/dnpi2xi7p/image/upload/v1786468763/qr_generator_uploads/wuuieov4jmpxwcgjwse9.png',
          event_id,
          'Spoorthi',
          '7338151287',
          'B+',
          'Male',
          '',
          'General Public / Other'
        ]
      );
      console.log('Created Manjunath R registration:', insertRes.rows[0]);
    }

    // 4. Verify all registrations for spoorthi.socialmedia@gmail.com
    const finalCheck = await pool.query(
      `SELECT registration_id, event_id, full_name, email, phone_number, ticket_type, payment_status, created_at
       FROM registrations
       WHERE email = $1 AND event_id = $2
       ORDER BY registration_id ASC`,
      [email, event_id]
    );

    console.log('\nFINAL STATUS OF ALL REGISTRATIONS FOR EVENT 1 under spoorthi.socialmedia@gmail.com:');
    console.log(JSON.stringify(finalCheck.rows, null, 2));

  } catch (err) {
    console.error('Error processing registrations:', err);
  } finally {
    await pool.end();
  }
}

processRegistrations();
