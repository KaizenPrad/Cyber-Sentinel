// This file is a user model. It contains the backend logic for:
// Finding a user by email
// Finding a user by id
// Tables used: users / organizations / sessions
// It sits between your controllers and the database.

import { pool } from '../config/db.js';
// The pool manages database connections for you.

// This is the findUserByEmail function that looks up one user by email
export async function findUserByEmail(email) { // this line defines the findUserByEmail function
  const r = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]); // this line searches users by lowercase email
  return r.rows[0] || null; // this line returns the user or null when not found
} // this line closes the findUserByEmail function
// This is the findUserById function that looks up one user by id
export async function findUserById(id) { // this line defines the findUserById function
  const r = await pool.query('SELECT id, email, first_name, last_name, organization_id FROM users WHERE id = $1', [id]); // this line searches users by id
  return r.rows[0] || null; // this line returns the user or null when not found
} // this line closes the findUserById function
