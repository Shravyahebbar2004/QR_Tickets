const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_zs7v0UehWXqG@ep-autumn-hat-aqipn284-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

pool.query(`UPDATE registrations SET payment_status = 'pending' WHERE registration_id IN (2, 3)`)
  .then(() => console.log('Reset to pending!'))
  .catch(console.error)
  .finally(() => pool.end());
