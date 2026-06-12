const { Pool } = require('pg');

require('dotenv').config();

// =====================================
// CHECK ENVIRONMENT
// =====================================

const isProduction =
  process.env.NODE_ENV === 'production';

// =====================================
// CREATE POSTGRES POOL
// =====================================

const pool = new Pool({

  connectionString:
    process.env.DATABASE_URL,

  ssl: isProduction

    ? {

        rejectUnauthorized: false

      }

    : false,

  // =====================================
  // CONNECTION SETTINGS
  // =====================================

  idleTimeoutMillis: 600000,

  connectionTimeoutMillis: 20000

});

// =====================================
// DATABASE CONNECTED
// =====================================

pool.on('connect', () => {

  console.log(
    'DATABASE CONNECTED SUCCESSFULLY'
  );

});

// =====================================
// DATABASE ERROR
// =====================================

pool.on('error', (err) => {

  console.log(
    'DATABASE ERROR:',
    err.message
  );

});

// =====================================
// EXPORT POOL
// =====================================

module.exports = pool;