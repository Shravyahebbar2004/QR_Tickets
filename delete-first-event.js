const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function deleteFirstEvent() {
  try {
    const res = await pool.query('SELECT * FROM events ORDER BY created_at ASC LIMIT 1');
    if (res.rows.length === 0) {
      console.log("No events found.");
      return;
    }
    
    const event = res.rows[0];
    const eventId = event.event_id || event.id; // Check which one it is
    console.log(`Found event: ${event.title} with primary key: ${eventId}`);
    
    if (!eventId) {
      console.log("Could not find ID column. Columns are:", Object.keys(event));
      return;
    }

    await pool.query('DELETE FROM registrations WHERE event_id = $1', [eventId]);
    await pool.query(`DELETE FROM events WHERE ${event.event_id ? 'event_id' : 'id'} = $1`, [eventId]);
    
    console.log("✅ Deleted event!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}
deleteFirstEvent();
