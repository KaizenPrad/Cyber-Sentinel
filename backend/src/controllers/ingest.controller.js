// This file is an ingestion controller. It contains the backend logic for:
// Ingesting security signals from external applications
// Listing, getting, updating incidents
// Adding remediation logs to incidents
// It sits between the HTTP request and your database/services.

import { pool } from "../config/db.js";
// The pool manages database connections for you.

import { created } from "../utils/apiResponse.js";
// This is the response helper for 201 Created responses.
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
// in this file status is - status, severity, assignee
// severity definations is - LOW, MEDIUM, HIGH
// assignee is - email
// Incident is a human case - OPEN, INVESTIGATING, CONTAINED, RESOLVED
