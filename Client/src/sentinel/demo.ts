import type {
  Detection,
  GraphData,
  Incident,
  Paginated,
  Report,
  Signal,
  Stats,
} from "./api";

/* ------------------------------------------------------------------ */
/* Demo mode: full offline dataset so the app is reviewable with no    */
/* backend. Sign in with the credentials below; every page serves      */
/* this local data and mutations apply to the in-memory store.         */
/* ------------------------------------------------------------------ */

export const DEMO_EMAIL = "demo@cybersentinel.local";
export const DEMO_PASSWORD = "Demo1234!";

/** Demo session user — structurally matches SessionUser in auth.tsx. */
export const demoSessionUser = {
  id: "demo-user-1",
  email: DEMO_EMAIL,
  firstName: "Demo",
  lastName: "Analyst",
  organizationId: "demo-org-1",
  organization: { id: "demo-org-1", name: "Acme Corp", slug: "acme" },
  role: "analyst",
  avatarUrl: null,
  provider: "demo",
};

const isoHoursAgo = (h: number): string =>
  new Date(Date.now() - h * 3_600_000).toISOString();

/* ------------------------------- signals ------------------------------- */

interface SignalTemplate {
  signal_type: string;
  category: Signal["category"];
  severity: Signal["severity"];
  message: string;
  risk_score: number;
  risk_factors: string[];
}

const SIGNAL_TEMPLATES: SignalTemplate[] = [
  { signal_type: "PHISH_CLICK", category: "EMAIL", severity: "HIGH", message: "User clicked a known phishing link in an invoice-themed lure", risk_score: 78, risk_factors: ["known-phish-url", "first-seen-sender"] },
  { signal_type: "CREDENTIAL_FORM_POST", category: "WEB", severity: "HIGH", message: "Credentials submitted to a lookalike SSO portal outside SSO", risk_score: 82, risk_factors: ["lookalike-domain", "non-sso-auth"] },
  { signal_type: "IMPOSSIBLE_TRAVEL", category: "AUTH", severity: "CRITICAL", message: "Login from Berlin 22 minutes after a session in Chicago", risk_score: 91, risk_factors: ["geo-velocity", "new-device"] },
  { signal_type: "MFA_FAILURE", category: "AUTH", severity: "MEDIUM", message: "Three consecutive MFA push denials on a privileged account", risk_score: 64, risk_factors: ["mfa-fatigue-pattern"] },
  { signal_type: "BRUTE_FORCE", category: "AUTH", severity: "HIGH", message: "Password-spray burst: 140 attempts against VPN gateway", risk_score: 76, risk_factors: ["spray-pattern", "external-source"] },
  { signal_type: "OFFHOURS_LOGIN", category: "AUTH", severity: "LOW", message: "Interactive login at 03:12 local for a 9-to-5 role", risk_score: 38, risk_factors: ["offhours"] },
  { signal_type: "PRIV_ESC", category: "ENDPOINT", severity: "CRITICAL", message: "Token impersonation into SYSTEM from a user shell", risk_score: 93, risk_factors: ["token-theft", "system-impersonation"] },
  { signal_type: "RARE_PROCESS", category: "ENDPOINT", severity: "MEDIUM", message: "First-seen LOLBin execution with encoded arguments", risk_score: 58, risk_factors: ["lolbin", "encoded-args"] },
  { signal_type: "BEACONING", category: "NETWORK", severity: "HIGH", message: "Periodic 60s HTTPS callbacks to a fresh external host", risk_score: 74, risk_factors: ["periodic-c2-cadence"] },
  { signal_type: "SUSPICIOUS_DNS", category: "NETWORK", severity: "MEDIUM", message: "High-entropy DNS labels consistent with tunnelling", risk_score: 61, risk_factors: ["dns-entropy", "rare-tld"] },
  { signal_type: "NEW_ASN_CONN", category: "NETWORK", severity: "MEDIUM", message: "Outbound session to an ASN never seen in this fleet", risk_score: 55, risk_factors: ["new-asn", "bulk-egress"] },
  { signal_type: "PORT_SCAN", category: "NETWORK", severity: "LOW", message: "Horizontal scan of 200+ hosts on SMB ports from a workstation", risk_score: 44, risk_factors: ["lateral-recon"] },
  { signal_type: "MASS_RENAME", category: "ENDPOINT", severity: "CRITICAL", message: "1,900 files renamed to an unknown extension in 4 minutes", risk_score: 95, risk_factors: ["ransomware-rename-burst"] },
  { signal_type: "SHADOWCOPY_DELETE", category: "ENDPOINT", severity: "CRITICAL", message: "Volume shadow copies deleted via vssadmin", risk_score: 89, risk_factors: ["recovery-kill"] },
  { signal_type: "HIGH_ENTROPY_WRITE", category: "ENDPOINT", severity: "HIGH", message: "Bulk writes with entropy above 7.8 across user shares", risk_score: 80, risk_factors: ["encryption-like-writes"] },
  { signal_type: "OAUTH_CONSENT", category: "EMAIL", severity: "MEDIUM", message: "Tenant-wide OAuth consent granted to an unverified app", risk_score: 66, risk_factors: ["unverified-publisher", "mail-read-scope"] },
];

