const pool = require('./db');

async function createOtpsTable() {
  try {
    console.log('Creating email_otps table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_otps (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Successfully created email_otps table.');
  } catch (err) {
    console.error('Error creating email_otps table:', err.message);
  } finally {
    process.exit();
  }
}

createOtpsTable();
