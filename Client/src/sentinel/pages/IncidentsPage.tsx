import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SectionHeader } from "@/src/components/SectionHeader";
import { fetchIncidents } from "../api";
import type { Incident } from "../api";
import { EmptyState, SeverityBadge, Spinner, StatusBadge, inputCls, labelCls } from "../ui";

const STATUSES = ["", "OPEN", "INVESTIGATING", "CONTAINED", "RESOLVED", "FALSE_POSITIVE", "DISMISSED"];

export function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number, s: string) => {
    setLoading(true);
    try {
      const r = await fetchIncidents({ status: s || undefined, page: p, limit: 20 });
      setIncidents(r.data);
      setTotal(r.meta.total);
    } catch {
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    void load(1, status);
  }, [status, load]);

  const go = (p: number) => {
    setPage(p);
    void load(p, status);
  };

  return (
    <div>
      <SectionHeader
        title={["Triage, contain,", "resolve."]}
        description="Case management for every auto-created or promoted incident — assign, track status, log remediation."
      />

      <div className="card-frame mt-10 flex flex-wrap items-center gap-5 p-6">
        <div>
          <label className={labelCls} htmlFor="inc-status">STATUS</label>
          <select id="inc-status" className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s === "" ? "All" : s.replace("_", " ")}</option>
            ))}
          </select>
        </div>
        <p className="text-xs text-white/60">
          LIFECYCLE: OPEN → INVESTIGATING → CONTAINED → RESOLVED
        </p>
      </div>

      <div className="mt-6">
        {loading && incidents.length === 0 ? (
          <Spinner label="Loading incidents" />
        ) : incidents.length === 0 ? (
          <EmptyState title="No incidents" body="Incidents open automatically when a detection scores 70 or above." />
        ) : (
          <div className="space-y-4">
            {incidents.map((inc) => (
              <Link key={inc.id} to={`/incidents/${inc.id}`} className="card-frame block p-6 transition-colors hover:border-white/20">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl leading-snug text-foreground">{inc.title}</p>
                    <p className="tnum mt-1.5 text-xs text-white/60">
                      {new Date(inc.created_at).toLocaleString()} · {inc.assignee_email ?? "UNASSIGNED"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <SeverityBadge value={inc.severity} />
                    <StatusBadge value={inc.status} />
                  </div>
                </div>
              </Link>
            ))}
            <div className="card-frame flex items-center justify-between px-5 py-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => go(page - 1)}
                className="px-2 py-3 text-sm font-medium text-white/70 hover:text-white disabled:opacity-30"
              >
                ← PREV
              </button>
              <span className="text-xs text-white/60">{total} INCIDENTS · PAGE {page}</span>
              <button
                type="button"
                disabled={loading || page * 20 >= total}
                onClick={() => go(page + 1)}
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
