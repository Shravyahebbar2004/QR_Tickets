const pool = require('./db');

async function setPending() {
  try {
    const ids = [153, 124, 111, 104];
    const res = await pool.query(
      `UPDATE registrations 
       SET payment_status = 'pending' 
       WHERE registration_id = ANY($1::int[])
       RETURNING registration_id, full_name, email, payment_status`,
      [ids]
    );

    console.log('Updated registration status to pending:', res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

setPending();
