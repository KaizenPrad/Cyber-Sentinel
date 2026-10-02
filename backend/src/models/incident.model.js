// This file is an incident model. It contains the backend logic for:
// Finding one incident by id for an organization
// Tables used: incidents + remediation_logs
// It sits between your controllers and the database.

import { pool } from '../config/db.js';
// The pool manages database connections for you.

// This is the findIncidentById function that looks up one incident
export async function findIncidentById(id, orgId) { // this line defines the findIncidentById function
  const r = await pool.query('SELECT * FROM incidents WHERE id = $1 AND organization_id = $2', [id, orgId]); // this line searches incidents by id and organization
  return r.rows[0] || null; // this line returns the incident or null when not found
} // this line closes the findIncidentById function