const ACTORS = [
  { user: "ada.lovelace", host: "WS-1042", ip: "10.4.2.18" },
  { user: "grace.hopper", host: "WS-2207", ip: "10.4.9.44" },
  { user: "alan.turing", host: "SRV-EDGE-01", ip: "10.4.1.7" },
  { user: "katherine.johnson", host: "WS-3310", ip: "10.4.6.29" },
  { user: null, host: "SRV-FILE-02", ip: "203.0.113.91" },
  { user: "linus.torvalds", host: "WS-1188", ip: "10.4.3.52" },
];

const DOMAINS = ["invoice-portal-secure.top", "sso-acme-verify.xyz", "cdn-metrics-update.com", null];

function buildSignals(): Signal[] {
  const out: Signal[] = [];
  for (let i = 0; i < 48; i++) {
    const t = SIGNAL_TEMPLATES[i % SIGNAL_TEMPLATES.length];
    const actor = ACTORS[i % ACTORS.length];
    out.push({
      id: `sig-demo-${String(i + 1).padStart(3, "0")}`,
      signal_type: t.signal_type,
      category: t.category,
      severity: t.severity,
      message: t.message,
      source_ip: actor.ip,
      user_identity: actor.user,
      hostname: actor.host,
      domain: DOMAINS[i % DOMAINS.length],
      raw_data: { demo: true, sequence: i },
      risk_score: Math.min(99, t.risk_score + ((i * 7) % 9) - 4),
      risk_factors: t.risk_factors,
      // Spread across ~7 days so time-window filters (graph 1h/24h/7d,
      // report ranges) show genuinely different slices, like real SOC data.
      event_timestamp: isoHoursAgo(i * 3.4 + (i % 7) * 0.5),
    });
  }
  return out.sort((a, b) => +new Date(b.event_timestamp) - +new Date(a.event_timestamp));
}

/* ------------------------------ detections ------------------------------ */

function withWeight(s: Signal, weight: number): Signal & { weight: number } {
  return { ...s, weight };
}

