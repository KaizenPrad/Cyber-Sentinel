// This file is a normalize service. It cleans up incoming raw signals:
// BASE_RISK gives every known signal type a starting risk number
// normalizeSignal turns messy input into a standard shape
// It sits right before scoring so scoring always sees the same format.

// Map raw signalType -> normalized severity/category defaults + base risk. // this line explains the table below
const BASE_RISK = {
  MASS_FILE_RENAME: 45, SHADOW_COPY_DELETE: 55, HIGH_ENTROPY_WRITE: 40, // this line sets base scores for ransomware-like signals
  OUTBOUND_TOR: 35, PHISH_CLICK: 35, CREDENTIAL_FORM_POST: 45, // this line sets base scores for TOR and phishing signals
  IMPOSSIBLE_TRAVEL: 50, MFA_FAILURE: 30, BRUTE_FORCE_BURST: 45, // this line sets base scores for login-related signals
  OFF_HOURS_LOGIN: 20, PRIV_ESCALATION: 50, SENSITIVE_SHARE_ACCESS: 35, // this line sets base scores for access-related signals
  RARE_PROCESS: 35, BEACONING: 40, SUSPICIOUS_DNS: 35, NEW_ASN_CONN: 25, // this line sets base scores for malware-like signals
};

// Now we get to the first major function. It Creates a Export named normalizeSignal
export function normalizeSignal(input) {
  // Convert signalType to uppercase and trim whitespace // this line explains the next line
  const type = String(input.signalType || '').toUpperCase().trim(); // this line makes the signal type uppercase and removes extra spaces
  // Look up base risk for this signal type, default to 15 // this line explains the next line
  const base = BASE_RISK[type] ?? 15; // this line looks up the base risk or uses 15 if the type is unknown
  return { // this line returns the clean normalized signal object
    signalType: type, // this line saves the cleaned uppercase signal type
    category: input.category, // this line copies the category like NETWORK or AUTH
    severity: input.severity, // this line copies the severity like LOW or HIGH
    message: input.message, // this line copies the human message
    sourceIp: input.sourceIp || null, // this line copies the source IP or uses null if missing
    userIdentity: input.userIdentity || null, // this line copies the user name or uses null if missing
    hostname: input.hostname || null, // this line copies the hostname or uses null if missing
    domain: input.domain || null, // this line copies the domain or uses null if missing
    rawData: input.rawData || {}, // this line copies extra raw data or uses an empty object
    baseRisk: base, // this line saves the base risk number we looked up
    eventTimestamp: new Date(input.eventTimestamp), // this line turns the timestamp string into a real Date
  };
}
export default normalizeSignal;
// The default export is normalizeSignal so other files can import it easily.
