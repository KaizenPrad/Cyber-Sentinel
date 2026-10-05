import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SectionHeader } from "@/src/components/SectionHeader";
import { StarButton } from "@/src/components/StarButton";
import { fetchReport } from "../api";
import type { Report } from "../api";
import { EmptyState, Spinner, StatCard, inputCls, labelCls } from "../ui";

const PIE_COLORS = ["#00d294", "#00bcfe", "#a685ff", "#ffd236", "#ff8b1a", "#ff667f"];

function fmt(n: string | number): number {
  return typeof n === "number" ? n : Number(n);
}

export function ReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  // Recharts animations jank on phones — render static charts there.
  const reduceAnim =
    typeof window !== "undefined" &&
    (window.innerWidth < 768 ||
      (typeof window.matchMedia === "function" &&
        (window.matchMedia("(pointer: coarse)").matches ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches)));

  const load = (s: string, e: string) => {
    setLoading(true);
    fetchReport({ start: s || undefined, end: e || undefined })
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load("", "");
  }, []);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cybersentinel-report.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalDetections = (report?.byType ?? []).reduce((a, b) => a + fmt(b.c), 0);

  return (
    <div>
      {/* Decorative brand mark only — not a link, goes nowhere. */}
      <div aria-hidden="true" className="mb-8 flex items-center gap-2">
        <img
          src="/Cyberlogo/hourglass-mark.png"
          alt=""
          width={24}
          height={24}
          loading="lazy"
          decoding="async"
          className="size-6 object-contain"
        />
        <span className="font-nav text-sm font-semibold tracking-[0.12em] text-foreground">
          CYBERSENTINEL
        </span>
      </div>
      <SectionHeader
        title={["Security posture,", "summarized."]}
        description="Detections by type and severity, riskiest users, incident outcomes — exportable for management."
      />

      <div className="card-frame mt-10 flex flex-wrap items-end gap-4 p-5">
        <div>
          <label className={labelCls} htmlFor="rep-start">START</label>
          <input id="rep-start" type="date" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="rep-end">END</label>
          <input id="rep-end" type="date" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <StarButton size="sm" onClick={() => load(start, end)}>GENERATE</StarButton>
        <StarButton size="sm" onClick={exportJson} disabled={!report}>EXPORT JSON</StarButton>
      </div>

      {loading ? (
        <Spinner label="Aggregating report" />
      ) : !report ? (
        <EmptyState title="Report unavailable" />
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <StatCard label="DETECTIONS IN RANGE" value={totalDetections} />
            <StatCard label="INCIDENT STATES" value={(report.incidents ?? []).length} hint="distinct outcomes" />
            <StatCard label="RISKY USERS" value={(report.topRiskyUsers ?? []).length} hint="top offenders tracked" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card-frame p-6">
              <p className="font-mono text-xs tracking-[0.1em] text-white/50">DETECTIONS BY TYPE</p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(report.byType ?? []).map((d) => ({ name: d.detection_type.replace("_", " "), count: fmt(d.c) }))}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} interval={0} angle={-15} dy={10} height={50} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#0a0a0c", border: "1px solid rgba(255,255,255,0.12)", fontSize: 12 }} />
                    <Bar dataKey="count" fill="#00d2ef" radius={[4, 4, 0, 0]} isAnimationActive={!reduceAnim} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card-frame p-6">
              <p className="font-mono text-xs tracking-[0.1em] text-white/50">DETECTIONS BY SEVERITY</p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={(report.bySeverity ?? []).map((d) => ({ name: d.severity, value: fmt(d.c) }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      stroke="none"
                      isAnimationActive={!reduceAnim}
                    >
                      {(report.bySeverity ?? []).map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#0a0a0c", border: "1px solid rgba(255,255,255,0.12)", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card-frame overflow-hidden">
            <p className="px-5 pt-5 font-mono text-xs tracking-[0.1em] text-white/50">TOP RISKY USERS</p>
            <div className="overflow-x-auto">
              <table className="mt-2 w-full min-w-[560px] text-left text-base">
                <thead>
                  <tr className="border-y border-white/[0.06] font-mono text-xs tracking-[0.1em] text-white/50">
                    <th className="px-5 py-4">USER</th>
                    <th className="px-5 py-4">AVG RISK</th>
                    <th className="px-5 py-4">SIGNALS</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.topRiskyUsers ?? []).map((u) => (
                    <tr key={u.user_identity} className="border-b border-white/[0.06] last:border-0">
                      <td className="break-id px-5 py-4 font-mono text-sm text-white/85">{u.user_identity}</td>
                      <td className="tnum px-5 py-4 font-display text-base font-semibold">{u.avg_risk}</td>
                      <td className="tnum px-5 py-4 font-mono text-sm text-white/60">{u.c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
