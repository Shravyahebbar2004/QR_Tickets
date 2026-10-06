const pool = require('./db');

async function find() {
  try {
    // 1. List all tables
    const tablesRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
    );
    console.log("Tables in database:", tablesRes.rows.map(r => r.table_name));

    // 2. Search registrations table
    const regRes = await pool.query(
      `SELECT * FROM registrations 
       WHERE full_name ILIKE '%manjunath%' 
          OR email ILIKE '%spoorthi%' 
          OR phone_number ILIKE '%7338151287%'`
    );
    console.log("\nMatching registrations:", JSON.stringify(regRes.rows, null, 2));

    // 3. Search all registrations for event 1
    const event1Res = await pool.query(
      `SELECT registration_id, full_name, email, phone_number, payment_status, created_at 
       FROM registrations WHERE event_id = 1 ORDER BY registration_id DESC LIMIT 50`
    );
    console.log("\nRecent registrations for event 1:", JSON.stringify(event1Res.rows, null, 2));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

find();
