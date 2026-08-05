const pool = require('./db');

async function verifyAll() {
  try {
    const res = await pool.query('SELECT registration_id, full_name, email, phone_number, ticket_type FROM registrations WHERE email IN ($1, $2) OR full_name LIKE $3', ['1by22ee042@bmsit.in', 'ruchithagowda2825@gmail.com', '%Ruchi%']);
    console.log('Current DB status for Ruchi & Ruchitha:', res.rows);
  } finally {
    await pool.end();
  }
}

verifyAll();
