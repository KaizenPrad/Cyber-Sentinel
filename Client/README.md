# CyberSentinel_UI

AI cyber threat detection frontend — behavioral monitoring, correlation, risk scoring, and incident response. Built with React + Vite + Tailwind CSS.

Live product UI lives under `src/sentinel/` (auth, monitor, graph, detections, incidents, reports). A marketing component library is retained under `src/components/` for landing sections.

## Features

- **Landing (`/`)** — Three.js vortex hero (`SentinelBackground`), scroll-driven streak crossfade, live stats when logged in (signals ingested, detections/24h, open incidents, devices monitored), threat-family cards (phishing / malware / ransomware / unauthorized access), correlation explainer (`PHISHING → TAKEOVER · RISK 85` with signal weights).
- **Threat Monitor (`/monitor`, auth)** — live signal feed polling every 5s, filters by search / severity (`CRITICAL/HIGH/MEDIUM/LOW/INFO`) / category (`NETWORK/AUTH/ENDPOINT/EMAIL/WEB`) / min-risk slider, paginated table with time-ago, actor, risk bar, severity badge.
- **Network Graph (`/graph`, auth)** — entity graph via `vis-network` with `1h / 24h / 7d` window, nodes colored by type (`user / device / ip / domain`), sized by risk, click-to-inspect detail panel with connections.
- **AI Detections (`/detection`, auth)** — detection list with type filter (`PHISHING / MALWARE / RANSOMWARE / UNAUTH_ACCESS / ANOMALY`), risk/confidence/signal counts, per-detection explanation view (reasoning, weighted signals, matched pills) + **Promote to Incident**.
- **Incidents (`/incidents`, `/incidents/:id`, auth)** — case list with status filter (`OPEN / INVESTIGATING / CONTAINED / RESOLVED / FALSE_POSITIVE / DISMISSED`), triage detail with status transitions, remediation log (`BLOCKED_IP / ISOLATED_HOST / DISABLED_USER / REVOKED_SESSION / QUARANTINED_FILE / …`), linked signals, metadata.
- **Security Report (`/report`, auth)** — date-range aggregates, stat cards, `recharts` bar (by type) + pie (by severity) + top-risky-users table, one-click **Export JSON**.
- **Auth (`/login`, `/register`)** — email/password + org onboarding, JWT bearer + session restore, plus **offline demo mode** (`demo@cybersentinel.local / demo1234`) that serves in-memory data with zero backend.
- **App shell** — frosted-glass header with active-route dot, user menu, mobile hamburger (Esc to close), scroll-to-top on navigation, auth guard with session spinner, shared badges/bars/cards/spinners.

## Routes

| Route | Auth | Page |
|---|---|---|
| `/` | public | `HomePage` — hero + stats + threat families |
| `/login` | public | `LoginPage` — login + demo fill |
| `/register` | public | `RegisterPage` — org + user signup |
| `/monitor` | required | `MonitorPage` — signal feed |
| `/graph` | required | `GraphPage` — entity graph |
| `/detection` | required | `DetectionPage` — AI detections + explain |
| `/incidents` | required | `IncidentsPage` — case queue |
| `/incidents/:id` | required | `IncidentDetailPage` — triage + remediation |
| `/report` | required | `ReportPage` — aggregates + export |
| `*` | — | redirects to `/` |

Unauthenticated visits to guarded routes redirect to `/login`.

## Tech Stack

- **Core:** `react@19`, `react-dom@19`, `react-router-dom@7` (`BrowserRouter` in `src/App.tsx`)
- **Build:** `vite@6`, `@vitejs/plugin-react@4`, `typescript` (`tsc --noEmit && vite build`), `@` alias → repo root
- **Styling:** `tailwindcss@4` + `@tailwindcss/vite` (`src/styles/globals.css` + `tokens.css`, `navbar-hero.css`, `features.css`, `how-it-works.css`, `insights.css`, `testimonials.css`)
- **Data:** `axios@1` singleton (`src/sentinel/api.ts`, bearer injection, `withCredentials`)
- **Viz:** `three@0.186` (hero vortex, lazy-loaded), `vis-network@10` (graph), `recharts@3` (reports)
- **Icons:** `lucide-react`
- **Dev server:** port `5173`, `/api` proxied to `http://localhost:5000`

## Getting Started

Prerequisites: Node 18+ and npm.

```bash
npm install
cp .env.example .env   # then edit VITE_API_URL if needed
npm run dev            # http://localhost:5173
```

