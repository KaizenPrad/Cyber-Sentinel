import { Link } from "react-router-dom";
import { SectionHeader } from "@/src/components/SectionHeader";
import { Reveal } from "@/src/components/Reveal";

const codeCls =
  "mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-[13px] leading-relaxed text-white/85";

const EVENT_ROWS: [string, string, string][] = [
  ["5+ wrong passwords / OTPs in 1 min", "BRUTE_FORCE_BURST", "AUTH · HIGH"],
  ["Login at 2–5am / weekend", "OFF_HOURS_LOGIN", "AUTH · MEDIUM"],
  ["OTP / MFA failed 3×", "MFA_FAILURE", "AUTH · MEDIUM"],
  ["Login from 2 countries in minutes", "IMPOSSIBLE_TRAVEL", "AUTH · HIGH"],
  ["Normal user becomes admin / seller gets refund rights", "PRIV_ESCALATION", "AUTH · HIGH"],
  ["Bulk private-data access (orders, records, wallets)", "SENSITIVE_SHARE_ACCESS", "ENDPOINT · MEDIUM"],
  ["Clicked / submitted suspicious link", "PHISH_CLICK", "EMAIL or WEB · MEDIUM"],
  ["Password / card submitted on external page", "CREDENTIAL_FORM_POST", "WEB · HIGH"],
  ["Account fires 100 API calls / messages in 1 min (bot)", "BEACONING", "NETWORK · MEDIUM"],
  ["Request to unknown / newly-registered domain", "SUSPICIOUS_DNS", "NETWORK · MEDIUM"],
  ["First-time connection to new region / ASN", "NEW_ASN_CONN", "NETWORK · LOW"],
  ["Unknown script / binary / macro executed", "RARE_PROCESS", "ENDPOINT · MEDIUM"],
  ["Mass file rename / encrypt", "MASS_FILE_RENAME", "ENDPOINT · HIGH"],
  ["Backup / shadow-copy deleted", "SHADOW_COPY_DELETE", "ENDPOINT · HIGH"],
];

const TROUBLE_ROWS: [string, string, string][] = [
  ["401 Unauthorized / Invalid or expired token", "JWT expired (1h) or missing Bearer", "Re-login POST /api/auth/login, update SENTINEL_TOKEN"],
  ["401 Invalid API key", "Key revoked, expired, or malformed", "Create a new key, check the cs_live_ prefix"],
  ["429 Too many requests", "Hit 200/15min limiter", "Batch more, reduce polling"],
  ["400 validation error", "Missing signalType/message/eventTimestamp or bad enum", "Check payload reference enums + ISO date"],
  ["Monitor / Graph empty", "No signals in window, wrong org token, PORT mismatch", "Re-send test curl, try window=7d, confirm same org login"],
  ["Detection not created", "Only 1 weak signal, or different userIdentity", "Send 2+ matching types for same user in one batch"],
  ["CORS error in browser", "FRONTEND_URL mismatch", "Set backend FRONTEND_URL to match frontend origin"],
];

const FAQS: [string, string][] = [
  ["Do my app users need a Sentinel account?", "No. Only your team logs in. App users just appear as userIdentity strings."],
  ["Do I need to install an agent / SDK?", "No. Just the HTTPS push from Step 3. No daemon, no dependency."],
  ["Which languages work?", "Any backend that can send HTTPS POST with JSON — Node, Python, PHP, Java, Go, Ruby, .NET."],
  ["Does this slow my app?", "No if you use fire-and-forget. Scoring runs on the Sentinel side."],
  ["Is my data mixed with others?", "No. Every query filters by organization. You only see your org."],
  ["What does it cost?", "Nothing extra. Postgres + Node only. No external AI API needed."],
];

function Code({ children }: { children: string }) {
  return (
    <pre className={codeCls}>
      <code>{children}</code>
    </pre>
  );
}

function CardTitle({ children }: { children: string }) {
  return <p className="font-mono text-xs tracking-[0.12em] text-white/50">{children}</p>;
}

