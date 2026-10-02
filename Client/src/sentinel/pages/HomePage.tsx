import { ChevronsRight, FileLock2, Fish, KeyRound, Radar } from "lucide-react";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Reveal } from "@/src/components/Reveal";
import { RiseStreaks } from "@/src/components/RiseStreaks";
import { SectionHeader } from "@/src/components/SectionHeader";
import { StarButton } from "@/src/components/StarButton";
import { useAuth } from "../auth";
import { fetchStats } from "../api";
import type { Stats } from "../api";
import { Spinner, StatCard } from "../ui";

// Lazy-load the heavy Three.js background so it only downloads on `/`.
const SentinelBackground = lazy(() =>
  import("@/src/components/SentinelBackground").then((m) => ({
    default: m.SentinelBackground,
  })),
);

const THREATS = [
  {
    icon: Fish,
    title: "Phishing",
    body: "Link click + credential form + impossible-travel login correlate into one takeover detection.",
  },
  {
    icon: Radar,
    title: "Malware behaviour",
    body: "Rare process + periodic beaconing + suspicious DNS + new ASN connection become a C2 case.",
  },
  {
    icon: FileLock2,
    title: "Ransomware indicators",
    body: "Mass renames + shadow-copy deletion + high-entropy writes fire before encryption completes.",
  },
  {
    icon: KeyRound,
    title: "Unauthorized access",
    body: "Brute-force burst + off-hours login + privilege escalation flag the session, not just the login.",
  },
];

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const riseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    setStatsLoading(true);
    fetchStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [user]);

  // Scroll-driven crossfade: hourglass (top) → rise streaks (bottom).
  // The hourglass itself parallaxes upward inside SentinelBackground;
  // here we glide the streak layer in as you approach the page bottom.
  useEffect(() => {
    const node = riseRef.current;
    if (!node) return;
    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let ticking = false;
    let smooth = typeof window !== "undefined" ? window.scrollY : 0;

    const update = () => {
      ticking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const target = window.scrollY;
      smooth += (target - smooth) * (reducedMotion ? 1 : 0.14);
      if (Math.abs(target - smooth) < 0.05) smooth = target;
      const progress = max > 0 ? Math.min(Math.max(smooth / max, 0), 1) : 0;
      // Fade window: invisible for the first ~35% of the page, fully in by ~80%.
      const t = Math.min(Math.max((progress - 0.35) / 0.45, 0), 1);
      const eased = t * t * (3 - 2 * t);
      node.style.opacity = eased.toFixed(3);
      node.style.visibility = eased <= 0.01 ? "hidden" : "visible";
      // Rise-in drift so the streaks feel like they travel up with the scroll.
      node.style.transform = reducedMotion
        ? ""
        : `translate3d(0, ${((1 - eased) * 90).toFixed(1)}px, 0)`;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        raf = requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <SentinelBackground />
      </Suspense>
      {/* Bottom-of-home streak layer: fixed like the hourglass, opacity driven
          by scroll above so it dissolves in as you reach the page bottom. */}
      <div
        ref={riseRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-0 will-change-transform"
        style={{ visibility: "hidden" }}
      >
        <RiseStreaks />
      </div>
      <div className="relative z-10">
      <section className="relative py-10 sm:py-14 lg:py-20">
        {/* Hero scrim (desktop): dark wedge between the flow-field canvas
            and the copy so the headline lifts out of the bright strands
            instead of sinking into them. Hidden on phones — they get the
            full-width scrim below. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 -left-24 z-0 hidden h-[150%] w-[85%] -translate-y-1/2 bg-[radial-gradient(ellipse_55%_50%_at_30%_50%,rgba(0,0,0,0.82),transparent_70%)] sm:block"
        />
        {/* Hero scrim (phones only): full-width dark backdrop centred behind
            the hero copy so every line stays legible over the bright vortex
            on narrow screens. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 z-0 h-[135%] -translate-y-1/2 bg-[radial-gradient(ellipse_90%_55%_at_50%_45%,rgba(0,0,0,0.88),transparent_75%)] sm:hidden"
        />
        <div className="relative">
        <Reveal offset="md" duration={1000}>
          <p className="font-mono text-xs tracking-[0.12em] text-white/80 [text-shadow:0_1px_8px_rgba(0,0,0,0.9)] sm:text-white/50 sm:[text-shadow:none]">
            AI CYBER THREAT DETECTION
          </p>
          <h1 className="hero-title mt-5 font-display tracking-tight drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)]">
            <span className="block text-foreground [text-shadow:0_2px_14px_rgba(0,0,0,0.95)] sm:[text-shadow:none]">See attacks</span>
            <span className="text-gradient-headline -mb-[0.12em] block pb-[0.12em] leading-[1.05]">signatures miss.</span>
          </h1>
        </Reveal>
        <Reveal offset="sm" delay={150} duration={700}>
          <p className="mt-4 max-w-xl text-xl leading-relaxed text-gray-100 [text-shadow:0_1px_12px_rgba(0,0,0,0.95)] sm:text-muted-foreground sm:[text-shadow:none]">
            CyberSentinel watches network, user and device behaviour, then
            correlates weak signals — phishing, malware, ransomware,
            unauthorized access — into high-confidence detections.
          </p>
        </Reveal>
        <Reveal offset="sm" delay={300} duration={700}>
          <div className="mt-8 flex min-[390px]:flex-row flex-col gap-3">
            <StarButton size="md" onClick={() => navigate(user ? "/monitor" : "/register")}>
              {user ? "OPEN THREAT MONITOR" : "GET PROTECTED"}
              <ChevronsRight size={14} strokeWidth={1.8} aria-hidden="true" />
            </StarButton>
            <Link
              to="/detection"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/25 bg-white/[0.06] px-5 py-2 text-base text-foreground backdrop-blur-md transition-colors hover:bg-white/[0.1]"
            >
              View AI detections
            </Link>
          </div>
        </Reveal>
        </div>
      </section>

      {user ? (
        <section aria-label="Platform status" className="mt-4">
          {statsLoading ? (
            <Spinner label="Loading platform status" />
          ) : stats ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="SIGNALS INGESTED" value={stats.totalSignals} hint="across network · user · device" />
              <StatCard label="DETECTIONS · 24H" value={stats.detections24h} hint="correlated by AI engine" />
              <StatCard label="OPEN INCIDENTS" value={stats.openIncidents} hint="needs triage" />
              <StatCard label="DEVICES MONITORED" value={stats.devices} hint="enrolled endpoints" />
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="pt-24 lg:pt-32">
        <SectionHeader
          title={["Four threat families,", "one correlation engine."]}
          description="Single events are low confidence. Combined patterns become incidents — every detection ships with its signal weights and reasoning."
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {THREATS.map((t, i) => (
            <Reveal key={t.title} offset="sm" delay={(i % 4 === 0 ? 0 : 150) as 0 | 150} duration={700}>
              <div className="card-frame h-full p-6">
                <t.icon size={24} className="text-white/70" aria-hidden="true" />
                <h3 className="mt-4 font-display text-[22px] leading-snug text-foreground">{t.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-muted-foreground">{t.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="pt-24 lg:pt-32">
        <SectionHeader
          title={["Correlate, don't", "just match."]}
          description="Risk 0–100 per detection. Anything at 70 or above opens an incident automatically."
        />
        <div className="card-frame mt-10 p-6 sm:p-8">
          <p className="font-mono text-xs tracking-[0.12em] text-white/50">
            EXAMPLE — PHISHING → ACCOUNT TAKEOVER · RISK 85
          </p>
          <div className="mt-6 space-y-5">
            {[
              { label: "PHISH_CLICK", weight: 30 },
              { label: "CREDENTIAL_FORM_POST", weight: 30 },
              { label: "IMPOSSIBLE_TRAVEL", weight: 25 },
              { label: "MFA_FAILURE", weight: 15 },
            ].map((s) => (
              <div key={s.label}>
                <div className="mb-2 flex items-center justify-between font-mono text-xs tracking-[0.08em]">
                  <span className="text-white/80">{s.label}</span>
                  <span className="text-white/60">× {s.weight}%</span>
                </div>
                <span className="block h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${s.weight * 2.4}%`, background: "var(--gradient-bar-cyan)" }}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
      </div>
    </>
  );
}