function buildDetections(signals: Signal[]): Detection[] {
  const find = (...types: string[]) =>
    types
      .map((t) => signals.find((s) => s.signal_type === t))
      .filter((s): s is Signal => Boolean(s));
  return [
    {
      id: "det-demo-1",
      title: "Phishing → account takeover chain",
      detection_type: "PHISHING",
      risk_score: 85,
      confidence: 0.91,
      severity: "CRITICAL",
      explanation: {
        matchedSignals: ["PHISH_CLICK", "CREDENTIAL_FORM_POST", "IMPOSSIBLE_TRAVEL", "MFA_FAILURE"],
        weights: { PHISH_CLICK: 30, CREDENTIAL_FORM_POST: 30, IMPOSSIBLE_TRAVEL: 25, MFA_FAILURE: 15 },
        reasoning: "Link click plus credential submission plus impossible-travel login correlate into a single takeover case — no lone signal would clear the bar.",
      },
      status: "OPEN",
      created_at: isoHoursAgo(3),
      signals_count: 4,
      signals: [
        ...find("PHISH_CLICK", "CREDENTIAL_FORM_POST", "IMPOSSIBLE_TRAVEL", "MFA_FAILURE").map((s, i) =>
          withWeight(s, [30, 30, 25, 15][i] ?? 10),
        ),
      ],
    },
    {
      id: "det-demo-2",
      title: "Likely C2 beaconing from workstation",
      detection_type: "MALWARE",
      risk_score: 78,
      confidence: 0.84,
      severity: "HIGH",
      explanation: {
        matchedSignals: ["RARE_PROCESS", "BEACONING", "SUSPICIOUS_DNS", "NEW_ASN_CONN"],
        weights: { RARE_PROCESS: 25, BEACONING: 35, SUSPICIOUS_DNS: 20, NEW_ASN_CONN: 20 },
        reasoning: "Rare process plus rigid callback cadence plus fresh ASN egress reads as command-and-control staging.",
      },
      status: "OPEN",
      created_at: isoHoursAgo(7),
      signals_count: 4,
      signals: find("RARE_PROCESS", "BEACONING", "SUSPICIOUS_DNS", "NEW_ASN_CONN").map((s, i) =>
        withWeight(s, [25, 35, 20, 20][i] ?? 10),
      ),
    },
    {
      id: "det-demo-3",
      title: "Pre-ransomware encryption indicators",
      detection_type: "RANSOMWARE",
      risk_score: 94,
      confidence: 0.96,
      severity: "CRITICAL",
      explanation: {
        matchedSignals: ["MASS_RENAME", "SHADOWCOPY_DELETE", "HIGH_ENTROPY_WRITE"],
        weights: { MASS_RENAME: 40, SHADOWCOPY_DELETE: 35, HIGH_ENTROPY_WRITE: 25 },
        reasoning: "Mass renames with shadow-copy deletion and high-entropy writes fire before encryption completes — isolate immediately.",
      },
      status: "OPEN",
      created_at: isoHoursAgo(1.2),
      signals_count: 3,
      signals: find("MASS_RENAME", "SHADOWCOPY_DELETE", "HIGH_ENTROPY_WRITE").map((s, i) =>
        withWeight(s, [40, 35, 25][i] ?? 10),
      ),
    },
    {
      id: "det-demo-4",
      title: "Brute-force burst into VPN",
      detection_type: "UNAUTH_ACCESS",
      risk_score: 71,
      confidence: 0.79,
      severity: "HIGH",
      explanation: {
        matchedSignals: ["BRUTE_FORCE", "OFFHOURS_LOGIN"],
        weights: { BRUTE_FORCE: 70, OFFHOURS_LOGIN: 30 },
        reasoning: "Spray burst followed by an off-hours success on a standard-hours account.",
      },
      status: "OPEN",
      created_at: isoHoursAgo(11),
      signals_count: 2,
      signals: find("BRUTE_FORCE", "OFFHOURS_LOGIN").map((s, i) =>
        withWeight(s, [70, 30][i] ?? 10),
      ),
    },
    {
      id: "det-demo-5",
      title: "Privilege escalation on file server",
      detection_type: "UNAUTH_ACCESS",
      risk_score: 88,
      confidence: 0.9,
      severity: "CRITICAL",
      explanation: {
        matchedSignals: ["PRIV_ESC", "OFFHOURS_LOGIN", "MFA_FAILURE"],
        weights: { PRIV_ESC: 55, OFFHOURS_LOGIN: 20, MFA_FAILURE: 25 },
        reasoning: "SYSTEM impersonation outside working hours after MFA fatigue attempts.",
      },
      status: "OPEN",
      created_at: isoHoursAgo(16),
      signals_count: 3,
      signals: find("PRIV_ESC", "OFFHOURS_LOGIN", "MFA_FAILURE").map((s, i) =>
        withWeight(s, [55, 20, 25][i] ?? 10),
      ),
    },
    {
      id: "det-demo-6",
      title: "OAuth consent phishing grant",
      detection_type: "PHISHING",
      risk_score: 66,
      confidence: 0.72,
      severity: "MEDIUM",
      explanation: {
        matchedSignals: ["OAUTH_CONSENT", "PHISH_CLICK"],
        weights: { OAUTH_CONSENT: 60, PHISH_CLICK: 40 },
        reasoning: "Tenant-wide mail-read consent to an unverified publisher shortly after a lure click.",
      },
      status: "OPEN",
      created_at: isoHoursAgo(26),
      signals_count: 2,
      signals: find("OAUTH_CONSENT", "PHISH_CLICK").map((s, i) =>
        withWeight(s, [60, 40][i] ?? 10),
      ),
    },
    {
      id: "det-demo-7",
      title: "Lateral recon sweep on SMB",
      detection_type: "ANOMALY",
      risk_score: 48,
      confidence: 0.58,
      severity: "MEDIUM",
      explanation: {
        matchedSignals: ["PORT_SCAN", "NEW_ASN_CONN"],
        weights: { PORT_SCAN: 65, NEW_ASN_CONN: 35 },
        reasoning: "Unusual internal sweep volume for this workstation profile.",
      },
      status: "OPEN",
      created_at: isoHoursAgo(31),
      signals_count: 2,
      signals: find("PORT_SCAN", "NEW_ASN_CONN").map((s, i) =>
        withWeight(s, [65, 35][i] ?? 10),
      ),
    },
    {
      id: "det-demo-8",
      title: "DNS tunnelling suspicion on edge host",
      detection_type: "MALWARE",
      risk_score: 61,
      confidence: 0.66,
      severity: "MEDIUM",
      explanation: {
        matchedSignals: ["SUSPICIOUS_DNS", "BEACONING"],
        weights: { SUSPICIOUS_DNS: 55, BEACONING: 45 },
        reasoning: "High-entropy labels with a steady query cadence off the edge server.",
      },
      status: "OPEN",
      created_at: isoHoursAgo(44),
      signals_count: 2,
      signals: find("SUSPICIOUS_DNS", "BEACONING").map((s, i) =>
        withWeight(s, [55, 45][i] ?? 10),
      ),
    },
  ];
}

