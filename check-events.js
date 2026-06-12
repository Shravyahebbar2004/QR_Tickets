const pool = require('./db');
async function check() {
  const result = await pool.query('SELECT * FROM events ORDER BY created_at DESC LIMIT 1');
  console.log(result.rows);
  process.exit(0);
}
check();
