const { Pool, types } = require('pg');
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const origLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  origLookup(hostname, options, (err, address, family) => {
    if (!err) return callback(null, address, family);
    const resolver = new dns.Resolver();
    resolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    resolver.resolve4(hostname, (rErr, addresses) => {
      if (rErr || !addresses || addresses.length === 0) return callback(err);
      if (options && options.all) {
        callback(null, addresses.map(a => ({ address: a, family: 4 })));
      } else {
        callback(null, addresses[0], 4);
      }
    });
  });
};

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