/* ------------------------------ incidents ------------------------------- */

function buildIncidents(detections: Detection[]): Incident[] {
  const d = (id: string) => detections.find((x) => x.id === id);
  const sig = (id: string) =>
    (d(id)?.signals ?? []).map(({ weight: _w, ...s }) => ({ ...s, weight: 0 }));
  return [
    {
      id: "inc-demo-1",
      title: "Ransomware staging on SRV-FILE-02 — isolate host",
      description: "Pre-encryption indicators converging on the file server. Containment playbook RB-3 attached.",
      status: "INVESTIGATING",
      severity: "CRITICAL",
      assignee_id: "demo-user-1",
      assignee_email: DEMO_EMAIL,
      detection_id: "det-demo-3",
      created_at: isoHoursAgo(1),
      resolved_at: null,
      remediation: [
        { id: "rem-demo-1", action: "Isolated SRV-FILE-02 from the network", notes: "Via EDR network containment", created_at: isoHoursAgo(0.8) },
      ],
      signals: sig("det-demo-3"),
    },
    {
      id: "inc-demo-2",
      title: "Account takeover — ada.lovelace",
      description: "Credential phishing followed by impossible-travel login. Sessions revoked, password reset forced.",
      status: "OPEN",
      severity: "CRITICAL",
      assignee_id: null,
      detection_id: "det-demo-1",
      created_at: isoHoursAgo(2.5),
      resolved_at: null,
      remediation: [],
      signals: sig("det-demo-1"),
    },
    {
      id: "inc-demo-3",
      title: "Suspected C2 on WS-1042",
      description: "Beaconing workstation under observation; egress to fresh ASN sinkholed at the edge.",
      status: "OPEN",
      severity: "HIGH",
      assignee_id: "demo-user-1",
      assignee_email: DEMO_EMAIL,
      detection_id: "det-demo-2",
      created_at: isoHoursAgo(6),
      resolved_at: null,
      remediation: [
        { id: "rem-demo-2", action: "Sinkholed callback domain at DNS firewall", notes: null, created_at: isoHoursAgo(5) },
      ],
      signals: sig("det-demo-2"),
    },
    {
      id: "inc-demo-4",
      title: "VPN password spray contained",
      description: "Source ASN blocked; no successful logins observed in the window.",
      status: "CONTAINED",
      severity: "HIGH",
      assignee_id: "demo-user-1",
      assignee_email: DEMO_EMAIL,
      detection_id: "det-demo-4",
      created_at: isoHoursAgo(10),
      resolved_at: null,
      remediation: [
        { id: "rem-demo-3", action: "Blocked offending /24 at the VPN gateway", notes: null, created_at: isoHoursAgo(9) },
      ],
      signals: sig("det-demo-4"),
    },
    {
      id: "inc-demo-5",
      title: "Malicious OAuth grant revoked",
      description: "Tenant-wide consent removed; app publisher blocked.",
      status: "RESOLVED",
      severity: "MEDIUM",
      assignee_id: "demo-user-1",
      assignee_email: DEMO_EMAIL,
      detection_id: "det-demo-6",
      created_at: isoHoursAgo(25),
      resolved_at: isoHoursAgo(20),
      remediation: [
        { id: "rem-demo-4", action: "Revoked OAuth consent tenant-wide", notes: "Publisher added to blocklist", created_at: isoHoursAgo(20) },
      ],
      signals: sig("det-demo-6"),
    },
    {
      id: "inc-demo-6",
      title: "SMB recon sweep — benign admin scan",
      description: "Confirmed vulnerability-management scan window. Closed as expected activity.",
      status: "FALSE_POSITIVE",
      severity: "MEDIUM",
      assignee_id: null,
      detection_id: "det-demo-7",
      created_at: isoHoursAgo(30),
      resolved_at: isoHoursAgo(28),
      remediation: [],
      signals: sig("det-demo-7"),
    },
  ];
}

