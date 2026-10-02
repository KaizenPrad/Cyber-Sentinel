// This file is an AI scoring service. It calculates risk scores for security signals:
// scoreSignal scores one normalized signal
// scoreSignals scores many signals at once
// It uses a simple explainable formula: base risk + modifiers = final score (0-100).

// Simple explainable risk scorer: base + criticality + intel boosts, capped 0-100. // this line explains the scoring idea in one sentence
// Now we get to the first major function. It Creates a Export named scoreSignal
export function scoreSignal(normalized, opts = {}) {
  const factors = []; // Array to track scoring factors for explainability // this line makes an empty list to remember why the score changed
  let score = normalized.baseRisk; // Start with base risk for this signal type // this line starts the score from the base risk of this signal type
  factors.push(`base:${normalized.signalType}=${normalized.baseRisk}`); // Log base factor // this line saves the base score in the factors list

  // Boost score if signal comes from a critical device // this line explains the next check
  if (opts.deviceCriticality >= 80) { // this line checks if the device is very critical (80 or higher)
    score += 10; // this line adds 10 points for a critical asset
    factors.push('critical-asset:+10'); // this line records that we added 10 for a critical asset
  }
  // Boost score based on signal severity // this line explains the next severity check
  if (normalized.severity === 'CRITICAL') { // this line checks if severity is CRITICAL
    score += 10; // this line adds 10 points for critical severity
    factors.push('severity-critical:+10'); // this line records that we added 10 for critical severity
  } else if (normalized.severity === 'HIGH') { // this line checks if severity is HIGH instead
    score += 5; // this line adds 5 points for high severity
    factors.push('severity-high:+5'); // this line records that we added 5 for high severity
  }
  // Boost score if source IP is in threat intelligence // this line explains the next IP check
  if (normalized.sourceIp && opts.badIps?.has(normalized.sourceIp)) { // this line checks if the source IP is in the known-bad IP list
    score += 15; // this line adds 15 points for a known-bad IP
    factors.push('threat-intel-ip:+15'); // this line records that we added 15 for threat intel IP
  }
  // Boost score if domain is in threat intelligence // this line explains the next domain check
  if (normalized.domain && opts.badDomains?.has(normalized.domain)) { // this line checks if the domain is in the known-bad domain list
    score += 15; // this line adds 15 points for a known-bad domain
    factors.push('threat-intel-domain:+15'); // this line records that we added 15 for threat intel domain
  }
  // Clamp score between 0 and 100, round to integer // this line explains the next line
  score = Math.max(0, Math.min(100, Math.round(score))); // this line rounds the score and keeps it between 0 and 100
  return { risk_score: score, risk_factors: factors }; // this line returns the final score plus the list of reasons
}

// This is the scoreSignals function that scores many signals at once
export async function scoreSignals(signals) {
  // Base risk scores per signal type (configurable, could be in DB later) // this line explains the table below
  const BASE_RISK = { // this line starts the lookup table of base scores per signal type
    BRUTE_FORCE_BURST: 60, // this line sets brute force burst to start at 60
    OFF_HOURS_LOGIN: 30, // this line sets off-hours login to start at 30
    MFA_FAILURE: 40, // this line sets MFA failure to start at 40
    IMPOSSIBLE_TRAVEL: 70, // this line sets impossible travel to start at 70
    PRIV_ESCALATION: 65, // this line sets privilege escalation to start at 65
    SENSITIVE_SHARE_ACCESS: 45, // this line sets sensitive share access to start at 45
    PHISH_CLICK: 40, // this line sets phishing click to start at 40
    CREDENTIAL_FORM_POST: 75, // this line sets credential form post to start at 75
    BEACONING: 50, // this line sets beaconing to start at 50
    SUSPICIOUS_DNS: 35, // this line sets suspicious DNS to start at 35
    NEW_ASN_CONN: 20, // this line sets new ASN connection to start at 20
    RARE_PROCESS: 55, // this line sets rare process to start at 55
    MASS_FILE_RENAME: 80, // this line sets mass file rename to start at 80
    SHADOW_COPY_DELETE: 85, // this line sets shadow copy delete to start at 85
    HIGH_ENTROPY_WRITE: 60, // this line sets high entropy write to start at 60
    OUTBOUND_TOR: 70, // this line sets outbound TOR to start at 70
    DEFAULT: 25, // this line sets the fallback score to 25 for unknown types
  };

  // Add baseRisk to each signal based on its type // this line explains the next mapping
  const scored = signals.map((s) => ({ // this line loops over every signal to add its base risk
    ...s, // this line copies all the original signal fields
    baseRisk: BASE_RISK[s.signal_type] || BASE_RISK.DEFAULT, // this line looks up the base risk or falls back to DEFAULT
  }));

  // Calculate final score for each signal // this line explains the next mapping
  return scored.map((s) => { // this line loops over each signal with base risk to score it
    const { risk_score, risk_factors } = scoreSignal({ ...s, signalType: s.signal_type, severity: s.severity, sourceIp: s.source_ip, domain: s.domain }); // this line calls scoreSignal with camelCase aliases so factor labels stay correct
    return { ...s, risk_score, risk_factors }; // this line returns the signal plus its new score and factors
  });
}
export default scoreSignal;
// The default export is scoreSignal so other files can import it easily.
