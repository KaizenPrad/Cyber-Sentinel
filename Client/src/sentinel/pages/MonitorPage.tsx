import { useCallback, useEffect, useState } from "react";
import { Reveal } from "@/src/components/Reveal";
import { SectionHeader } from "@/src/components/SectionHeader";
import { fetchSignals } from "../api";
import type { Signal } from "../api";
import { EmptyState, SeverityBadge, Spinner, inputCls, labelCls } from "../ui";

const SEVERITIES = ["", "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
const CATEGORIES = ["", "NETWORK", "AUTH", "ENDPOINT", "EMAIL", "WEB"];

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function MonitorPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [minRisk, setMinRisk] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (p: number, sev: string, cat: string, q: string, risk: number) => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetchSignals({
          page: p,
          limit: 20,
          severity: sev,
          category: cat,
          search: q,
          minRisk: risk,
        });
        setSignals(r.data);
        setTotal(r.meta.total);
      } catch {
        setError("Could not load the live feed. Is the API running on :5000?");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    // Always reload with the CURRENT filters (never hardcoded empties),
    // then keep page 1 live every 5 seconds with those same filters.
    void load(page, severity, category, search, minRisk);
    const id = setInterval(() => {
      setPage((p) => {
        if (p === 1 && !document.hidden) void load(1, severity, category, search, minRisk);
        return p;
      });
    }, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, page, severity, category, search, minRisk]);

  const apply = (p: number, sev: string, cat: string, q: string, risk: number) => {
    setPage(p);
    setSeverity(sev);
    setCategory(cat);
    setSearch(q);
    setMinRisk(risk);
  };

  return (
    <div>
      <SectionHeader
        title={["Live threat", "monitor."]}
        description="Every ingested behaviour in one feed — network flows, logins, file activity, email clicks. Refreshes every 5 seconds."
      />

      <Reveal offset="sm" duration={700}>
        <div className="card-frame mt-10 grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className={labelCls} htmlFor="mon-search">SEARCH</label>
            <input
              id="mon-search"
              className={inputCls}
              placeholder="user, ip, type…"
              value={search}
              onChange={(e) => apply(1, severity, category, e.target.value, minRisk)}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="mon-sev">SEVERITY</label>
            <select
              id="mon-sev"
              className={inputCls}
              value={severity}
              onChange={(e) => apply(1, e.target.value, category, search, minRisk)}
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s === "" ? "All" : s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="mon-cat">CATEGORY</label>
            <select
              id="mon-cat"
              className={inputCls}
              value={category}
              onChange={(e) => apply(1, severity, e.target.value, search, minRisk)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c === "" ? "All" : c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="mon-risk">MIN RISK · {minRisk}</label>
            <input
              id="mon-risk"
              type="range"
              min={0}
              max={100}
              step={10}
              value={minRisk}
              onChange={(e) => apply(1, severity, category, search, Number(e.target.value))}
              className="w-full accent-white"
            />
          </div>
          <div className="flex items-end">
            <p className="text-xs text-white/60">
              {total} SIGNALS · PAGE {page}
            </p>
          </div>
        </div>
      </Reveal>

      <div className="mt-6">
        {loading && signals.length === 0 ? (
          <Spinner label="Streaming signals" />
        ) : error ? (
          <EmptyState title="Feed unavailable" body={error} />
        ) : signals.length === 0 ? (
          <EmptyState title="No signals found" body="Ingest behaviour via POST /api/ingest to populate this feed." />
        ) : (
          <div className="card-frame overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-base">
                <thead>
                  <tr className="border-b border-white/[0.06] font-mono text-xs tracking-[0.1em] text-white/50">
                    <th className="px-5 py-4">TIME</th>
                    <th className="px-5 py-4">TYPE</th>
                    <th className="px-5 py-4">MESSAGE</th>
                    <th className="px-5 py-4">ACTOR</th>
                    <th className="px-5 py-4">RISK</th>
                    <th className="px-5 py-4">SEVERITY</th>
                  </tr>
                </thead>
                <tbody>
                  {signals.map((s) => (
                    <tr key={s.id} className="border-b border-white/[0.06] last:border-0">
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-[13px] text-white/60">
                        {timeAgo(s.event_timestamp)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-[13px] text-white/80">
                        {s.signal_type}
                      </td>
                      <td className="max-w-md px-5 py-4 leading-relaxed text-foreground">{s.message}</td>
                      <td className="break-id whitespace-nowrap px-5 py-4 font-mono text-white/60">
                        {s.user_identity ?? s.hostname ?? s.source_ip ?? "—"}
                      </td>
                      <td className="tnum whitespace-nowrap px-5 py-4 font-display text-base font-semibold">
                        {s.risk_score}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <SeverityBadge value={s.severity} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => apply(page - 1, severity, category, search, minRisk)}
                className="px-2 py-3 text-sm font-medium text-white/70 hover:text-white disabled:opacity-30"
              >
                ← PREV
              </button>
              <span className="text-xs text-white/60">PAGE {page}</span>
              <button
                type="button"
                disabled={signals.length < 20 || page * 20 >= total}
                onClick={() => apply(page + 1, severity, category, search, minRisk)}
                className="px-2 py-3 text-sm font-medium text-white/70 hover:text-white disabled:opacity-30"
              >
                NEXT →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
