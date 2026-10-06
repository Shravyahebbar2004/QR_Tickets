const { Pool } = require('pg');

async function testDirectNeon() {
  const directUrl = "postgresql://neondb_owner:npg_zs7v0UehWXqG@ep-autumn-hat-aqipn284.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
  const pool = new Pool({ connectionString: directUrl });

  try {
    const res = await pool.query("SELECT * FROM events");
    console.log("DIRECT CONNECTION SUCCESSFUL! Events found:", res.rows.length);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("DIRECT CONNECTION FAILED:", err.message);
  } finally {
    await pool.end();
  }
}

testDirectNeon();
