const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addWhatsappCol() {
  try {
    await pool.query(`ALTER TABLE events ADD COLUMN whatsapp_link TEXT;`);
    console.log("Successfully added whatsapp_link column to events table!");
  } catch (error) {
    if (error.code === '42701') {
      console.log("Column already exists. Skipping.");
    } else {
      console.error("Error adding column:", error);
    }
  } finally {
    pool.end();
  }
}

addWhatsappCol();
