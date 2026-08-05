const pool = require('./db');

async function resetPradeepPending() {
  try {
    const email = 'pradeep.j86@gmail.com';
    const result = await pool.query(
      `UPDATE registrations SET payment_status = 'pending' WHERE email = $1 RETURNING *`,
      [email]
    );
    console.log(`Updated ${result.rows.length} registration(s) for ${email} to payment_status = 'pending'.`);
  } catch (err) {
    console.error('Error resetting status:', err.message);
  } finally {
    await pool.end();
  }
}

resetPradeepPending();
