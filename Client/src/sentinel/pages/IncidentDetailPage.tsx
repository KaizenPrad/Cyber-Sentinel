import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SectionHeader } from "@/src/components/SectionHeader";
import { StarButton } from "@/src/components/StarButton";
import { useAuth } from "../auth";
import { addRemediation, fetchIncident, updateIncident } from "../api";
import type { Incident } from "../api";
import { EmptyState, SeverityBadge, Spinner, StatusBadge, inputCls, labelCls } from "../ui";

const NEXT = ["INVESTIGATING", "CONTAINED", "RESOLVED", "FALSE_POSITIVE", "DISMISSED"] as const;
const ACTIONS = ["ACKNOWLEDGED", "INVESTIGATING", "CONTAINED", "BLOCKED_IP", "ISOLATED_HOST", "DISABLED_USER", "REVOKED_SESSION", "QUARANTINED_FILE", "ESCALATED", "CUSTOM"];

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user: me } = useAuth();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState(ACTIONS[0]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setIncident(await fetchIncident(id));
    } catch {
      setIncident(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (status: Incident["status"]) => {
    if (!id) return;
    setBusy(true);
    setStatusError(null);
    try {
      const updated = await updateIncident(id, { status });
      // PATCH returns the bare incident row — keep the already-loaded
      // linked signals + remediation log so the page doesn't blank them.
      setIncident((prev) => (prev ? { ...prev, ...updated, signals: prev.signals, remediation: prev.remediation } : updated));
    } catch {
      setStatusError("Could not update status. Is the API reachable?");
    } finally {
      setBusy(false);
    }
  };

  const assign = async (assigneeId: string | null) => {
    if (!id) return;
    setBusy(true);
    setStatusError(null);
    try {
      const updated = await updateIncident(id, { assigneeId });
      setIncident((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
              signals: prev.signals,
              remediation: prev.remediation,
              assignee_email: assigneeId ? (assigneeId === me?.id ? (me?.email ?? prev.assignee_email) : prev.assignee_email) : null,
            }
          : updated,
      );
    } catch {
      setStatusError("Could not update assignee. Is the API reachable?");
    } finally {
      setBusy(false);
    }
  };

  const remediate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await addRemediation(id, { action, notes: notes || undefined });
      setNotes("");
      await load();
    } catch {
      setError("Could not log remediation.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner label="Loading incident" />;
  if (!incident) return <EmptyState title="Incident not found" />;

  return (
    <div>
      <SectionHeader title={["Incident", "detail."]} description={incident.title} />
      <div className="mt-6 flex flex-wrap gap-2">
        <SeverityBadge value={incident.severity} />
        <StatusBadge value={incident.status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <div className="card-frame p-6 sm:p-7">
            <p className="font-mono text-xs tracking-[0.1em] text-white/50">LINKED SIGNALS</p>
            {(incident.signals ?? []).length === 0 ? (
              <p className="mt-2 text-base text-muted-foreground">No linked signals.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {incident.signals?.map((s) => (
                  <li key={s.id} className="card-frame-inner p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[13px] text-white/85">{s.signal_type}</span>
                      <span className="tnum font-mono text-[13px] text-white/60">RISK {s.risk_score}</span>
                    </div>
                    <p className="mt-1.5 text-base leading-relaxed text-muted-foreground">{s.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card-frame p-6 sm:p-7">
            <p className="font-mono text-xs tracking-[0.1em] text-white/50">REMEDIATION LOG</p>
            {(incident.remediation ?? []).length === 0 ? (
              <p className="mt-2 text-base text-muted-foreground">Nothing logged yet.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {incident.remediation?.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.06] pb-3 last:border-0">
                    <div>
                      <span className="font-mono text-[13px] text-white/85">{r.action}</span>
                      {r.notes ? <p className="mt-1 text-base text-muted-foreground">{r.notes}</p> : null}
                    </div>
                    <span className="tnum text-xs text-white/50">{new Date(r.created_at).toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            )}
            <form onSubmit={(e) => void remediate(e)} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="rem-action">ACTION</label>
                <select id="rem-action" className={inputCls} value={action} onChange={(e) => setAction(e.target.value)}>
                  {ACTIONS.map((a) => <option key={a} value={a}>{a.replace("_", " ")}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="rem-notes">NOTES</label>
                <input id="rem-notes" className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was done…" />
              </div>
              {error ? <p className="text-base text-[#ffa3a3] sm:col-span-2">{error}</p> : null}
              <div className="sm:col-span-2">
                <StarButton size="sm" type="submit" disabled={busy}>LOG REMEDIATION</StarButton>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="card-frame p-6 sm:p-7">
            <p className="font-mono text-xs tracking-[0.1em] text-white/50">CHANGE STATUS</p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {NEXT.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy || incident.status === s}
                  onClick={() => void setStatus(s)}
                  className={`rounded-full border px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-30 ${
                    incident.status === s
                      ? "border-white/40 bg-white/[0.1] text-white"
                      : "border-white/10 text-white/60 hover:text-white"
                  }`}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
            <p className="mt-6 font-mono text-xs tracking-[0.1em] text-white/50">ASSIGNEE</p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {incident.assignee_id === me?.id ? (
                <button
                  key="unassign"
                  type="button"
                  disabled={busy}
                  onClick={() => void assign(null)}
                  className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-white/60 transition-colors hover:text-white disabled:opacity-30"
                >
                  UNASSIGN
                </button>
              ) : (
                <button
                  key="assign-me"
                  type="button"
                  disabled={busy || !me}
                  onClick={() => void assign(me?.id ?? null)}
                  className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-white/60 transition-colors hover:text-white disabled:opacity-30"
                >
                  ASSIGN TO ME
                </button>
              )}
            </div>
            {statusError ? <p className="mt-3 text-base text-[#ffa3a3]">{statusError}</p> : null}
            <p className="mt-6 font-mono text-xs tracking-[0.1em] text-white/50">META</p>
            <dl className="tnum mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-white/50">OPENED</dt><dd className="text-white/80">{new Date(incident.created_at).toLocaleString()}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-white/50">ASSIGNEE</dt><dd className="break-id text-white/80">{incident.assignee_email ?? "—"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-white/50">DETECTION</dt><dd className="text-white/80">{incident.detection_id?.slice(0, 8) ?? "—"}</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
