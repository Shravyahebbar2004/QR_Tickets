const pool = require('./db');

async function checkPastOtpsAndFiles() {
  try {
    console.log('=== PAST OTPS IN DATABASE ===');
    const otps = await pool.query('SELECT * FROM email_otps ORDER BY created_at DESC');
    console.log(`Found ${otps.rows.length} past OTP records:`);
    console.log(otps.rows);

    console.log('\n=== ALL REGISTRATIONS IN DATABASE ===');
    const regs = await pool.query('SELECT registration_id, full_name, email, phone_number, payment_status, created_at FROM registrations ORDER BY registration_id DESC');
    console.log(`Found ${regs.rows.length} registration records:`);
    console.log(regs.rows);
  } catch (err) {
    console.error('Error querying DB:', err.message);
  } finally {
    await pool.end();
  }
}

checkPastOtpsAndFiles();