/* --------------------------------- graph --------------------------------- */

/**
 * Window-aware demo graph: filters the demo signals by age (like the
 * backend `buildGraph` filters by `event_timestamp`) and derives nodes /
 * edges with the same rules, so 1h / 24h / 7d show genuinely different
 * graphs instead of one static picture.
 */
export function demoGraph(window: "1h" | "24h" | "7d" = "24h"): GraphData {
  const hours = window === "7d" ? 168 : window === "1h" ? 1 : 24;
  const cutoff = Date.now() - hours * 3_600_000;
  const rows = signals.filter((s) => new Date(s.event_timestamp).getTime() >= cutoff);

  const nodes = new Map<string, GraphData["nodes"][number]>();
  const edges: GraphData["edges"] = [];
  const add = (
    nid: string,
    type: GraphData["nodes"][number]["type"],
    label: string,
    risk: number,
  ) => {
    if (!nid || nodes.has(nid)) return;
    nodes.set(nid, { id: nid, type, label, risk });
  };
  for (const r of rows) {
    if (r.user_identity) add(`user:${r.user_identity}`, "user", r.user_identity, r.risk_score);
    if (r.hostname) add(`host:${r.hostname}`, "device", r.hostname, r.risk_score);
    if (r.source_ip) add(`ip:${r.source_ip}`, "ip", r.source_ip, r.risk_score);
    if (r.domain) add(`dom:${r.domain}`, "domain", r.domain, r.risk_score);
    if (r.user_identity && r.hostname)
      edges.push({ from: `user:${r.user_identity}`, to: `host:${r.hostname}`, label: r.signal_type });
    if (r.user_identity && r.source_ip)
      edges.push({ from: `user:${r.user_identity}`, to: `ip:${r.source_ip}`, label: r.signal_type });
    if (r.user_identity && r.domain)
      edges.push({ from: `user:${r.user_identity}`, to: `dom:${r.domain}`, label: r.signal_type });
    if (r.hostname && r.source_ip)
      edges.push({ from: `host:${r.hostname}`, to: `ip:${r.source_ip}`, label: r.signal_type });
    if (r.hostname && r.domain)
      edges.push({ from: `host:${r.hostname}`, to: `dom:${r.domain}`, label: r.signal_type });
    if (r.source_ip && r.domain)
      edges.push({ from: `ip:${r.source_ip}`, to: `dom:${r.domain}`, label: "resolves" });
  }
  return { nodes: [...nodes.values()], edges: edges.slice(0, 800) };
}

/* --------------------------------- store --------------------------------- */

const signals = buildSignals();
const detections = buildDetections(signals);
const incidents = buildIncidents(detections);

const stats: Stats = {
  totalSignals: 1284,
  detections24h: 5,
  openIncidents: 3,
  devices: 42,
};

function paginate<T>(items: T[], page: number, limit: number): Paginated<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return {
    success: true,
    data: items.slice(start, start + limit),
    meta: { page, limit, total, totalPages },
  };
}

/* --------------------------------- queries ------------------------------- */

export function demoStats(): Stats {
  return { ...stats };
}

