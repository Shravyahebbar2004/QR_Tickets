const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function updateMap() {
  try {
    const originalUrl = "https://maps.app.goo.gl/2ZkJKZdbbsTzP5en6?g_st=aw";
    
    const res = await pool.query('SELECT custom_pricing FROM events WHERE event_id = 6');
    const pricing = res.rows[0].custom_pricing;
    pricing.forEach(p => {
        if (p.name === '3K' || p.name === '5K') {
            p.route_map_url = originalUrl;
        }
    });

    await pool.query(
      `UPDATE events SET custom_pricing = $1::jsonb WHERE event_id = 6`,
      [JSON.stringify(pricing)]
    );

    console.log("Successfully restored original Google Maps url!");
  } catch (error) {
    console.error("Error updating database:", error);
  } finally {
    pool.end();
  }
}

updateMap();
