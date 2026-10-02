// This file is an authentication middleware. It contains the backend logic for:
// Getting the token from cookies or Authorization header
// Verifying the JWT token
// Loading the user and organization from the database
// Attaching the user to the request object
// It sits between the HTTP request and your protected route handlers.

import jwt from 'jsonwebtoken';
// The jwt library verifies tokens for you.

import { env } from '../config/env.js';
// This imports your config with JWT secret and cookie name.

import { pool } from '../config/db.js';
// The pool manages database connections for you.

// Now we get to the first major function. It Creates a Export named authenticate
export async function authenticate(req, res, next) {
  try { // this line starts a try block so errors can be caught
    // Get token from cookie (for browser clients) or Authorization header (for API clients)
    const token = // this line creates a token variable to hold the JWT
      req.cookies?.[env.tokenCookie] || // this line checks for the token in cookies first
      req.headers.authorization?.replace('Bearer ', ''); // this line checks for a Bearer token in the header

    // If no token provided, return 401 Unauthorized
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' }); // this line sends back Unauthorized when no token is found

    let payload; // this line creates a payload variable to hold the decoded token
    try { // this line starts a try block just for verifying the token
      // Verify the JWT token using the secret
      payload = jwt.verify(token, env.jwtSecret); // this line verifies the token and decodes it
    } catch { // this line catches a bad or expired token
      // If token is invalid or expired, return 401
      return res.status(401).json({ success: false, error: 'Invalid or expired token' }); // this line sends back an error for a bad token
    }

    // Query database for user with organization and role
    const r = await pool.query( // this line queries the database for the user
      `SELECT u.id, u.email, u.first_name, u.last_name, u.organization_id,
              o.name AS org_name, o.slug AS org_slug,
              COALESCE(om.role, 'OWNER') AS role
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
       LEFT JOIN organization_members om ON om.user_id = u.id AND om.organization_id = o.id
       WHERE u.id = $1`, // this line holds the SQL that finds the user by id
      [payload.userId] // this line passes the user id from the token into the SQL
    ); // this line ends the database query
    // If user not found, return 401
    if (r.rows.length === 0) return res.status(401).json({ success: false, error: 'User not found' }); // this line sends back an error when the user does not exist

    const row = r.rows[0]; // this line gets the first user row from the database
    // Attach user info to request object for use in controllers
    req.user = { // this line attaches the user to the request so later code can use it
      id: row.id, // this line saves the user id
      email: row.email, // this line saves the user email
      firstName: row.first_name, // this line saves the first name
      lastName: row.last_name, // this line saves the last name
      organizationId: row.organization_id, // this line saves the organization id
      organization: { id: row.organization_id, name: row.org_name, slug: row.org_slug }, // this line saves the organization info
      role: row.role, // this line saves the user role
    }; // this line ends the req.user object
    // Continue to next middleware or route handler
    next(); // this line moves on to the next middleware or route
  } catch (err) { // this line catches any unexpected error
    // Pass any unexpected errors to Express error handler
    next(err); // this line sends the error to the Express error handler
  }
}
