const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_zs7v0UehWXqG@ep-autumn-hat-aqipn284-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require'
});
pool.query(`
  ALTER TABLE registrations 
  ADD COLUMN emergency_contact VARCHAR(255), 
  ADD COLUMN emergency_contact_name VARCHAR(255), 
  ADD COLUMN blood_group VARCHAR(50);
`)
  .then(() => console.log('Columns added'))
  .catch(e => console.log(e))
  .finally(() => pool.end());
