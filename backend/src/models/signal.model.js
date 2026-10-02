// This file is a signal model. It contains the backend logic for:
// Counting how many signals an organization has
// Table used: signals
// It sits between your controllers and the database.

import { pool } from '../config/db.js';
// The pool manages database connections for you.

// This is the countSignals function that counts signals for one organization
export async function countSignals(orgId) { // this line defines the countSignals function
  const r = await pool.query('SELECT COUNT(*) c FROM signals WHERE organization_id = $1', [orgId]); // this line counts rows in the signals table
  return Number(r.rows[0].c); // this line turns the count text into a number
} // this line closes the countSignals function