export function DocsPage() {
  return (
    <div>
      <SectionHeader
        title={["Connect any app", "in minutes."]}
        description="Forward security-relevant events from your backend to Sentinel. No UI, database, or user-flow changes needed — your users notice nothing."
      />

      <div className="mt-10 space-y-6">
        <Reveal offset="sm" duration={700}>
          <section className="card-frame p-6 sm:p-8">
            <CardTitle>WHO IS THIS FOR?</CardTitle>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              You are a developer building or maintaining an app for your organization. You want CyberSentinel
              to watch your app for hacking, phishing, bot abuse, and account takeover.
            </p>
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">
              You do not need to change your UI, database, or user flow. You only forward copies of
              security-relevant events from your backend to Sentinel.
            </p>
          </section>
        </Reveal>

        <Reveal offset="sm" duration={700}>
          <section className="card-frame p-6 sm:p-8">
            <CardTitle>HOW IT WORKS — IN 30 SECONDS</CardTitle>
            <Code>{`Your Backend (any stack: Node / Python / PHP / Java)
  login fails, password reset, link clicked, bulk API calls, file uploads
        |
        |  POST /api/ingest  (your backend -> Sentinel backend)
        v
CyberSentinel
  Score 0-100 -> Correlate 2-3 signals -> Detection -> Auto-Incident
        |
        v
Your Security Dashboard (Monitor / Graph / Detection / Incidents / Report)`}</Code>
            <ul className="mt-4 list-disc space-y-1.5 pl-5 text-base leading-relaxed text-muted-foreground">
              <li><span className="text-foreground">1 weak signal = noise.</span> Ignored.</li>
              <li><span className="text-foreground">2–3 related signals for the same user = attack.</span> Alert + case opened.</li>
            </ul>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Example: <span className="font-mono text-sm">5 failed logins</span> +{" "}
              <span className="font-mono text-sm">OTP failed</span> +{" "}
              <span className="font-mono text-sm">login from new country</span> = Unauthorized Access, Risk 80.
              Or <span className="font-mono text-sm">clicked suspicious link</span> +{" "}
              <span className="font-mono text-sm">submitted credentials</span> +{" "}
              <span className="font-mono text-sm">new-country login</span> = Phishing → Account Takeover, Risk 85.
            </p>
          </section>
        </Reveal>

        <Reveal offset="sm" duration={700}>
          <section className="card-frame p-6 sm:p-8">
            <CardTitle>STEP 1 — CREATE YOUR ORGANIZATION ACCOUNT</CardTitle>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-base leading-relaxed text-muted-foreground">
              <li>Open your Sentinel frontend (e.g. <span className="font-mono text-sm">http://localhost:5173</span>).</li>
              <li>Go to <Link to="/register" className="text-white underline underline-offset-4">Register</Link>.</li>
              <li>Fill: email, password (8+ chars), your name, <span className="text-foreground">Organization Name</span> (e.g. Acme Pvt Ltd).</li>
            </ol>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Sentinel creates a private workspace for your company. All data is isolated by organization.
              Your role is <span className="font-mono text-sm">OWNER</span>. Afterwards, sign in at{" "}
              <Link to="/login" className="text-white underline underline-offset-4">Login</Link> with the same
              email/password.
            </p>
          </section>
        </Reveal>

        <Reveal offset="sm" duration={700}>
          <section className="card-frame p-6 sm:p-8">
            <CardTitle>STEP 2 — GET YOUR CONNECTION TOKEN</CardTitle>
            <p className="mt-3 font-mono text-xs tracking-[0.1em] text-white/70">OPTION A — PERMANENT API KEY (RECOMMENDED FOR SERVER-TO-SERVER)</p>
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">
              API keys are long-lived credentials (like <span className="font-mono text-sm">cs_live_…</span>) for
              backend ingestion. Easiest path:{" "}
              <Link to="/keys" className="text-white underline underline-offset-4">create one on the API Keys page</Link>{" "}
              (OWNER or ADMIN). Or via curl — first login, then create (the returned{" "}
              <span className="font-mono text-sm">key</span> is shown only once):
            </p>
            <Code>{`# 1. Login to get a JWT token
curl -X POST http://localhost:5000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"dev@yourcompany.com","password":"your-password"}'

# 2. Create an API key (save the returned key!)
curl -X POST http://localhost:5000/api/auth/api-keys \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \\
  -d '{"name": "production-ingest", "expiresInDays": 365}'`}</Code>
            <p className="mt-4 font-mono text-xs tracking-[0.1em] text-white/70">OPTION B — JWT TOKEN (FOR INTERACTIVE USE)</p>
            <Code>{`curl -X POST http://localhost:5000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"dev@yourcompany.com","password":"your-password"}'
# Copy the "token" from the response.`}</Code>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              In your app's <span className="font-mono text-sm">.env</span>:
            </p>
            <Code>{`SENTINEL_URL=http://localhost:5000
SENTINEL_TOKEN=cs_live_...your-key   (or eyJhbGciOi...your-jwt)`}</Code>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              JWT tokens expire in <span className="text-foreground">1 hour</span> — re-login for a new one if
              ingest returns <span className="font-mono text-sm">401 Invalid or expired token</span>. API keys
              are recommended for production. Send the token on every request as:
            </p>
            <Code>{`Authorization: Bearer <SENTINEL_TOKEN>`}</Code>
          </section>
        </Reveal>

        <Reveal offset="sm" duration={700}>
          <section className="card-frame p-6 sm:p-8">
            <CardTitle>MANAGING API KEYS (OWNER OR ADMIN)</CardTitle>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">List all keys (metadata only, never the secret):</p>
            <Code>{`curl -X GET http://localhost:5000/api/auth/api-keys \\
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"`}</Code>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">Get details of one key:</p>
            <Code>{`curl -X GET http://localhost:5000/api/auth/api-keys/<KEY_ID> \\
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"`}</Code>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">Revoke a key:</p>
            <Code>{`curl -X DELETE http://localhost:5000/api/auth/api-keys/<KEY_ID> \\
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"`}</Code>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Security note: the full key is returned only at creation. Store it in your secrets manager /{" "}
              <span className="font-mono text-sm">.env</span>. If lost, revoke and create a new one. You can
              also manage keys visually on the <Link to="/keys" className="text-white underline underline-offset-4">API Keys page</Link>.
            </p>
          </section>
        </Reveal>

        <Reveal offset="sm" duration={700}>
          <section className="card-frame p-6 sm:p-8">
            <CardTitle>STEP 3 — ADD ONE HELPER TO YOUR BACKEND</CardTitle>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Create one file in your codebase. Node.js example (same idea in Python/PHP/Java/Go).
              You do not need to change your server setup — just import this helper in existing controllers.
            </p>
            <Code>{`// utils/sentinel.js — fire-and-forget: never blocks your user response
export async function reportToSentinel(signals) {
  if (!process.env.SENTINEL_URL || !process.env.SENTINEL_TOKEN) return;
  try {
    fetch(process.env.SENTINEL_URL + "/api/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.SENTINEL_TOKEN
      },
      body: JSON.stringify({ signals })
    }).catch(() => {});
  } catch {}
}`}</Code>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">Python equivalent:</p>
            <Code>{`import os, requests
def report_to_sentinel(signals):
    url = os.getenv("SENTINEL_URL")
    token = os.getenv("SENTINEL_TOKEN")
    if not url or not token: return
    try:
        requests.post(url + "/api/ingest",
          headers={"Authorization": "Bearer " + token},
          json={"signals": signals}, timeout=3)
    except: pass`}</Code>
          </section>
        </Reveal>

        <Reveal offset="sm" duration={700}>
          <section className="card-frame p-6 sm:p-8">
            <CardTitle>STEP 4 — SEND EVENTS WHERE THEY ALREADY HAPPEN</CardTitle>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Call the helper inside existing logic. Pick the patterns matching your app type.
            </p>
            <p className="mt-4 font-mono text-xs tracking-[0.1em] text-white/70">A. AUTH EVENTS — FOR EVERY APP (LOGIN, SIGNUP, OTP, PASSWORD RESET)</p>
            <Code>{`// FAILED login
reportToSentinel([{
  signalType: "BRUTE_FORCE_BURST",
  category: "AUTH",
  severity: "HIGH",
  message: "Failed login for " + email + " - attempt " + count,
  userIdentity: email,        // must be same across related events
  sourceIp: req.ip,
  eventTimestamp: new Date().toISOString(),
  rawData: { attempts: count }
}]);

// SUCCESS but suspicious (off-hours or new location/device)
if (isOffHours || isNewCountry) {
  reportToSentinel([
    { signalType: "OFF_HOURS_LOGIN", category: "AUTH", severity: "MEDIUM",
      message: "Off-hours login " + email, userIdentity: email,
      sourceIp: req.ip, eventTimestamp: new Date().toISOString(), rawData: {} },
    { signalType: "IMPOSSIBLE_TRAVEL", category: "AUTH", severity: "HIGH",
      message: email + " Delhi then Lagos in 12 min", userIdentity: email,
      sourceIp: req.ip, eventTimestamp: new Date().toISOString(), rawData: {} }
  ]);
}`}</Code>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Applies to: SaaS login, e-commerce checkout login, edtech student login, fintech wallet login.
            </p>
            <p className="mt-4 font-mono text-xs tracking-[0.1em] text-white/70">B. USER-CONTENT EVENTS — POSTS, MESSAGES, COMMENTS, REVIEWS, UPLOADS</p>
            <Code>{`if (containsLink(text) || isSpamBurst) {
  reportToSentinel([{
    signalType: "PHISH_CLICK",
    category: "WEB",
    severity: "MEDIUM",
    message: "Suspicious link submitted by " + req.user.username,
    userIdentity: req.user.email || req.user.username,
    sourceIp: req.ip,
    domain: extractDomain(text),  // e.g. "xn--paypa1.com"
    eventTimestamp: new Date().toISOString(),
    rawData: { contentPreview: text.slice(0, 500) }
  }]);
}`}</Code>
            <p className="mt-4 font-mono text-xs tracking-[0.1em] text-white/70">C. PRIVILEGE / SENSITIVE-ACTION EVENTS — ROLES, PAYMENTS, PRIVATE FILES</p>
            <Code>{`reportToSentinel([{
  signalType: "PRIV_ESCALATION",
  category: "AUTH",
  severity: "HIGH",
  message: user.email + " granted admin",
  userIdentity: user.email,
  sourceIp: req.ip,
  eventTimestamp: new Date().toISOString(),
  rawData: {}
}]);`}</Code>
            <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 text-base leading-relaxed text-foreground">
              Golden rule (all apps): send 2+ related signals for the same{" "}
              <span className="font-mono text-sm">userIdentity</span> in one call when you can. That is what
              triggers a Detection. Singles alone are treated as noise.
            </p>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">Test with curl (works for any app):</p>
            <Code>{`curl -X POST http://localhost:5000/api/ingest \\
  -H "Authorization: Bearer $SENTINEL_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"signals":[
   {"signalType":"PHISH_CLICK","category":"EMAIL","severity":"MEDIUM",
    "message":"Clicked xn--paypa1.com","userIdentity":"adi@corp.com",
    "eventTimestamp":"2026-09-26T10:00:00Z","rawData":{}},
   {"signalType":"CREDENTIAL_FORM_POST","category":"WEB","severity":"HIGH",
    "message":"Password submitted on fake page","userIdentity":"adi@corp.com",
    "eventTimestamp":"2026-09-26T10:02:00Z","rawData":{}},
   {"signalType":"IMPOSSIBLE_TRAVEL","category":"AUTH","severity":"HIGH",
    "message":"IN then NG 12min","userIdentity":"adi@corp.com",
    "sourceIp":"103.21.244.10","eventTimestamp":"2026-09-26T10:14:00Z","rawData":{}}
  ]}'
# -> { processed: 3, detectionsTriggered: 1, incidentsCreated: 1 }`}</Code>
          </section>
        </Reveal>

        <Reveal offset="sm" duration={700}>
          <section className="card-frame overflow-hidden">
            <p className="px-5 pt-6 font-mono text-xs tracking-[0.12em] text-white/50 sm:px-8">EVENT CATALOG — MAP YOUR APP EVENTS TO SENTINEL</p>
            <p className="px-5 pt-2 text-base text-muted-foreground sm:px-8">Use these exact uppercase names. Pick only rows relevant to your app:</p>
            <div className="overflow-x-auto">
              <table className="mt-2 w-full min-w-[640px] text-left text-base">
                <thead>
                  <tr className="border-y border-white/[0.06] font-mono text-xs tracking-[0.1em] text-white/50">
                    <th className="px-5 py-4 sm:px-8">YOUR APP EVENT (ANY DOMAIN)</th>
                    <th className="px-5 py-4">SEND AS signalType</th>
                    <th className="px-5 py-4">CATEGORY · SEVERITY</th>
                  </tr>
                </thead>
                <tbody>
                  {EVENT_ROWS.map(([event, type, meta]) => (
                    <tr key={type} className="border-b border-white/[0.06] last:border-0">
                      <td className="px-5 py-3.5 text-muted-foreground sm:px-8">{event}</td>
                      <td className="break-id px-5 py-3.5 font-mono text-[13px] text-white/85">{type}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[13px] text-white/60">{meta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 px-5 py-5 text-base leading-relaxed text-muted-foreground sm:px-8">
              <p><span className="font-mono text-sm text-white/85">PHISHING</span> = PHISH_CLICK + CREDENTIAL_FORM_POST + IMPOSSIBLE_TRAVEL + MFA_FAILURE</p>
              <p><span className="font-mono text-sm text-white/85">UNAUTH_ACCESS</span> = BRUTE_FORCE_BURST + OFF_HOURS_LOGIN + PRIV_ESCALATION + SENSITIVE_SHARE_ACCESS</p>
              <p><span className="font-mono text-sm text-white/85">MALWARE</span> = RARE_PROCESS + BEACONING + SUSPICIOUS_DNS + NEW_ASN_CONN</p>
              <p><span className="font-mono text-sm text-white/85">RANSOMWARE</span> = MASS_FILE_RENAME + SHADOW_COPY_DELETE + HIGH_ENTROPY_WRITE + OUTBOUND_TOR</p>
              <p>Score ≥55 creates Detection, ≥70 auto-opens Incident, ≥85 is CRITICAL.</p>
              <p className="pt-1"><span className="text-foreground">Which rows do I need?</span> SaaS / edtech / internal tool → auth + privilege rows. E-commerce / fintech → auth + sensitive-access + suspicious-domain. Chat / social → auth + link/bot rows. File-hosting / DMS → all endpoint / ransomware rows.</p>
            </div>
          </section>
        </Reveal>

        <Reveal offset="sm" duration={700}>
          <section className="card-frame p-6 sm:p-8">
            <CardTitle>PAYLOAD REFERENCE — POST /api/ingest</CardTitle>
            <Code>{`{
  "signals": [
    {
      "signalType": "BRUTE_FORCE_BURST",
      "category": "AUTH",
      "severity": "HIGH",
      "message": "human-readable description (required)",
      "sourceIp": "103.21.244.10",
      "userIdentity": "user@yourapp.com",
      "hostname": "web-01",
      "domain": "evil.com",
      "deviceId": "optional-device-uuid",
      "rawData": { "any": "extra JSON" },
      "eventTimestamp": "2026-09-30T10:00:00.000Z"
    }
  ]
}`}</Code>
            <ul className="mt-4 list-disc space-y-1.5 pl-5 text-base leading-relaxed text-muted-foreground">
              <li><span className="font-mono text-sm">signals</span>: array, 1–500 per request. Required.</li>
              <li><span className="font-mono text-sm">signalType</span>: string, uppercased automatically. Required.</li>
              <li><span className="font-mono text-sm">category</span>: one of NETWORK | AUTH | ENDPOINT | EMAIL | WEB. Defaults to NETWORK.</li>
              <li><span className="font-mono text-sm">severity</span>: one of INFO | LOW | MEDIUM | HIGH | CRITICAL. Defaults to INFO.</li>
              <li><span className="font-mono text-sm">message</span>: required, shown in dashboard feed.</li>
              <li><span className="font-mono text-sm">userIdentity</span>, <span className="font-mono text-sm">hostname</span>: most important for correlation. Use stable IDs. Same user + same host in one batch = grouped.</li>
              <li><span className="font-mono text-sm">eventTimestamp</span>: ISO datetime. Use event time, not server time, if delayed.</li>
              <li>Response: <span className="font-mono text-sm">{"{ processed, detectionsTriggered, incidentsCreated }"}</span>.</li>
              <li>Limits: global 200 req / 15 min, auth 30 / 15 min. Batch events (e.g. every 5 sec) instead of one request per event.</li>
            </ul>
          </section>
        </Reveal>

        <Reveal offset="sm" duration={700}>
          <section className="card-frame p-6 sm:p-8">
            <CardTitle>VERIFY IT WORKS</CardTitle>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-base leading-relaxed text-muted-foreground">
              <li>Send the test curl from Step 4.</li>
              <li>Open Sentinel → Monitor — you should see your signals live.</li>
              <li>Open Detection — e.g. Probable Phishing → Account Takeover, Risk ~85, with reasoning + weights.</li>
              <li>Open Incidents — auto-created OPEN incident (score ≥70). Assign → change status → add remediation note.</li>
              <li>Open Graph (window=24h) — you should see user → ip/domain nodes.</li>
              <li>Open Report — counts by type/severity, top risky users.</li>
            </ol>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              If Monitor is empty: check token (401 = expired, re-login), check SENTINEL_URL port, check browser network tab.
            </p>
          </section>
        </Reveal>

        <Reveal offset="sm" duration={700}>
          <section className="card-frame p-6 sm:p-8">
            <CardTitle>DAILY WORKFLOW (AFTER CONNECTION)</CardTitle>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Your security team does this, not your app's end-users:
            </p>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-base leading-relaxed text-muted-foreground">
              <li><span className="text-foreground">Home</span> — totals: signals, detections in 24h, open incidents, devices.</li>
              <li><span className="text-foreground">Monitor</span> — live feed. Filter by severity / category / search / minRisk.</li>
              <li><span className="text-foreground">Graph</span> — attack path. Click a node to see risk. Use 1h / 24h / 7d.</li>
              <li><span className="text-foreground">Detection</span> — open one → read reasoning + matched signals + confidence → Promote to incident if real.</li>
              <li><span className="text-foreground">Incidents</span> — assign teammate, move OPEN → INVESTIGATING → CONTAINED → RESOLVED (or FALSE_POSITIVE / DISMISSED), log actions like BLOCKED_IP, RESET_PASSWORD, DISABLED_ACCOUNT.</li>
              <li><span className="text-foreground">Report</span> — pick date range → charts by type/severity + risky-users table → export JSON for management.</li>
            </ol>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Your app users never see any of this. They keep using your app normally.
            </p>
          </section>
        </Reveal>

        <Reveal offset="sm" duration={700}>
          <section className="card-frame p-6 sm:p-8">
            <CardTitle>BEST PRACTICES (ANY STACK)</CardTitle>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed text-muted-foreground">
              <li><span className="text-foreground">Fire-and-forget.</span> Never await Sentinel in your user request path. Send in background so Sentinel downtime never breaks your app.</li>
              <li><span className="text-foreground">Send security events only.</span> Logins, password changes, links, spam bursts, admin changes, payments/refunds. Do not send every page view or chat message — you will hit rate limits and noise.</li>
              <li><span className="text-foreground">Stable IDs.</span> Always send same userIdentity (user-id or email, not display name that changes) and hostname (server/pod name).</li>
              <li><span className="text-foreground">Batch.</span> Collect 10–50 events for 5 seconds, send once. Better correlation + fewer requests.</li>
              <li><span className="text-foreground">Keep rawData small.</span> First 500 chars, counts, user-agent. Never send passwords, tokens, card numbers, or full PII bodies.</li>
              <li><span className="text-foreground">Handle 401.</span> If ingest returns 401, refresh your login token and retry once.</li>
              <li><span className="text-foreground">One service account.</span> Create one Sentinel user like bot@yourcompany.com just for ingest, don't use a human's token.</li>
            </ul>
          </section>
        </Reveal>

        <Reveal offset="sm" duration={700}>
          <section className="card-frame overflow-hidden">
            <p className="px-5 pt-6 font-mono text-xs tracking-[0.12em] text-white/50 sm:px-8">TROUBLESHOOTING</p>
            <div className="overflow-x-auto">
              <table className="mt-2 w-full min-w-[640px] text-left text-base">
                <thead>
                  <tr className="border-y border-white/[0.06] font-mono text-xs tracking-[0.1em] text-white/50">
                    <th className="px-5 py-4 sm:px-8">SYMPTOM</th>
                    <th className="px-5 py-4">CAUSE</th>
                    <th className="px-5 py-4">FIX</th>
                  </tr>
                </thead>
                <tbody>
                  {TROUBLE_ROWS.map(([symptom, cause, fix]) => (
                    <tr key={symptom} className="border-b border-white/[0.06] last:border-0">
                      <td className="break-id px-5 py-3.5 font-mono text-[13px] text-white/85 sm:px-8">{symptom}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{cause}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{fix}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </Reveal>

        <Reveal offset="sm" duration={700}>
          <section className="card-frame p-6 sm:p-8">
            <CardTitle>FAQ</CardTitle>
            <div className="mt-3 space-y-4">
              {FAQS.map(([q, a]) => (
                <div key={q}>
                  <p className="text-base font-medium text-foreground">{q}</p>
                  <p className="mt-1 text-base leading-relaxed text-muted-foreground">{a}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal offset="sm" duration={700}>
          <section className="card-frame p-6 sm:p-8">
            <CardTitle>QUICK CHECKLIST (ANY DEVELOPER)</CardTitle>
            <ul className="mt-3 space-y-2 text-base leading-relaxed text-muted-foreground">
              {[
                "Registered org + logged in",
                "Copied token → your app .env as SENTINEL_TOKEN (+ SENTINEL_URL)",
                "Added 1 helper (reportToSentinel / report_to_sentinel)",
                "Added calls in existing code: auth events + content/link events (if any) + privilege events (if any)",
                "Sent test curl → saw Detection + Incident",
                "Team knows Monitor → Detection → Incidents → Report flow",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-1.5 inline-block size-4 shrink-0 rounded border border-white/20" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-base text-foreground">Done. Your app — whatever it does — is now watched.</p>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
