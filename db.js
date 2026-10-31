const { Pool, types } = require('pg');
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// Force node-pg to parse TIMESTAMP without time zone (OID 1114) deterministically as UTC across all environments
types.setTypeParser(1114, (str) => {
  if (!str) return null;
  return new Date(str.replace(' ', 'T') + 'Z');
});

require('dotenv').config();

// =====================================
// CHECK ENVIRONMENT
// =====================================

const isProduction =
  process.env.NODE_ENV === 'production';

// Strip SCRAM channel_binding if present to prevent node-pg handshake timeout
const connectionString = (process.env.DATABASE_URL || '').replace('&channel_binding=require', '');

// =====================================
// CREATE POSTGRES POOL
// =====================================

const pool = new Pool({
  connectionString: connectionString,
  ssl: (isProduction || (connectionString && !connectionString.includes('localhost')))
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