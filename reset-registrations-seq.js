const pool = require('./db');

async function resetRegistrations() {
  try {
    console.log('Deleting entry_logs for registration_id 5 and 6 (if any)...');
    await pool.query(`DELETE FROM entry_logs WHERE registration_id IN (5, 6)`);

    console.log('Deleting registrations 5 and 6...');
    const deleteRes = await pool.query(`DELETE FROM registrations WHERE registration_id IN (5, 6)`);
    console.log(`Deleted ${deleteRes.rowCount} registration(s).`);

    console.log('Resetting registration_id sequence to 1...');
    await pool.query(`ALTER SEQUENCE registrations_registration_id_seq RESTART WITH 1`);
    console.log('Sequence reset to 1 successfully.');

    // Verification
    const countRes = await pool.query(`SELECT COUNT(*) FROM registrations`);
    console.log(`Current registrations count: ${countRes.rows[0].count}`);

    const seqRes = await pool.query(`SELECT last_value, is_called FROM registrations_registration_id_seq`);
    console.log('Sequence status:', seqRes.rows[0]);

  } catch (error) {
    console.error('Error resetting registrations database:', error);
  } finally {
    await pool.end();
  }
}

resetRegistrations();
