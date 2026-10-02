import { ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { SectionHeader } from "@/src/components/SectionHeader";
import { StarButton } from "@/src/components/StarButton";
import { fetchDetection, fetchDetections, promoteDetection } from "../api";
import type { Detection } from "../api";
import { EmptyState, RiskBar, SeverityBadge, Spinner, inputCls, labelCls } from "../ui";

const TYPES = ["", "PHISHING", "MALWARE", "RANSOMWARE", "UNAUTH_ACCESS", "ANOMALY"];

export function DetectionPage() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [type, setType] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detection | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const r = await fetchDetections({ type: t || undefined, limit: 30 });
      setDetections(r.data);
      if (r.data.length > 0 && !activeId) {
        setActiveId(r.data[0].id);
      }
    } catch {
      setDetections([]);
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    void load(type);
  }, [type, load]);

  useEffect(() => {
    if (!activeId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    fetchDetection(activeId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [activeId]);

  const promote = async () => {
    if (!activeId) return;
    setNotice(null);
    try {
      const inc = await promoteDetection(activeId);
      setNotice(`Promoted to incident ${inc.id.slice(0, 8)} — triage it under Incidents.`);
    } catch {
      setNotice("Promotion failed — the detection may already have an incident.");
    }
  };

  return (
    <div>
      <SectionHeader
        title={["Why the AI", "fired."]}
        description="Every detection lists the correlated signals, their weights, and the engine's reasoning. No black boxes."
      />

      <div className="card-frame mt-10 flex flex-wrap items-center gap-5 p-6">
        <div>
          <label className={labelCls} htmlFor="det-type">THREAT TYPE</label>
          <select id="det-type" className={inputCls} value={type} onChange={(e) => { setType(e.target.value); setActiveId(null); }}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t === "" ? "All types" : t.replace("_", " ")}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-6 text-xs text-white/60">
          <span>MODEL: CORRELATION v1</span>
          <span className="inline-flex items-center gap-2">
            <span className="pipeline-pulse inline-block size-2 rounded-full bg-[#00d294]" />
            ENGINE LIVE
          </span>
        </div>
      </div>

      {notice ? (
        <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 text-base text-foreground">{notice}</p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          {loading ? (
            <Spinner label="Scoring detections" />
          ) : detections.length === 0 ? (
            <EmptyState title="No detections" body="Correlated threats will appear here once signals match a pattern." />
          ) : (
            detections.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setActiveId(d.id)}
                className={`card-frame w-full p-6 text-left transition-colors ${
                  activeId === d.id ? "border-white/30" : "hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display text-lg leading-snug text-foreground">{d.title}</p>
                  <SeverityBadge value={d.severity} />
                </div>
                <div className="mt-4">
                  <RiskBar score={d.risk_score} />
                </div>
                <p className="tnum mt-3 text-xs text-white/60">
                  {d.detection_type.replace("_", " ")} · RISK {d.risk_score} · CONF {d.confidence ?? "—"}% ·{" "}
                  {String(d.signals_count ?? "?")} SIGNALS
                </p>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-7">
          <div className="card-frame h-full p-6 sm:p-8">
            <p className="font-mono text-xs tracking-[0.1em] text-white/50">EXPLANATION</p>
            {detailLoading ? (
              <Spinner label="Loading explanation" />
            ) : !detail ? (
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">Select a detection to see why it fired.</p>
            ) : (
              <div className="mt-3">
                <h3 className="font-display text-[26px] leading-tight text-foreground">{detail.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  {detail.explanation.reasoning ?? "Correlated signals exceeded the detection threshold."}
                </p>
                <div className="mt-6 space-y-3">
                  {(detail.signals ?? []).map((s) => (
                    <div key={s.id} className="card-frame-inner p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[13px] text-white/85">{s.signal_type}</span>
                        <span className="tnum font-mono text-[13px] text-white/60">× {Math.round(s.weight * 100)}%</span>
                      </div>
                      <p className="mt-1.5 text-base leading-relaxed text-muted-foreground">{s.message}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {(detail.explanation.matchedSignals ?? []).map((m) => (
                    <span key={m} className="rounded-full border border-white/10 px-3 py-1.5 font-mono text-xs text-white/60">
                      {m}
                    </span>
                  ))}
                </div>
                <div className="mt-6">
                  <StarButton size="sm" onClick={() => void promote()}>
                    <ShieldCheck size={14} aria-hidden="true" />
                    PROMOTE TO INCIDENT
                  </StarButton>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
