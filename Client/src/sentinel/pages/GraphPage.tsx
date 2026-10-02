import { Maximize, Minus, Plus } from "lucide-react";
import { Network } from "vis-network";
import { useEffect, useRef, useState } from "react";
import { SectionHeader } from "@/src/components/SectionHeader";
import { fetchGraph } from "../api";
import type { GraphData } from "../api";
import { EmptyState, RiskBar, SeverityBadge, Spinner, labelCls } from "../ui";

const NODE_COLOR: Record<string, string> = {
  user: "#00bcfe",
  device: "#00d294",
  ip: "#ff8b1a",
  domain: "#a685ff",
};

/** Hex color + alpha → rgba() string for translucent pill fills. */
function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const requestRef = useRef(0);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [window, setWindow] = useState<"1h" | "24h" | "7d">("24h");
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Guard against out-of-order responses when windows are clicked fast:
    // only the latest request may update state.
    const reqId = ++requestRef.current;
    setLoading(true);
    setError(null);
    setSelected(null);
    fetchGraph(window)
      .then((g) => {
        if (requestRef.current === reqId) setGraph(g);
      })
      .catch(() => {
        if (requestRef.current === reqId) setError("Could not load the network graph.");
      })
      .finally(() => {
        if (requestRef.current === reqId) setLoading(false);
      });
  }, [window]);

  useEffect(() => {
    if (!graph || !containerRef.current) return;
    const nodes = graph.nodes.map((n) => {
      const color = NODE_COLOR[n.type] ?? "#ecebe7";
      const hot = n.risk >= 70;
      return {
        id: n.id,
        label: n.label.length > 26 ? `${n.label.slice(0, 25)}…` : n.label,
        title:
          `<div style="font-family:monospace;font-size:12px;line-height:1.6;white-space:nowrap">` +
          `<span style="color:${color}">●</span> ` +
          `<span style="color:#fff">${n.label}</span><br/>` +
          `<span style="color:rgba(255,255,255,0.55)">${n.type.toUpperCase()} · RISK ${n.risk}</span></div>`,
        shape: "ellipse",
        borderWidth: hot ? 2.5 : 1.5,
        color: {
          background: withAlpha(color, hot ? 0.22 : 0.13),
          border: color,
          highlight: { background: withAlpha(color, 0.35), border: "#ffffff" },
          hover: { background: withAlpha(color, 0.3), border: color },
        },
        font: {
          color: "rgba(255,255,255,0.92)",
          size: hot ? 14 : 13,
          face: "Inter, system-ui, sans-serif",
        },
        shadow: hot
          ? { enabled: true, color: withAlpha(color, 0.55), size: 14, x: 0, y: 0 }
          : { enabled: false },
      };
    });
    // Edge signal-types live in hover tooltips, not on-canvas labels —
    // always-on labels rendered as unreadable blocks on dense graphs.
    const edges = graph.edges.map((e) => ({
      from: e.from,
      to: e.to,
      title: `<span style="font-family:monospace;font-size:12px;color:#fff">${e.label}</span>`,
      width: 1.2,
      hoverWidth: 2.2,
      selectionWidth: 2.2,
      arrows: { to: { enabled: true, scaleFactor: 0.55, type: "arrow" } },
      smooth: { enabled: true, type: "dynamic", roundness: 0.4 },
      color: {
        color: "rgba(148,163,184,0.32)",
        highlight: "rgba(255,255,255,0.75)",
        hover: "rgba(255,255,255,0.55)",
      },
    }));
    const network = new Network(
      containerRef.current,
      { nodes, edges },
      {
        physics: {
          enabled: true,
          solver: "barnesHut",
          barnesHut: {
            gravitationalConstant: -6000,
            centralGravity: 0.28,
            springLength: 170,
            springConstant: 0.05,
            damping: 0.09,
            avoidOverlap: 0.5,
          },
          // Settle fast on every window switch, then freeze: a frozen
          // layout stays explorable (drag/zoom/pan/click) without drifting.
          stabilization: { enabled: true, iterations: 150, updateInterval: 10, fit: true },
        },
        interaction: {
          hover: true,
          hoverConnectedEdges: true,
          tooltipDelay: 120,
          hideEdgesOnDrag: true,
          multiselect: false,
          zoomView: true,
          dragView: true,
        },
      },
    );
    networkRef.current = network;
    // Freeze the layout the moment it settles — otherwise the solver keeps
    // nudging nodes forever and the graph never stops rotating.
    network.once("stabilizationIterationsDone", () => {
      network.setOptions({ physics: { enabled: false } });
    });
    network.on("click", (params: { nodes: string[] }) => {
      const id = params.nodes.length > 0 ? params.nodes[0] : null;
      setSelected(id);
      if (id) network.focus(id, { scale: 1.05, animation: { duration: 500, easingFunction: "easeInOutQuad" } });
    });
    return () => {
      network.destroy();
      networkRef.current = null;
    };
  }, [graph]);

  const zoom = (scale: number) => {
    const net = networkRef.current;
    if (!net) return;
    const current = net.getScale();
    net.moveTo({ scale: Math.min(3, Math.max(0.2, current * scale)) });
  };
  const fit = () => networkRef.current?.fit({ animation: { duration: 500, easingFunction: "easeInOutQuad" } });

  const selectedNode = selected ? graph?.nodes.find((n) => n.id === selected) : undefined;
  const linkedEdges = selected ? graph?.edges.filter((e) => e.from === selected || e.to === selected) : [];
  const nodeLabel = (nid: string) => graph?.nodes.find((n) => n.id === nid)?.label ?? nid;
  const hotCount = graph?.nodes.filter((n) => n.risk >= 70).length ?? 0;

  return (
    <div>
      <SectionHeader
        title={["Network blast", "radius."]}
        description="Devices, users, IPs and domains as one graph. Node glow marks high risk — hover anything for detail, click a node to trace lateral movement."
      />

      <div className="card-frame mt-10 flex flex-wrap items-center gap-x-8 gap-y-5 p-6">
        <div>
          <label className={labelCls} htmlFor="graph-window">TIME WINDOW</label>
          <div className="flex gap-2">
            {(["1h", "24h", "7d"] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWindow(w)}
                className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
                  window === w
                    ? "border-white/40 bg-white/[0.1] text-white"
                    : "border-white/10 text-white/60 hover:text-white"
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-white/60">
          {Object.entries(NODE_COLOR).map(([type, color]) => (
            <span key={type} className="inline-flex items-center gap-2">
              <span className="inline-block size-2.5 rounded-full" style={{ background: color }} />
              {type.toUpperCase()}
            </span>
          ))}
        </div>
        {!loading && !error && graph ? (
          <div className="flex flex-wrap gap-5 font-mono text-xs text-white/60">
            <span><span className="tnum text-base text-white">{graph.nodes.length}</span> NODES</span>
            <span><span className="tnum text-base text-white">{graph.edges.length}</span> EDGES</span>
            <span>
              <span className="tnum text-base text-[#ff8b1a]">{hotCount}</span> HIGH-RISK
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="card-frame relative overflow-hidden p-2 lg:col-span-8">
          {loading ? (
            <Spinner label="Building graph" />
          ) : error ? (
            <EmptyState title="Graph unavailable" body={error} />
          ) : (graph?.nodes.length ?? 0) === 0 ? (
            <EmptyState title="No nodes in window" body="Ingest signals first — nodes appear once behaviour flows in." />
          ) : (
            <div className="relative">
              <div
                ref={containerRef}
                className="h-[520px] w-full"
                role="img"
                aria-label="Network graph"
                style={{
                  backgroundImage: "radial-gradient(rgba(255,255,255,0.055) 1px, transparent 1px)",
                  backgroundSize: "26px 26px",
                }}
              />
              <div className="absolute right-3 bottom-3 flex gap-1.5">
                <button
                  type="button"
                  aria-label="Zoom in"
                  onClick={() => zoom(1.25)}
                  className="rounded-full border border-white/10 bg-black/70 p-2 text-white/70 backdrop-blur transition-colors hover:border-white/30 hover:text-white"
                >
                  <Plus size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Zoom out"
                  onClick={() => zoom(0.8)}
                  className="rounded-full border border-white/10 bg-black/70 p-2 text-white/70 backdrop-blur transition-colors hover:border-white/30 hover:text-white"
                >
                  <Minus size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Fit graph to view"
                  onClick={fit}
                  className="rounded-full border border-white/10 bg-black/70 p-2 text-white/70 backdrop-blur transition-colors hover:border-white/30 hover:text-white"
                >
                  <Maximize size={15} aria-hidden="true" />
                </button>
              </div>
              <p className="pointer-events-none absolute bottom-3 left-4 font-mono text-[11px] tracking-[0.08em] text-white/35">
                SCROLL TO ZOOM · DRAG TO PAN · CLICK NODE TO INSPECT
              </p>
            </div>
          )}
        </div>
        <div className="lg:col-span-4">
          <div className="card-frame h-full p-6">
            <p className="font-mono text-xs tracking-[0.1em] text-white/50">NODE DETAIL</p>
            {!selectedNode ? (
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">Click a node to inspect it and its connections.</p>
            ) : (
              <div className="mt-3">
                <p className="break-id font-mono text-base text-foreground">{selectedNode.label}</p>
                <div className="mt-3 flex items-center gap-2">
                  <SeverityBadge value={selectedNode.risk >= 70 ? "HIGH" : selectedNode.risk >= 40 ? "MEDIUM" : "LOW"} />
                  <span className="font-mono text-xs text-white/60">
                    {selectedNode.type.toUpperCase()} · RISK {selectedNode.risk}
                  </span>
                </div>
                <div className="mt-4">
                  <RiskBar score={selectedNode.risk} />
                </div>
                <p className="mt-5 font-mono text-xs tracking-[0.1em] text-white/50">
                  {linkedEdges?.length ?? 0} CONNECTIONS
                </p>
                <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                  {linkedEdges?.map((e, i) => (
                    <li key={i} className="break-id font-mono text-[13px] leading-relaxed text-white/70">
                      {e.from === selected ? "→" : "←"} {e.from === selected ? nodeLabel(e.to) : nodeLabel(e.from)}
                      <span className="text-white/40"> · {e.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
