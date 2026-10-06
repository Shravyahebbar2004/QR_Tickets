const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_zs7v0UehWXqG@ep-autumn-hat-aqipn284-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require' });
async function check() {
  try {
    const res = await pool.query("SELECT * FROM registrations WHERE email = 'spoorthi.socialmedia@gmail.com' OR phone_number = '7338151287'");
    console.log("Registrations:");
    console.log(JSON.stringify(res.rows, null, 2));

    const otps = await pool.query("SELECT * FROM email_otps WHERE email = 'spoorthi.socialmedia@gmail.com'");
    console.log("\nEmail OTPs:");
    console.log(JSON.stringify(otps.rows, null, 2));

    const attendees = await pool.query("SELECT * FROM attendees WHERE registration_id IN (SELECT registration_id FROM registrations WHERE email = 'spoorthi.socialmedia@gmail.com' OR phone_number = '7338151287')");
    console.log("\nAttendees:");
    console.log(JSON.stringify(attendees.rows, null, 2));
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
