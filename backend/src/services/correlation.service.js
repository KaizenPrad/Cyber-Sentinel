// This file is a correlation service. It detects attack patterns from signals:
// PATTERNS lists known attack patterns and their weights
// correlateBatch groups signals and matches them against patterns
// correlateSignals saves detections and incidents to the database
// It sits between signal ingestion and the detections/incidents tables.

 // Attack patterns with signal types and weights. Weights sum to 1.0 per pattern. // this line explains the table below
// Now we get to the first major export. It Creates a Export named PATTERNS
export const PATTERNS = {
  RANSOMWARE: [ // this line starts the ransomware pattern group
    { signal: 'MASS_FILE_RENAME', weight: 0.35 }, // this line says mass file rename counts 0.35 toward ransomware
    { signal: 'SHADOW_COPY_DELETE', weight: 0.35 }, // this line says shadow copy delete counts 0.35 toward ransomware
    { signal: 'HIGH_ENTROPY_WRITE', weight: 0.2 }, // this line says high entropy write counts 0.2 toward ransomware
    { signal: 'OUTBOUND_TOR', weight: 0.1 }, // this line says outbound TOR counts 0.1 toward ransomware
  ],
  PHISHING: [ // this line starts the phishing pattern group
    { signal: 'PHISH_CLICK', weight: 0.3 }, // this line says phish click counts 0.3 toward phishing
    { signal: 'CREDENTIAL_FORM_POST', weight: 0.3 }, // this line says credential form post counts 0.3 toward phishing
    { signal: 'IMPOSSIBLE_TRAVEL', weight: 0.25 }, // this line says impossible travel counts 0.25 toward phishing
    { signal: 'MFA_FAILURE', weight: 0.15 }, // this line says MFA failure counts 0.15 toward phishing
  ],
  MALWARE: [ // this line starts the malware pattern group
    { signal: 'RARE_PROCESS', weight: 0.3 }, // this line says rare process counts 0.3 toward malware
    { signal: 'BEACONING', weight: 0.3 }, // this line says beaconing counts 0.3 toward malware
    { signal: 'SUSPICIOUS_DNS', weight: 0.2 }, // this line says suspicious DNS counts 0.2 toward malware
    { signal: 'NEW_ASN_CONN', weight: 0.2 }, // this line says new ASN connection counts 0.2 toward malware
  ],
  UNAUTH_ACCESS: [ // this line starts the unauthorized access pattern group
    { signal: 'BRUTE_FORCE_BURST', weight: 0.3 }, // this line says brute force burst counts 0.3 toward unauthorized access
    { signal: 'OFF_HOURS_LOGIN', weight: 0.2 }, // this line says off-hours login counts 0.2 toward unauthorized access
    { signal: 'PRIV_ESCALATION', weight: 0.3 }, // this line says privilege escalation counts 0.3 toward unauthorized access
    { signal: 'SENSITIVE_SHARE_ACCESS', weight: 0.2 }, // this line says sensitive share access counts 0.2 toward unauthorized access
  ],
};

// Human-readable titles for each detection type // this line explains the table below
const TITLES = {
  RANSOMWARE: 'Probable Ransomware Activity', // this line gives ransomware a nice title for the UI
  PHISHING: 'Probable Phishing → Account Takeover', // this line gives phishing a nice title for the UI
  MALWARE: 'Probable Malware / C2 Beaconing', // this line gives malware a nice title for the UI
  UNAUTH_ACCESS: 'Probable Unauthorized Access', // this line gives unauthorized access a nice title for the UI
};

// This is the severityFor function that turns a number into a label
function severityFor(score) {
  if (score >= 85) return 'CRITICAL'; // this line returns CRITICAL for scores 85 and up
  if (score >= 70) return 'HIGH'; // this line returns HIGH for scores 70 to 84
  if (score >= 40) return 'MEDIUM'; // this line returns MEDIUM for scores 40 to 69
  return 'LOW'; // this line returns LOW for anything below 40
}

