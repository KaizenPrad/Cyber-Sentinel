import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "text-[#ffa3a3] border-[#ffa3a3]/30 bg-[#ffa3a3]/10",
  HIGH: "text-[#ff8b1a] border-[#ff8b1a]/30 bg-[#ff8b1a]/10",
  MEDIUM: "text-[#ffd236] border-[#ffd236]/30 bg-[#ffd236]/10",
  LOW: "text-[#00d294] border-[#00d294]/30 bg-[#00d294]/10",
  INFO: "text-white/60 border-white/15 bg-white/5",
};

export function SeverityBadge({ value }: { value: string }) {
  const cls = SEVERITY_COLOR[value] ?? SEVERITY_COLOR.INFO;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 font-mono text-xs tracking-[0.1em] ${cls}`}
    >
      {value}
    </span>
  );
}

const STATUS_COLOR: Record<string, string> = {
  OPEN: "text-[#ff667f] border-[#ff667f]/30 bg-[#ff667f]/10",
  INVESTIGATING: "text-[#ffd236] border-[#ffd236]/30 bg-[#ffd236]/10",
  CONTAINED: "text-[#00bcfe] border-[#00bcfe]/30 bg-[#00bcfe]/10",
  RESOLVED: "text-[#00c758] border-[#00c758]/30 bg-[#00c758]/10",
  FALSE_POSITIVE: "text-white/60 border-white/15 bg-white/5",
  DISMISSED: "text-white/60 border-white/15 bg-white/5",
};

export function StatusBadge({ value }: { value: string }) {
  const cls = STATUS_COLOR[value] ?? STATUS_COLOR.OPEN;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 font-mono text-xs tracking-[0.1em] ${cls}`}
    >
      {value.replace("_", " ")}
    </span>
  );
}

export function RiskBadge({ score }: { score: number }) {
  const level = score >= 85 ? "CRITICAL" : score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-display text-base font-semibold text-foreground">{score}</span>
      <SeverityBadge value={level} />
    </span>
  );
}

export function RiskBar({ score }: { score: number }) {
  const gradient =
    score >= 85
      ? "var(--gradient-bar-violet)"
      : score >= 70
        ? "var(--gradient-bar-cyan)"
        : "var(--gradient-bar-emerald)";
  return (
    <span className="block h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <span
        className="block h-full rounded-full"
        style={{ width: `${Math.max(2, Math.min(100, score))}%`, background: gradient }}
      />
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="card-frame p-6">
      <p className="font-mono text-xs tracking-[0.1em] text-white/50">{label}</p>
      <p className="tnum mt-3 font-display text-5xl leading-none text-foreground">{value}</p>
      {hint ? <p className="mt-3 text-sm text-white/60">{hint}</p> : null}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-10" role="status" aria-label={label}>
      <span className="pipeline-pulse inline-block size-2.5 rounded-full bg-white/70" />
      <span className="text-sm text-white/60">{label}…</span>
    </div>
  );
}

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body?: string;
}) {
  return (
    <div className="card-frame-inner flex flex-col items-center gap-3 px-6 py-14 text-center">
      <ShieldAlert size={24} className="text-white/40" aria-hidden="true" />
      <p className="font-display text-xl text-foreground">{title}</p>
      {body ? <p className="max-w-md text-base leading-relaxed text-muted-foreground">{body}</p> : null}
    </div>
  );
}

export const inputCls =
  "w-full rounded-xl border border-white/10 bg-[#07090c] px-4 py-3 text-base text-foreground placeholder:text-white/40 focus:border-white/40 focus:outline-none";

export const labelCls =
  "mb-2 block font-mono text-xs tracking-[0.1em] text-white/60";
