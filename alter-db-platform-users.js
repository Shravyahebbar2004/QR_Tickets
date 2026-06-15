const pool = require('./db');

async function createPlatformUsersTable() {
  try {
    console.log('Creating platform_users table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS platform_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Successfully created platform_users table.');
  } catch (err) {
    console.error('Error creating platform_users table:', err.message);
  } finally {
    process.exit();
  }
}

createPlatformUsersTable();
