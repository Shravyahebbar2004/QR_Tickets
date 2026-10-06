const pool = require('./db');

async function checkVinod() {
  try {
    const res = await pool.query(
      `SELECT * FROM registrations 
       WHERE email ILIKE '%vinodngowda1996@gmail.com%' 
          OR phone_number ILIKE '%8618853941%' 
          OR full_name ILIKE '%Vinod N%'`
    );
    console.log("VINOD REGISTRATIONS:", JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
checkVinod();
