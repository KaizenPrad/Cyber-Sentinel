// This file is an ingestion controller. It contains the backend logic for:
// Ingesting security signals from external applications
// Listing, getting, updating incidents
// Adding remediation logs to incidents
// It sits between the HTTP request and your database/services.

import { pool } from "../config/db.js";
// The pool manages database connections for you.

import { ok, paginated, created } from "../utils/apiResponse.js";
// These are response helper functions.
import { asyncHandler } from "../utils/asyncHandler.js";
// This wrapper catches async errors and passes them to Express error handler.

import { scoreSignals } from "../services/aiScoring.service.js";
// This imports the AI scoring service to calculate risk scores for signals.
import { correlateSignals } from "../services/correlation.service.js";
// This imports the correlation service to detect attack patterns and create detections/incidents.

/**
 * Ingest security signals from external applications.
 *
 * Authentication: API Key (recommended) or JWT
 * Rate limit: 200 requests per 15 minutes
 *
 * Expected payload:
 * {
 *   "signals": [
 *     {
 *       "signalType": "BRUTE_FORCE_BURST",
 *       "category": "AUTH",
 *       "severity": "HIGH",
 *       "message": "Failed login for user@example.com - attempt 5",
 *       "sourceIp": "103.21.244.10",
 *       "userIdentity": "user@example.com",
 *       "hostname": "web-01",
 *       "domain": "evil.com",
 *       "deviceId": "optional-device-uuid",
 *       "rawData": { "attempts": 5 },
 *       "eventTimestamp": "2026-09-30T10:00:00.000Z"
 *     }
 *   ]
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "processed": 3,
 *     "detectionsTriggered": 1,
 *     "incidentsCreated": 1,
 *     "signalIds": ["..."]
 *   }
 * }
 */
// Now we get to the first major function. It Creates a Export named ingest
export const ingest = asyncHandler(async (req, res) => {
  const { signals } = req.validated; // Here request.validated contains the validated signals array
  const organizationId = req.user.organizationId; // Here we get the organization id from the logged in user

  // Insert signals into database
  const signalIds = []; // this line makes an empty list to hold the new signal ids
  const signalRows = []; // this line makes an empty list to hold the full signal rows for scoring

  // Loop through each signal and insert into database
  for (const signal of signals) { // Here we loop over every signal sent in the request
    const result = await pool.query( // this line inserts one signal into the database
      `INSERT INTO signals (
        signal_type, category, severity, message, source_ip, user_identity,
        hostname, domain, raw_data, organization_id, event_timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, signal_type, category, severity, message, source_ip, user_identity, hostname, domain, raw_data, organization_id, event_timestamp`,
      [
        signal.signalType.toUpperCase(), // this line makes the signal type uppercase so it stays consistent
        signal.category, // this line gets the category like AUTH or NETWORK
        signal.severity, // this line gets the severity like HIGH or LOW
        signal.message, // this line gets the human readable message
        signal.sourceIp || null, // this line gets the source ip or null if there is none
        signal.userIdentity || null, // this line gets the user email or null if there is none
        signal.hostname || null, // this line gets the hostname or null if there is none
        signal.domain || null, // this line gets the domain or null if there is none
        JSON.stringify(signal.rawData || {}), // this line turns the rawData object into a json string
        organizationId, // this line tags the signal with your organization id
        signal.eventTimestamp, // this line stores when the event actually happened
      ]
    );

    const inserted = result.rows[0]; // this line gets the inserted row from the database
    signalIds.push(inserted.id); // this line saves the new signal id in our list
    signalRows.push(inserted); // this line saves the full signal row so we can score it later
  }

  // Score signals using AI scoring service
  const scoredSignals = await scoreSignals(signalRows); // this line calculates a risk score for each signal

  // Persist scores so Monitor/Graph/Report read real risk values
  // (minRisk filter and risk bars depend on the stored columns).
  for (const s of scoredSignals) { // this line writes each computed score back to its row
    await pool.query(`UPDATE signals SET risk_score = $1, risk_factors = $2 WHERE id = $3`, [s.risk_score, s.risk_factors, s.id]);
  }

  // Correlate signals to create detections
  const { detectionsCreated, incidentsCreated } = await correlateSignals(scoredSignals, organizationId); // Here we look for attack patterns and count what got created

  // Return success response with counts
  return created(res, { // this line sends back a 201 created response
    processed: signals.length, // this line tells how many signals we processed
    detectionsTriggered: detectionsCreated, // this line tells how many detections were created
    incidentsCreated: incidentsCreated, // this line tells how many incidents were auto-created
    signalIds, // this line returns the new signal ids
  }, 'Signals ingested successfully'); // this line is the success message
});