// Correlate a batch of freshly-inserted signals (same org/user/host, last 30 min window). // this line explains what correlateBatch does
// Returns array of { detectionType, score, matched: [{signal_id, signal_type, weight}] } // this line shows what the function returns
// Now we get to the next major function. It Creates a Export named correlateBatch
export function correlateBatch(insertedSignals) {
  // Group signals by entity: organization|user_identity|hostname // this line explains the grouping key
  const byEntity = new Map(); // this line makes an empty Map to group signals by entity
  for (const s of insertedSignals) { // this line loops over every new signal
    const key = `${s.organization_id}|${s.user_identity || ''}|${s.hostname || ''}`; // this line builds a group key from org, user, and hostname
    if (!byEntity.has(key)) byEntity.set(key, []); // this line creates a new empty group if this key is new
    byEntity.get(key).push(s); // this line adds the signal to its entity group
  }
  const detections = []; // this line makes an empty list to collect detections
  // For each entity group, check against attack patterns // this line explains the next loop
  for (const [, group] of byEntity) { // this line loops over each entity group of signals
    // Get unique signal types present in this group // this line explains the next line
    const present = new Set(group.map((g) => g.signal_type)); // this line collects the unique signal types in this group
    // Check each attack pattern // this line explains the next loop
    for (const [type, pattern] of Object.entries(PATTERNS)) { // this line loops over each known attack pattern
      // Find which signals from this pattern are present // this line explains the next line
      const matched = pattern.filter((p) => present.has(p.signal)); // this line keeps only the pattern signals we actually saw
      if (matched.length === 0) continue; // this line skips this pattern if nothing matched
      // Sum weights of matched signals // this line explains the next line
      const weightSum = matched.reduce((a, m) => a + m.weight, 0); // this line adds up the weights of the matched signals
      // Require at least 2 distinct signals OR one very strong single (>=0.35) to avoid noise // this line explains the noise filter
      if (matched.length < 2 && weightSum < 0.35) continue; // this line skips weak single matches so we do not alert on noise
      // Convert weight sum to 0-100 score // this line explains the next line
      const score = Math.round(weightSum * 100); // this line turns the 0-1 weight sum into a 0-100 score
      if (score < 55) continue; // Below threshold — not worth a detection // this line skips low scores below 55
      // Get the actual signal rows that matched // this line explains the next line
      const rows = matched.flatMap((m) => group.filter((g) => g.signal_type === m.signal)); // this line finds the real signal rows for each matched type
      detections.push({ // this line adds a new detection to the list
        detectionType: type, // this line saves the pattern name like RANSOMWARE
        title: TITLES[type], // this line saves the human-readable title for the UI
        score, // this line saves the 0-100 score
        severity: severityFor(score), // this line turns the score into CRITICAL/HIGH/MEDIUM/LOW
        confidence: Math.min(95, 55 + matched.length * 12), // this line builds a confidence number that grows with more matches but caps at 95
        matched: rows.map((r) => ({ signal_id: r.id, signal_type: r.signal_type, weight: pattern.find((p) => p.signal === r.signal_type).weight })), // this line saves each matched signal id, type, and weight
        explanation: { // this line starts the explanation object so analysts can see why we alerted
          matchedSignals: matched.map((m) => m.signal), // this line lists the matched signal names
          weights: Object.fromEntries(matched.map((m) => [m.signal, m.weight])), // this line maps each signal name to its weight
          reasoning: `${matched.length} correlated signals for ${type} within 30-min window (score ${score})`, // this line writes a one-sentence reason for the detection
        },
        sample: group[0], // this line keeps one sample signal so we know which org/user/host it came from
      });
    }
  }
  return detections; // this line returns all the detections we found
}

// This is the correlateSignals function that saves detections and incidents to the database
export async function correlateSignals(scoredSignals, organizationId) {
  const { pool } = await import('../config/db.js'); // this line loads the database pool so we can run queries
  
  // Run correlation algorithm // this line explains the next line
  const detections = correlateBatch(scoredSignals); // this line runs the in-memory matcher to get detections
  let detectionsCreated = 0; // this line starts a counter for how many detections we save
  let incidentsCreated = 0; // this line starts a counter for how many incidents we save

  // For each detection, save to database // this line explains the next loop
  for (const det of detections) { // this line loops over each detection found
    // Insert detection record // this line explains the next query
    const detResult = await pool.query( // this line inserts the detection row and asks for its id back
      `INSERT INTO detections (
        title, detection_type, risk_score, confidence, severity, explanation, organization_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, // this line is the SQL that creates the detection
      [ // this line starts the values for the $1 to $7 placeholders
        det.title, // this line fills $1 with the detection title
        det.detectionType, // this line fills $2 with the pattern type
        det.score, // this line fills $3 with the 0-100 score
        det.confidence, // this line fills $4 with the confidence number
        det.severity, // this line fills $5 with the severity label
        JSON.stringify(det.explanation), // this line fills $6 with the explanation as JSON
        organizationId, // this line fills $7 with the organization id
      ]
    );
    
    const detectionId = detResult.rows[0].id; // this line grabs the new detection id from the database
    detectionsCreated++; // this line counts one more saved detection

    // Link signals to detection with their weights // this line explains the next loop
    for (const m of det.matched) { // this line loops over each matched signal
      await pool.query( // this line links one signal to the detection so we keep evidence
        `INSERT INTO detection_signals (detection_id, signal_id, weight) VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`, // this line is the SQL that skips duplicates if the link already exists
        [detectionId, m.signal_id, m.weight] // this line fills in the detection id, signal id, and weight
      );
    }

    // Auto-create incident if score >= 70 (HIGH or CRITICAL) // this line explains the next check
    if (det.score >= 70) { // this line checks if the score is high enough to deserve an incident
      await pool.query( // this line creates a new OPEN incident from the detection
        `INSERT INTO incidents (title, description, status, severity, detection_id, organization_id)
         VALUES ($1, $2, 'OPEN', $3, $4, $5)`, // this line is the SQL that creates the incident row
        [ // this line starts the values for the placeholders
          det.title, // this line uses the detection title for the incident
          det.explanation.reasoning, // this line uses the reasoning sentence as the description
          det.severity, // this line copies the severity over
          detectionId, // this line links the incident to its detection
          organizationId, // this line links the incident to the org
        ]
      );
      incidentsCreated++; // this line counts one more created incident
    }
  }

  return { detectionsCreated, incidentsCreated }; // this line returns how many detections and incidents we made
}
export default correlateBatch;
// The default export is correlateBatch so other files can import it easily.
