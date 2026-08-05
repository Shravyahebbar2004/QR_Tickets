const pool = require('./db');

async function findUnregisteredOtps() {
  try {
    const otps = await pool.query('SELECT DISTINCT email, created_at, expires_at FROM email_otps ORDER BY created_at DESC');
    console.log(`Total unique OTP requests in email_otps table: ${otps.rows.length}`);

    const regs = await pool.query('SELECT DISTINCT email FROM registrations');
    const registeredEmails = new Set(regs.rows.map(r => r.email.toLowerCase().trim()));

    const unregistered = otps.rows.filter(o => !registeredEmails.has(o.email.toLowerCase().trim()));

    console.log('\n=== EMAILS THAT REQUESTED OTP BUT DID NOT COMPLETE REGISTRATION ===');
    console.log(unregistered);
  } catch (err) {
    console.error('Error querying DB:', err.message);
  } finally {
    await pool.end();
  }
}

findUnregisteredOtps();
