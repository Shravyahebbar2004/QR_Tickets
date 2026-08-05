const pool = require('./db');

async function deleteAshokHebbar() {
  try {
    const email = 'shravyahebbar07@gmail.com';
    const name = 'ASHOK HEBBAR';

    console.log(`Deleting registration record for ${name} (${email})...`);
    
    // First query matching records
    const check = await pool.query(
      `SELECT registration_id, full_name, email, ticket_type FROM registrations WHERE email = $1 OR LOWER(full_name) LIKE LOWER($2)`,
      [email, `%${name}%`]
    );

    console.log(`Found ${check.rows.length} matching record(s):`, check.rows);

    if (check.rows.length > 0) {
      const deleteResult = await pool.query(
        `DELETE FROM registrations WHERE email = $1 OR LOWER(full_name) LIKE LOWER($2) RETURNING *`,
        [email, `%${name}%`]
      );
      console.log(`Successfully deleted ${deleteResult.rows.length} registration record(s) from database!`);
    } else {
      console.log('No matching registration record found to delete.');
    }
  } catch (err) {
    console.error('Error deleting registration:', err.message);
  } finally {
    await pool.end();
  }
}

deleteAshokHebbar();
