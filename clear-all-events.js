const pool = require('./db');

async function clearAllEvents() {
  try {
    console.log('Clearing all events, registrations, OTPs, passes, and resetting sequences...');
    
    // Check tables existing in database
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const tableNames = tablesRes.rows.map(r => r.table_name);
    console.log('Existing tables in DB:', tableNames);

    // Truncate events, registrations, email_otps, qr_passes, scan_logs if they exist
    const targetsToTruncate = ['scan_logs', 'qr_passes', 'registrations', 'events', 'email_otps']
      .filter(t => tableNames.includes(t));

    if (targetsToTruncate.length > 0) {
      const truncateQuery = `TRUNCATE TABLE ${targetsToTruncate.join(', ')} RESTART IDENTITY CASCADE;`;
      console.log('Executing:', truncateQuery);
      await pool.query(truncateQuery);
      console.log('✅ Successfully cleared all events and reset primary key auto-increment counters back to 1!');
    } else {
      console.log('No matching event tables found to truncate.');
    }

  } catch (error) {
    console.error('❌ Error resetting events database:', error.message);
  } finally {
    await pool.end();
  }
}

clearAllEvents();