| Script | Command | Purpose |
|---|---|---|
| dev | `vite` | local dev server |
| build | `tsc --noEmit && vite build` | typecheck + production build → `dist/` |
| preview | `vite preview` | serve built `dist/` |
| typecheck | `tsc --noEmit` | types only |

### Environment

| Variable | Default | Meaning |
|---|---|---|
| `VITE_API_URL` | _(empty → same-origin `/api`)_ | Backend base, e.g. `http://localhost:5000`. In dev, Vite proxies `/api` there; in prod set the deployed API URL. |

Copy `.env.example` → `.env`. No secret keys are needed on the client.

### Demo Mode (no backend)

1. Open `/login`.
2. Click **Fill demo account** (or type manually):
   - email: `demo@cybersentinel.local`
   - password: `demo1234`
3. Everything (signals, graph, detections, incidents, reports, mutations) works from in-memory fixtures in `src/sentinel/demo.ts`.

## Backend Contract

The client talks to a CyberSentinel API (expected at `:5000` in dev). All paths below are prefixed by `VITE_API_URL + /api` or same-origin `/api`:

- `GET /auth/session` · `POST /auth/login` · `POST /auth/register` · `POST /auth/logout`
- `GET /monitor/stats`
- `GET /monitor/signals?page&limit&severity&category&search&minRisk`
- `GET /graph?window=1h|24h|7d`
- `GET /detections?type&severity&page&limit` · `GET /detections/:id` · `POST /detections/:id/promote`
- `GET /incidents?status&severity&page&limit` · `GET /incidents/:id` · `PATCH /incidents/:id` · `POST /incidents/:id/remediation`
- `GET /reports?start&end`
- `GET /api/content` (marketing copy, falls back to `src/lib/fallback.ts` when offline)

Requests send `Authorization: Bearer <token>` (`localStorage: cybersentinel-token`) with `withCredentials: true`.

## Project Structure

```
index.html                  # title, fonts (Poppins), hourglass favicons
vite.config.ts              # react + tailwind, @ alias, :5173, /api proxy
tsconfig.json               # ES2022, bundler resolution, @/* paths
public/
  Cyberlogo/                # hourglass-mark, favicon, apple-touch-icon
  images/cybersentinel-logo.svg
src/
  main.tsx                  # StrictMode boot, globals.css
  App.tsx                   # ContentProvider > AuthProvider > Router > SentinelLayout
  tornado_vortex.html       # reference source for the Three.js hero
  lib/
    content.tsx / fallback.ts / tokens.ts / types.ts / useOnscreen.ts
  sentinel/                 # *** active product ***
    api.ts                  # axios client, types, demo-vs-live switch
    auth.tsx                # AuthContext, login/register/logout, demo session
    demo.ts                 # 48 signals, 8 detections, 6 incidents, 14-node graph
    layout.tsx              # header nav, shell, footer wiring
    ui.tsx / UserMenu.tsx / readable.css
    pages/
      HomePage.tsx          # hero + stats + threat cards
      MonitorPage.tsx       # signal feed
      GraphPage.tsx         # vis-network graph
      DetectionPage.tsx     # list + explanation + promote
      IncidentsPage.tsx     # queue
      IncidentDetailPage.tsx# triage
      ReportPage.tsx        # charts + export
      AuthPages.tsx         # login / register
  components/               # retained marketing library (not in active routes)
    hero/ (Hero, HeroBackground, LogoStrip)
    features/ (FeaturesSection, FeatureCarousel, GanttCard, PipelineCard, …)
    how/ (HowItWorksSection, PipelineLiveCard, ScheduleCard, …)
    insights/ (InsightsSection, Dashboard, AssigneeChart, ProjectsTable, …)
    pricing/ (PricingSection, PricingCard, BillingToggle)
    testimonials/ (TestimonialsSection, TestimonialCard)
    cta/ (FinalCta, ParticleField)
    Footer.tsx / Navbar.tsx / SentinelBackground.tsx / RiseStreaks.tsx / …
  styles/                   # globals.css + per-section css
```

`src/components/*` (Hero, Features, How-it-works, Insights, Pricing, Testimonials, FinalCta) is currently only re-exported from `src/components/index.ts` and driven by `src/lib/content.tsx` — kept for future landing use; the live `/` is the Sentinel hero in `src/sentinel/pages/HomePage.tsx`.

## Notes

- Path alias: import product code as `@/src/sentinel/...`, styles via `./styles/...`.
- Reduced-motion users get a static hero frame; the vortex canvas is lazy-loaded with `Suspense`.
- `dist/`, `node_modules/`, `.env*`, logs, and editor dirs are git-ignored; `CyberSentinel_UI/` placeholder dir is also ignored.
