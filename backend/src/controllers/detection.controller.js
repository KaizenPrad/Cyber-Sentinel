// This file is a detection controller. It contains the backend logic for:
// Getting network graph data
// Listing detections with pagination and filters
// Getting a single detection with its signals
// Promoting a detection to an incident
// It sits between the HTTP request and your database/services.

import { pool } from "../config/db.js";
// The pool manages database connections for you.

import { buildGraph } from "../services/graph.service.js";
// This imports the graph service to build network graph data.
import { ok, paginated } from "../utils/apiResponse.js";
// These are response helper functions.
import { asyncHandler } from "../utils/asyncHandler.js";
// This wrapper catches async errors and passes them to Express error handler.

// Now we get to the first major function. It Creates a Export named getGraph
export const getGraph = asyncHandler(async (req, res) => {
  // Determine time window: 7d = 168 hours, 1h = 1 hour, default = 24 hours
  const hours = // this line picks how many hours of data to show
    req.query.window === "7d" ? 168 : req.query.window === "1h" ? 1 : 24; // Here we read the window from the url query
  // Build graph data using the graph service
  const data = await buildGraph(req.user.organizationId, hours); // this line builds the graph for your organization
  return ok(res, data); // this line sends back the graph data
});

// This is the listDetections function that lists detections with pagination and filters
export const listDetections = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1); // Here we get the page number, default is 1
  const limit = Math.min(100, Number(req.query.limit || 20)); // this line gets the limit, max 100, default 20
  const offset = (page - 1) * limit; // this line works out how many rows to skip for pagination
  const conds = ["organization_id = $1"]; // Here we start with only detections from your own organization
  const params = [req.user.organizationId]; // this line holds the values for the sql query
  // If detection type filter provided, add to conditions
  if (req.query.type) { // If a detection type filter was sent
    params.push(req.query.type); // this line adds the type to the query values
    conds.push(`detection_type = $${params.length}`); // this line adds the type check
  }
  // If severity filter provided, add to conditions
  if (req.query.severity) { // If a severity filter was sent
    params.push(req.query.severity); // this line adds the severity to the query values
    conds.push(`severity = $${params.length}`); // this line adds the severity check
  }
  // Build WHERE clause
  const where = `WHERE ${conds.join(" AND ")}`; // this line joins all conditions with AND
  // Get total count for pagination
  const total = Number( // this line gets the total count so the frontend can show pages
    (await pool.query(`SELECT COUNT(*) c FROM detections ${where}`, params)) // this line counts all matching detections
      .rows[0].c, // this line reads the count //PostgreSQL returns rows in an array
  );
  // Get detections with signals count, ordered by newest first
  const rows = ( // this line will hold the detection rows
    await pool.query( // this line queries the database and also counts linked signals
      `SELECT d.*, (SELECT COUNT(*) FROM detection_signals ds WHERE ds.detection_id = d.id) AS signals_count
     FROM detections d ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset], // this line passes filters plus limit and offset
    )
  ).rows; // this line gets the rows from the database
  // Return paginated response
  return paginated(res, rows, page, limit, total); // this line sends back the paginated list
});

// This is the getDetection function that gets a single detection with its signals
export const getDetection = asyncHandler(async (req, res) => {
  // Query detection by ID and organization
  const d = await pool.query( // this line looks up one detection in your organization
    "SELECT * FROM detections WHERE id=$1 AND organization_id=$2",
    [req.params.id, req.user.organizationId], // this line passes the detection id and your organization id
  );
  // If not found, return 404
  if (d.rows.length === 0) //PostgreSQL returns rows in an array // If no rows came back
    return res //means the detection does not exist.
      .status(404) // this line sets a 404 not found status
      .json({ success: false, error: "Detection not found" }); // this line sends the error message
  // Get signals associated with this detection
  const sigs = await pool.query( // this line joins detection_signals with signals
    `SELECT s.*, ds.weight FROM detection_signals ds JOIN signals s ON s.id = ds.signal_id WHERE ds.detection_id=$1`,
    [req.params.id], // this line passes the detection id
  );
  // Return detection with its signals
  return ok(res, { ...d.rows[0], signals: sigs.rows }); // this line sends back the detection with its signals
});

// This is the promoteDetection function that promotes a detection to an incident
export const promoteDetection = asyncHandler(async (req, res) => {
  // Get the detection
  const d = await pool.query( // this line looks up the detection first
    "SELECT * FROM detections WHERE id=$1 AND organization_id=$2",
    [req.params.id, req.user.organizationId], // this line passes the detection id and your organization id
  );
  if (d.rows.length === 0) //PostgreSQL returns rows in an array // If no rows came back
    return res //means the detection does not exist.
      .status(404) // this line sets a 404 status
      .json({ success: false, error: "Detection not found" }); // this line sends the error message
  const det = d.rows[0]; // this line gets the detection from the database
  // Create an incident from this detection
  const inc = await pool.query( // this line creates a new OPEN incident from the detection
    `INSERT INTO incidents (title, description, status, severity, detection_id, organization_id)
     VALUES ($1,$2,'OPEN',$3,$4,$5) RETURNING *`,
    [
      det.title, // this line uses the detection title as the incident title
      det.explanation?.reasoning || det.title, // Here we use the ai reasoning as description, or title if none
      det.severity, // this line copies the severity over
      det.id, // this line links the incident to the detection
      req.user.organizationId, // this line tags the incident with your organization id
    ],
  );
  // Return created incident
  return res.status(201).json({ success: true, data: inc.rows[0] }); // this line sends back the new incident
});
