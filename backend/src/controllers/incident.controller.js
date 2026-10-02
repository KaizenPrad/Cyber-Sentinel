// This file is an incident controller. It contains the backend logic for:
// Listing incidents with pagination and filters
// Getting a single incident with remediation logs and signals
// Updating an incident (status, assignee, resolved_at)
// Adding remediation logs to an incident
// It sits between the HTTP request and your database/services.

import { pool } from "../config/db.js";
// The pool manages database connections for you.

import { ok, paginated, created } from "../utils/apiResponse.js";
// These are response helper functions.
import { asyncHandler } from "../utils/asyncHandler.js";
// This wrapper catches async errors and passes them to Express error handler.

// Now we get to the first major function. It Creates a Export named listIncidents
export const listIncidents = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1); // Here we get the page number from the query, default is 1
  const limit = Math.min(100, Number(req.query.limit || 20)); // this line gets the limit, max 100, default 20
  const offset = (page - 1) * limit; // this line works out how many rows to skip for pagination
  const conds = ["i.organization_id = $1"]; // Here we start with only incidents from your own organization
  const params = [req.user.organizationId]; // this line holds the values for the sql query
  // If status filter provided, add to conditions
  if (req.query.status) { // If a status filter was sent in the url
    params.push(req.query.status); // this line adds the status to the query values
    conds.push(`i.status = $${params.length}`); // this line adds the status check to the where clause
  }
  // If severity filter provided, add to conditions
  if (req.query.severity) { // If a severity filter was sent
    params.push(req.query.severity); // this line adds the severity to the query values
    conds.push(`i.severity = $${params.length}`); // this line adds the severity check
  }
  // Build WHERE clause
  const where = `WHERE ${conds.join(" AND ")}`; // this line joins all conditions with AND
  // Get total count for pagination
  const total = Number( // this line gets the total count so the frontend can show pages
    (await pool.query(`SELECT COUNT(*) c FROM incidents i ${where}`, params)) // this line counts all matching incidents
      .rows[0].c, // this line reads the count //PostgreSQL returns rows in an array
  );
  // Get incidents with assignee email, ordered by newest first
  const rows = ( // this line will hold the incident rows
    await pool.query( // this line queries incidents plus the assignee email
      `SELECT i.*, u.email AS assignee_email FROM incidents i LEFT JOIN users u ON u.id = i.assignee_id
     ${where} ORDER BY i.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset], // this line passes filters plus limit and offset
    )
  ).rows; // this line gets the rows from the database
  // Return paginated response
  return paginated(res, rows, page, limit, total); // this line sends back the paginated list
});

// This is the getIncident function that gets a single incident with remediation logs and signals
export const getIncident = asyncHandler(async (req, res) => {
  // Query incident by ID and organization
  const r = await pool.query( // this line looks up one incident in your organization
    "SELECT * FROM incidents WHERE id=$1 AND organization_id=$2",
    [req.params.id, req.user.organizationId], // this line passes the incident id and your organization id
  );
  // If not found, return 404
  if (r.rows.length === 0) //PostgreSQL returns rows in an array // If no rows came back
    return res //means the incident does not exist.
      .status(404) // this line sets a 404 not found status
      .json({ success: false, error: "Incident not found" }); // this line sends the error message
  const incident = r.rows[0]; // this line gets the incident from the database
  // Get remediation logs for this incident, ordered by oldest first
  const remediation = ( // this line will hold the remediation logs
    await pool.query( // this line queries the database
      "SELECT * FROM remediation_logs WHERE incident_id=$1 ORDER BY created_at ASC",
      [incident.id], // this line passes the incident id
    )
  ).rows; // this line gets the rows from the database
  // Get signals that led to this incident (if it has a detection)
  let signals = []; // this line makes an empty list for signals
  if (incident.detection_id) { // If this incident came from a detection
    signals = ( // this line will hold the related signals
      await pool.query( // this line joins detection_signals with signals
        `SELECT s.*, ds.weight FROM detection_signals ds JOIN signals s ON s.id=ds.signal_id WHERE ds.detection_id=$1`,
        [incident.detection_id], // this line passes the detection id
      )
    ).rows; // this line gets the rows from the database
  }
  // Return incident with remediation and signals
  return ok(res, { ...incident, remediation, signals }); // this line sends back the incident with logs and signals
});

// This is the updateIncident function that updates an incident
export const updateIncident = asyncHandler(async (req, res) => {
  const { status, assigneeId } = req.validated; // Here request.validated holds the checked status and assignee
  const sets = []; // this line makes an empty list for the SET parts of the update
  const params = []; // this line makes an empty list for the query values
  // If status provided, add to update
  if (status) { // If a new status was sent
    params.push(status); // this line adds the status to the values
    sets.push(`status = $${params.length}`); // this line adds the status setter
  }
  // If assigneeId provided, add to update
  if (assigneeId !== undefined) { // If an assignee id was sent (even null to unassign)
    params.push(assigneeId); // this line adds the assignee id to the values
    sets.push(`assignee_id = $${params.length}`); // this line adds the assignee setter
  }
  // If status is RESOLVED, set resolved_at timestamp
  if (status === "RESOLVED") sets.push(`resolved_at = NOW()`); // If closing the incident we stamp the resolved time
  // If nothing to update, return error
  if (sets.length === 0) // If no fields were given to update
    return res.status(400).json({ success: false, error: "Nothing to update" }); // this line sends a 400 bad request error
  // Add incident ID and organization ID to params
  params.push(req.params.id, req.user.organizationId); // this line adds the id and organization for the WHERE clause
  // Execute update query
  const r = await pool.query( // this line runs the update in the database
    `UPDATE incidents SET ${sets.join(", ")} WHERE id=$${params.length - 1} AND organization_id=$${params.length} RETURNING *`,
    params, // this line passes all the values
  );
  // If not found, return 404
  if (r.rows.length === 0) //PostgreSQL returns rows in an array // If nothing was updated
    return res //means the incident was not found.
      .status(404) // this line sets a 404 status
      .json({ success: false, error: "Incident not found" }); // this line sends the error message
  // Return updated incident
  return ok(res, r.rows[0]); // this line sends back the updated incident
});

// This is the addRemediation function that adds a remediation log to an incident
export const addRemediation = asyncHandler(async (req, res) => {
  const { action, notes } = req.validated; // Here request.validated holds the checked action and notes
  // Check if incident exists and belongs to user's organization
  const inc = await pool.query( // this line checks that the incident exists in your organization
    "SELECT id FROM incidents WHERE id=$1 AND organization_id=$2",
    [req.params.id, req.user.organizationId], // this line passes the id and organization id
  );
  if (inc.rows.length === 0) //PostgreSQL returns rows in an array // If no incident found
    return res //means the incident does not exist.
      .status(404) // this line sets a 404 status
      .json({ success: false, error: "Incident not found" }); // this line sends the error message
  // Insert remediation log with current user as author
  const r = await pool.query( // this line inserts the remediation log into the database
    `INSERT INTO remediation_logs (incident_id, user_id, action, notes) VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.params.id, req.user.id, action, notes || null], // this line passes who did what and any notes
  );
  return created(res, r.rows[0], "Remediation logged"); // this line sends back the new log
});
