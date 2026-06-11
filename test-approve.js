const pool = require('./db');
const { v4: uuidv4 } = require('uuid');

async function test() {
  try {
    const res = await pool.query(`
      INSERT INTO registrations 
      (full_name, email, phone_number, ticket_type, total_amount, allowed_entries, used_entries, qr_token, payment_proof, payment_status, event_id) 
      VALUES ('Test User', 'shravyahebbar2004@gmail.com', '1234567890', 'solo', 100, 1, 0, $1, 'test.png', 'pending', 1) 
      RETURNING registration_id
    `, [uuidv4()]);

    const id = res.rows[0].registration_id;
    console.log("Created registration:", id);

    const approveRes = await fetch(`http://localhost:5000/api/approve-payment/${id}`, { method: 'POST' });
    const data = await approveRes.json();
    console.log("Approve response:", data);

  } catch (error) {
    console.error("Test failed:", error.message);
  } finally {
    process.exit(0);
  }
}

test();
