// This file is a detection model. It contains the backend logic for:
// Finding one detection by id for an organization
// Tables used: detections + detection_signals
// It sits between your controllers and the database.

import { pool } from '../config/db.js';
// The pool manages database connections for you.

// This is the findDetectionById function that looks up one detection
export async function findDetectionById(id, orgId) { // this line defines the findDetectionById function
  const r = await pool.query('SELECT * FROM detections WHERE id = $1 AND organization_id = $2', [id, orgId]); // this line searches detections by id and organization
  return r.rows[0] || null; // this line returns the detection or null when not found
} // this line closes the findDetectionById function
