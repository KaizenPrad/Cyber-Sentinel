// This file is a report controller. It contains the backend logic for:
// Getting network graph data
// Getting security report with statistics by type, severity, top risky users, and incidents
// It sits between the HTTP request and your database/services.

import { pool } from '../config/db.js';
// The pool manages database connections for you.

import { ok } from '../utils/apiResponse.js';
// These are response helper functions.
import { asyncHandler } from '../utils/asyncHandler.js';
// This wrapper catches async errors and passes them to Express error handler.

// Now we get to the first major function. It Creates a Export named getGraphOnly
export const getGraphOnly = asyncHandler(async (req, res) => {
  // Dynamically import graph service (avoids circular dependency)
  const { buildGraph } = await import('../services/graph.service.js'); // Here we load the graph builder only when needed
  // Determine time window: 7d = 168 hours, 1h = 1 hour, default = 24 hours
  const hours = req.query.window === '7d' ? 168 : req.query.window === '1h' ? 1 : 24; // Here we read the window from the url query
  // Build and return graph data
  return ok(res, await buildGraph(req.user.organizationId, hours)); // this line builds the graph and sends it back
});

// This is the getReport function that returns a security report with various statistics
export const getReport = asyncHandler(async (req, res) => {
  const org = req.user.organizationId; // Here we get the organization id from the logged in user
  // Parse start date from query, default to 7 days ago (invalid dates fall back to defaults instead of 500ing)
  const parseDate = (value, fallback) => { // this line parses one date query param safely
    if (!value) return fallback; // this line uses the default when nothing was sent
    const d = new Date(value); // this line tries to parse the sent value
    return Number.isNaN(d.getTime()) ? fallback : d; // this line falls back when the value is not a real date
  };
  const start = parseDate(req.query.start, new Date(Date.now() - 7 * 864e5)); // Here we read the start date or use 7 days ago
  const end = parseDate(req.query.end, new Date()); // Here we read the end date or use right now
  // Get detection counts grouped by type
  const byType = (await pool.query( // this line counts detections grouped by type
    `SELECT detection_type, COUNT(*) c FROM detections WHERE organization_id=$1 AND created_at BETWEEN $2 AND $3 GROUP BY 1`,
    [org, start, end] // this line passes your organization and the date range
  )).rows; // this line gets the rows from the database //PostgreSQL returns rows in an array
  // Get detection counts grouped by severity
  const bySeverity = (await pool.query( // this line counts detections grouped by severity
    `SELECT severity, COUNT(*) c FROM detections WHERE organization_id=$1 AND created_at BETWEEN $2 AND $3 GROUP BY 1`,
    [org, start, end] // this line passes your organization and the date range
  )).rows; // this line gets the rows from the database
  // Get top 5 risky users by average risk score
  const topUsers = (await pool.query( // this line finds the 5 riskiest users by average risk
    `SELECT user_identity, AVG(risk_score)::INT avg_risk, COUNT(*) c FROM signals
     WHERE organization_id=$1 AND event_timestamp BETWEEN $2 AND $3 AND user_identity IS NOT NULL
     GROUP BY 1 ORDER BY avg_risk DESC LIMIT 5`,
    [org, start, end] // this line passes your organization and the date range
  )).rows; // this line gets the rows from the database
  // Get incident counts grouped by status
  const incidents = (await pool.query( // this line counts incidents grouped by status
    `SELECT status, COUNT(*) c FROM incidents WHERE organization_id=$1 AND created_at BETWEEN $2 AND $3 GROUP BY 1`,
    [org, start, end] // this line passes your organization and the date range
  )).rows; // this line gets the rows from the database
  // Return comprehensive report
  return ok(res, { range: { start, end }, byType, bySeverity, topRiskyUsers: topUsers, incidents }); // this line sends back the full report
});