export function demoSignals(q: {
  page?: number;
  limit?: number;
  severity?: string;
  category?: string;
  search?: string;
  minRisk?: number;
}): Paginated<Signal> {
  const term = (q.search ?? "").trim().toLowerCase();
  const filtered = signals.filter((s) => {
    if (q.severity && s.severity !== q.severity) return false;
    if (q.category && s.category !== q.category) return false;
    if (q.minRisk && s.risk_score < q.minRisk) return false;
    if (term) {
      const hay = `${s.signal_type} ${s.message} ${s.user_identity ?? ""} ${s.hostname ?? ""} ${s.source_ip ?? ""} ${s.domain ?? ""}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
  return paginate(filtered, q.page ?? 1, q.limit ?? 20);
}

export function demoDetections(params?: {
  type?: string;
  severity?: string;
  page?: number;
  limit?: number;
}): Paginated<Detection> {
  const filtered = detections.filter((d) => {
    if (params?.type && d.detection_type !== params.type) return false;
    if (params?.severity && d.severity !== params.severity) return false;
    return true;
  });
  return paginate(filtered, params?.page ?? 1, params?.limit ?? 20);
}

export function demoDetection(id: string): Detection {
  const found = detections.find((d) => d.id === id);
  if (!found) throw new Error("Detection not found");
  return found;
}

export function demoPromoteDetection(id: string): Incident {
  const detection = demoDetection(id);
  detection.status = "PROMOTED";
  const incident: Incident = {
    id: `inc-demo-${Date.now()}`,
    title: detection.title,
    description: `Promoted from detection ${detection.id} in demo mode.`,
    status: "OPEN",
    severity: detection.severity,
    assignee_id: null,
    detection_id: detection.id,
    created_at: new Date().toISOString(),
    resolved_at: null,
    remediation: [],
    signals: (detection.signals ?? []).map(({ weight: _w, ...s }) => ({ ...s, weight: 0 })),
  };
  incidents.unshift(incident);
  return incident;
}

export function demoIncidents(params?: {
  status?: string;
  severity?: string;
  page?: number;
  limit?: number;
}): Paginated<Incident> {
  const filtered = incidents.filter((i) => {
    if (params?.status && i.status !== params.status) return false;
    if (params?.severity && i.severity !== params.severity) return false;
    return true;
  });
  return paginate(filtered, params?.page ?? 1, params?.limit ?? 20);
}

export function demoIncident(id: string): Incident {
  const found = incidents.find((i) => i.id === id);
  if (!found) throw new Error("Incident not found");
  return found;
}

export function demoUpdateIncident(
  id: string,
  body: { status?: Incident["status"]; assigneeId?: string | null },
): Incident {
  const incident = demoIncident(id);
  if (body.status) incident.status = body.status;
  if (body.assigneeId !== undefined) {
    incident.assignee_id = body.assigneeId;
    incident.assignee_email = body.assigneeId ? DEMO_EMAIL : null;
  }
  if (body.status === "RESOLVED" || body.status === "FALSE_POSITIVE" || body.status === "DISMISSED") {
    incident.resolved_at = incident.resolved_at ?? new Date().toISOString();
  }
  return incident;
}

export function demoAddRemediation(
  id: string,
  body: { action: string; notes?: string },
): { action: string; notes: string | null; created_at: string; id: string } {
  const incident = demoIncident(id);
  const entry = {
    id: `rem-demo-${Date.now()}`,
    action: body.action,
    notes: body.notes ?? null,
    created_at: new Date().toISOString(),
  };
  incident.remediation = [...(incident.remediation ?? []), entry];
  return entry;
}

export function demoReport(): Report {
  const byType = new Map<string, number>();
  const bySeverity = new Map<string, number>();
  for (const d of detections) {
    byType.set(d.detection_type, (byType.get(d.detection_type) ?? 0) + 1);
    bySeverity.set(d.severity, (bySeverity.get(d.severity) ?? 0) + 1);
  }
  const byStatus = new Map<string, number>();
  for (const i of incidents) {
    byStatus.set(i.status, (byStatus.get(i.status) ?? 0) + 1);
  }
  return {
    range: { start: isoHoursAgo(48), end: new Date().toISOString() },
    byType: [...byType.entries()].map(([detection_type, c]) => ({ detection_type, c: String(c) })),
    bySeverity: [...bySeverity.entries()].map(([severity, c]) => ({ severity, c: String(c) })),
    topRiskyUsers: [
      { user_identity: "ada.lovelace", avg_risk: 87.4, c: "14" },
      { user_identity: "alan.turing", avg_risk: 72.1, c: "9" },
      { user_identity: "grace.hopper", avg_risk: 58.9, c: "7" },
      { user_identity: "katherine.johnson", avg_risk: 41.2, c: "5" },
      { user_identity: "linus.torvalds", avg_risk: 36.8, c: "4" },
    ],
    incidents: [...byStatus.entries()].map(([status, c]) => ({ status, c: String(c) })),
  };
}
