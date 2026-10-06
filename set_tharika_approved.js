const pool = require('./db');

async function approveTharika() {
  try {
    await pool.query(
      `UPDATE registrations SET payment_status = 'approved' WHERE registration_id = 268`
    );
    console.log("Returned Tharika M L status to 'approved'");
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
approveTharika();