// This is the listIncidents function that lists incidents with pagination and filters
export const listIncidents = asyncHandler(async (req,res)=>{
    const page = Number(req.query.page || 1); // Here we get the page number from the query, default is 1
    const limit = Math.min(100, Number(req.query.limit || 20)); // this line gets the limit, max 100, default 20
    const offset = (page - 1) * limit; // this line works out how many rows to skip for pagination
    const conds = ["i.organization_id = $1"]; // Here we start with only incidents from your own organization
    const params = [req.user.organizationId]; // this line holds the values for the sql query

    // If status filter provided, add to conditions
    if(req.query.status) { // If a status filter was sent in the url
        params.push(req.query.status); // this line adds the status to the query values
        conds.push(`i.status = $${params.length}`); // this line adds the status check to the where clause
    }
    // If severity filter provided, add to conditions
    if(req.query.severnity){ // Note: typo in query param name (severnity vs severity) // If a severity filter was sent
        params.push(req.query.severnity); // this line adds the severity value
        conds.push(`i.severity = $${params.length}`); // this line adds the severity check
    }
    // Build WHERE clause from conditions
    const where = `WHERE ${conds.join(" AND ")}`; // this line joins all conditions with AND
    // Get total count for pagination
    const total = Number( // this line gets the total count so the frontend can show pages
        (await pool.query(`SELECT COUNT(*) c FROM incidents i ${where}`, params)) // this line counts all matching incidents
        .rows[0].c, // this line reads the count //PostgreSQL returns rows in an array
    )
    // Get incidents with assignee email, ordered by newest first
    const rows = ( // this line fetches the actual incident rows
        await pool.query( // this line queries the database
            `SELECT i.*, u.email AS assignee_email FROM incidents i LEFT JOIN users u ON u.id = i.assignee_id ${where} ORDER BY i.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, limit, offset], // this line passes filters plus limit and offset
        )
    ).rows; // this line gets the rows from the database
    // Return paginated response
    return paginated(req, rows, page, limit , total); // this line sends back the paginated list
});
// This is the getIncident function that gets a single incident with remediation and signals
export const getIncident = asyncHandler(async(req, res) =>{
    const r = await pool.query( // this line queries the database for one incident
        'SELECT * FROM incidents WHERE id=$1 AND organization_id=$2',
        [req.params.id, req.user.organizationId] // this line passes the incident id and your organization id
    )
    // If incident not found, return 404
    if(r.rows.length === 0) //PostgreSQL returns rows in an array // If no rows came back
        return res //means the incident does not exist or belongs to another organization.
        .status(404) // this line sets a 404 not found status
        .json({success: false, error: "Incident not found"}); // this line sends the error message
    // Get the incident
    const incident = r.rows[0]; // this line gets the incident from the database
    // Get remediation logs for this incident
    const remediation = ( // this line will hold the remediation logs
        await pool.query( // this line queries the database
                  "SELECT * FROM remediation_logs WHERE incident_id=$1 ORDER BY created_at ASC",
                  [incident.id] // this line passes the incident id
        )
    ).rows; // this line gets the rows from the database
    // Get signals that triggered this incident (if any)
    let signals = []; // this line makes an empty list for signals
    if(incident.detection_id){ // If this incident came from a detection
        signals = ( // this line will hold the related signals
            await pool.query( // this line joins detection_signals with signals
                `SELECT s.*, ds.weight FROM detection_signals ds JOIN signals s ON s.id=ds.signal_id WHERE ds.detection_id=$1`,
                [incident.detection_id], // this line passes the detection id
            )
        ).rows; // this line gets the rows from the database
    }
    // Return incident with remediation and signals
    return ok(res, {...incident, remediation, signals}); // this line sends back the incident with its logs and signals
});
// This is the updateIncident function that updates an incident
export const updateIncident = asyncHandler(async (req, res) => {
    // Get validated data from request
    const {status, assigneeId} = req.validated; // Here request.validated holds the checked status and assignee
    const sets = []; // this line makes an empty list for the SET parts of the update
    const params = []; // this line makes an empty list for the query values
    // If status provided, add to update
    if(status){ // If a new status was sent
        params.push(status); // this line adds the status to the values
        sets.push(`status = $${params.length}`); // this line adds the status setter
    }
    // If assigneeId provided, add to update
    if (assigneeId !== undefined){ // If an assignee id was sent (even null to unassign)
        params.push(assigneeId); // this line adds the assignee id to the values
        sets.push(`assignee_id = $${params.length}`); // this line adds the assignee setter
    }
    // If status is RESOLVED, set resolved_at timestamp
    if(status === "RESOLVED") sets.push(`resolved_at = NOW()`); // If closing the incident we stamp the resolved time
    // If nothing to update, return error
    if(sets.length === 0) // If no fields were given to update
        return res.status(400).json({success : false, error : "Nothing to Update"}); // this line sends a 400 bad request error
    // Add incident ID and organization ID to params
    params.push(req.params.id, req.user.organizationId); // this line adds the id and organization for the WHERE clause
    // Execute update query
    const r = await pool.query( // this line runs the update in the database
        `UPDATE incidents SET ${sets.join(", ")} WHERE id= $${params.length - 1} AND organization_id=$${params.length} RETURNING *`,
        params, // this line passes all the values
    );
    // If incident not found, return 404
    if (r.rows.length === 0) //PostgreSQL returns rows in an array // If nothing was updated
        return res //means the incident was not found.
    .status(404) // this line sets a 404 status
    .json({success: false, error : "Incident not found"}); // this line sends the error message
    // Return updated incident
    return ok(res, r.rows[0]); // this line sends back the updated incident
})
// This is the addRemediation function that adds a remediation log to an incident
// Remediation is a log which tells who did what and when
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
  // Insert remediation log
  const r = await pool.query( // this line inserts the remediation log into the database
    `INSERT INTO remediation_logs (incident_id, user_id, action, notes) VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.params.id, req.user.id, action, notes || null], // this line passes who did what and any notes
  );
  return created(res, r.rows[0], "Remediation logged"); // this line sends back the new log
});


// in this file status is - status, severity, assignee
// severity definations is - LOW, MEDIUM, HIGH
// assignee is - email
// Incident is a human case - OPEN, INVESTIGATING, CONTAINED, RESOLVED
