// This file is the database config. It sets up the Postgres connection:
// pool holds reusable database connections
// withTransaction runs many queries safely as one unit
// It sits between your code and Postgres so you never connect manually.

import pg from 'pg';
// The pg library lets Node.js talk to PostgreSQL.

import { env } from './env.js';
// The env object gives us the database URL from config.

const { Pool } = pg; // this line pulls the Pool class out of the pg library

// Now we get to the first major export. It Creates a Export named pool
// SSL is only needed for hosted Postgres (Neon). Local Postgres runs without SSL,
// so enabling ssl unconditionally breaks `psql` dev setups with self-signed errors.
const needsSsl =
  env.databaseUrl.includes('sslmode=require') || env.databaseUrl.includes('neon.tech');
export const pool = new Pool({ // this line creates a pool of reusable database connections
  connectionString: env.databaseUrl, // this line tells the pool where your database lives
  ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}), // required for Neon // this line allows secure connections to hosted Neon databases
  max: 10, // this line allows up to 10 connections at the same time
  idleTimeoutMillis: 30000, // this line closes a connection after 30 seconds of doing nothing
  connectionTimeoutMillis: 5000, // this line gives up after 5 seconds if a new connection cannot start
});

pool.on('error', (err) => { // this line listens for surprise errors on idle connections
  console.error('Unexpected PG pool error:', err.message); // this line prints the error message so you can see it
});

// This is the withTransaction function that runs queries as one safe unit
export async function withTransaction(callback) {
  const client = await pool.connect(); // this line borrows one connection from the pool
  try { // this line starts a block where we try to do all the work
    await client.query('BEGIN'); // this line starts the transaction so nothing saves yet
    const result = await callback(client); // this line runs your queries using this one connection
    await client.query('COMMIT'); // this line saves everything at once if all queries worked
    return result; // this line gives back whatever your callback returned
  } catch (e) { // this line catches any error from the queries
    await client.query('ROLLBACK'); // this line undoes everything so the database stays clean
    throw e; // this line re-throws the error so the caller still sees it
  } finally { // this line always runs whether we succeeded or failed
    client.release(); // this line gives the connection back to the pool
  }
}

export default pool;
// The default export is pool so other files can import it easily.
