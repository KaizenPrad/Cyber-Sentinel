// This file is a monitor controller. It contains the backend logic for:
// Listing security signals with pagination and filters
// Getting dashboard statistics (counts of signals, detections, incidents, devices)
// It sits between the HTTP request and your database/services.

import { pool } from '../config/db.js';
// The pool manages database connections for you.

import { paginated, ok } from '../utils/apiResponse.js';
// These are response helper functions.
import { asyncHandler } from '../utils/asyncHandler.js';
// This wrapper catches async errors and passes them to Express error handler.

// Now we get to the first major function. It Creates a Export named listSignals
export const listSignals = asyncHandler(async (req, res) => {
  // Extract query parameters for filtering and pagination
  const { page, limit, severity, category, search, minRisk } = req.query; // Here we read the filters from the url query
  const offset = (page - 1) * limit; // this line works out how many rows to skip for pagination
  // Base conditions: only signals from user's org AND risk_score >= minRisk
  const conds = ["organization_id = $1", "risk_score >= $2"]; // Here we start with only your own organization and a minimum risk
  const params = [req.user.organizationId, Number(minRisk) || 0]; // this line holds the values for the sql query

  // If severity filter provided, add to conditions
  if (severity) { // If a severity filter was sent
    params.push(severity); // this line adds the severity to the query values
    conds.push(`severity = $${params.length}`); // this line adds the severity check to the where clause
  }
  // If category filter provided, add to conditions
  if (category) { // If a category filter was sent
    params.push(category); // this line adds the category to the query values
    conds.push(`category = $${params.length}`); // this line adds the category check
  }
  // If search term provided, search in message, signal_type, or user_identity (case-insensitive)
  if(search){ // If a search word was sent
    params.push(`%${search}%`); // this line wraps the word with % so it matches anywhere
    conds.push( // this line searches message, type and user with case-insensitive match
        `(message ILIKE $${params.length} OR signal_type ILIKE $${params.length} OR user_identity ILIKE $${params.length})`,
    );
  }
  // Build WHERE clause from all conditions
  const where = `WHERE ${conds.join(" AND ")}`; // this line joins all conditions with AND
  // Get total count for pagination
  const total = ( // this line gets the total count so the frontend can show pages
    await pool.query(`SELECT COUNT(*) FROM signals ${where}`, params) // this line counts all matching signals
  ).rows[0].count; // this line reads the count //PostgreSQL returns rows in an array
  // Get signals ordered by newest first
  const rows =( // this line will hold the signal rows
    await pool.query( // this line queries the database
      `SELECT * FROM signals ${where} ORDER BY event_timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit,offset], // this line passes filters plus limit and offset
    )
  ).rows; // this line gets the rows from the database
  // Return paginated response
  return paginated(res, rows, Number(page), Number(limit), Number(total)); // this line sends back the paginated list
});

// This is the dashboardStats function that returns dashboard statistics
export const dashboardStats = asyncHandler(async (req,res)=>{
  const org = req.user.organizationId; // Here we get the organization id from the logged in user
  // Run all count queries in parallel for better performance
  const [sig, det, inc, dev] = await Promise.all([ // this line runs all four counts at the same time
      pool.query("SELECT COUNT(*) c FROM signals WHERE organization_id=$1", // this line counts all signals
        [org,] // this line passes your organization id
      ),
      pool.query( // this line counts detections from the last 24 hours
        `SELECT COUNT(*) c FROM detections WHERE organization_id=$1 AND created_at > NOW() - INTERVAL '24 hours'`,
        [org], // this line passes your organization id
      ),
      pool.query( // this line counts open incidents
        `SELECT COUNT(*) c FROM incidents WHERE organization_id=$1 AND status IN ('OPEN', 'INVESTIGATING')`,
        [org], // this line passes your organization id
      ),
      pool.query("SELECT COUNT(*) c FROM devices WHERE organization_id=$1", [ // this line counts registered devices
        org, // this line passes your organization id
      ]),
  ]);
  // Return statistics object
  return ok(res, { // this line sends back the stats object
    totalSignals: Number(sig.rows[0].c), // this line is the total signals ever ingested
    detections24h: Number(det.rows[0].c), // this line is detections in the last 24 hours
    openIncidents: Number(inc.rows[0].c), // this line is open incidents (OPEN or INVESTIGATING)
    devices: Number(dev.rows[0].c), // this line is total registered devices
  });
});
