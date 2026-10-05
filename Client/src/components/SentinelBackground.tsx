import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * CyberSentinel tornado-vortex background — WebGL background ported from
 * `src/tornado_vortex.html`.
 *
 * Fixed, full-viewport canvas (twisting strands + glow dots + orange comet
 * tails with mouse repel) with scroll-linked parallax: the layer climbs
 * slower than content, lifts in-scene, and fades out over the first
 * viewport, handing over to the RiseStreaks layer at the page bottom.
 * A cinematic entrance (fade + settle-zoom + rise) plays on mount and
 * replays whenever you scroll back up after a deep scroll.
 *
 * Rendered with `pointer-events: none` so it never blocks clicks; page
 * content must sit above it (`relative z-10`). Mount it on the homepage
 * only — it unmounts on route change.
 *
 * To retune the animation, edit `VORTEX_DEFAULTS` below (mirrors the
 * `DEFAULTS` object in `src/tornado_vortex.html`) or pass `tuning` props.
 */

export interface VortexTuning {
  topRadius: number;
  waistRadius: number;
  waistPosition: number;
  bottomRadius: number;
  twist: number;
  zoom: number;
  speed: number;
  direction: "left" | "right";
  lineCount: number;
  lineColor: string;
  lineGlow: number;
  showDots: boolean;
  dotCount: number;
  dotSize: number;
  dotColor: string;
  dotGlow: number;
  dotFlicker: number;
  showComets: boolean;
  cometCount: number;
  cometSpeed: number;
  cometColor: string;
  cometGlow: number;
  cometTail: number;
  cometDelay: number;
  collideForce: number;
  hoverRepel: boolean;
  repelRadius: number;
  repelStrength: number;
}

export const VORTEX_DEFAULTS: VortexTuning = {
  topRadius: 380,
  waistRadius: 53,
  waistPosition: 50,
  bottomRadius: 1150,
  twist: 3,
  zoom: 75,
  speed: 10,
  direction: "right",
  lineCount: 240,
  lineColor: "#ffffff",
  lineGlow: 10,
  showDots: true,
  dotCount: 8000,
  dotSize: 20,
  dotColor: "#ffffff",
  dotGlow: 10,
  dotFlicker: 10,
  showComets: true,
  cometCount: 10,
  cometSpeed: 6,
  cometColor: "#F9731A",
  cometGlow: 6,
  cometTail: 19,
  cometDelay: 8,
  collideForce: 6,
  hoverRepel: true,
  repelRadius: 60,
  repelStrength: 10,
};

const TAU = Math.PI * 2;
const PX_PER_WORLD = 60;
const CURVE_SAMPLES = 1024;
const STRAND_SEGMENTS = 400;
const STRAND_SEGMENTS_MOBILE = 140;

/** True on phones / low-power devices: fewer strands, no AA, DPR 1. */
function isMobileGPU(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 768;
  const cores =
    typeof navigator.hardwareConcurrency === "number"
      ? navigator.hardwareConcurrency
      : 8;
  const lowRam =
    typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === "number" &&
    ((navigator as Navigator & { deviceMemory?: number }).deviceMemory as number) <= 4;
  return (coarse && narrow) || (narrow && (cores <= 4 || lowRam));
}
const WOBBLE = 0.008;
const FADE_ZONE = 0.15;
const FORM_HEIGHT = 10;
const BASE_ZOOM = 67;
const LINE_GLOW_MAX = 1;
const DOT_GLOW_MAX = 4.2;
const COMET_SPEED_MAX = 0.15;
const COMET_GLOW_MAX = 1;
const DOT_SIZE_SCALE = 1000;
const RIPPLE_RADIUS = 2;
const RIPPLE_STRENGTH = 0.5;
const RIPPLE_SPRING = 50;
const RIPPLE_DAMPING = 9;
const SCALE_SPRING = 65;
const SCALE_DAMPING = 11;
const SCALE_PEAK = 1.8;
const WAVE_SPEED = 5;
const WAVE_WIDTH = 1.2;
const WAVE_DECAY = 0.8;
const WAVE_LIFE = 2.5;
const WAVE_STRENGTH = 0.04;
const MAX_WAVES = 16;
const RUN_LOW = 0.03;
const RUN_HIGH = 0.95;
const RUN_FADE = 0.1;
const HIT_RADIUS = 0.8;
const HIT_BOOST = 1.6;
const HIT_BOOST_TIME = 0.4;
const HIT_FLASH = 6;
const HIT_FADE = 0.6;
const HIT_POP = 1.3;
const HIT_RESPAWN = 8;
const STRAND_HZ = 1 / 30;
const REPEL_MAX_NDC = 0.45;

const ENTRANCE = { strandStart: 0, strandEnd: 2, dotStart: 1.2, dotEnd: 3, cometStart: 3, cometEnd: 5 };

interface ResolvedConfig {
  floorRadius: number;
  waistRadius: number;
  crownRadius: number;
  waistAt: number;
  twist: number;
  zoom: number;
  flowDir: number;
  flowSpeed: number;
  lineCount: number;
  lineColor: string;
  lineGlow: number;
  showDots: boolean;
  dotCount: number;
  dotSize: number;
  dotColor: string;
  dotGlow: number;
  dotFlicker: number;
  showComets: boolean;
  cometCount: number;
  cometSpeed: number;
  cometColor: string;
  cometGlow: number;
  cometTail: number;
  cometDelay: number;
  collideForce: number;
  hoverRepel: boolean;
  repelRadius: number;
  repelStrength: number;
  running: boolean;
}

function resolveConfig(tuning: Partial<VortexTuning>, running: boolean): ResolvedConfig {
  const t = { ...VORTEX_DEFAULTS, ...tuning };
  return {
    floorRadius: t.bottomRadius / PX_PER_WORLD,
    waistRadius: t.waistRadius / PX_PER_WORLD,
    crownRadius: t.topRadius / PX_PER_WORLD,
    waistAt: 1 - t.waistPosition / 100,
    twist: t.twist,
    zoom: t.zoom,
    flowDir: t.direction === "left" ? -1 : 1,
    flowSpeed: (t.speed / 100) * (t.direction === "left" ? -1 : 1),
    lineCount: t.lineCount,
    lineColor: t.lineColor,
    lineGlow: (t.lineGlow / 10) * LINE_GLOW_MAX,
    showDots: t.showDots,
    dotCount: t.dotCount,
    dotSize: t.dotSize / DOT_SIZE_SCALE,
    dotColor: t.dotColor,
    dotGlow: (t.dotGlow / 10) * DOT_GLOW_MAX,
    dotFlicker: t.dotFlicker / 10,
    showComets: t.showComets,
    cometCount: t.cometCount,
    cometSpeed: (t.cometSpeed / 10) * COMET_SPEED_MAX,
    cometColor: t.cometColor,
    cometGlow: (t.cometGlow / 10) * COMET_GLOW_MAX,
    cometTail: t.cometTail,
    cometDelay: t.cometDelay,
    collideForce: t.collideForce / 10,
    hoverRepel: t.hoverRepel,
    repelRadius: t.repelRadius,
    repelStrength: t.repelStrength,
    running,
  };
}

const clamp = (x: number, a: number, b: number) => Math.min(Math.max(x, a), b);
const fovForZoom = (zoom: number) => clamp(2 * BASE_ZOOM - zoom, 1, 175);

function ramp(now: number, from: number, to: number) {
  if (now <= from) return 0;
  if (now >= to) return 1;
  const t = (now - from) / (to - from);
  return 1 - (1 - t) * (1 - t) * (1 - t);
}

function monotone(points: Array<[number, number]>) {
  const n = points.length;
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    slope[i] = (points[i + 1][1] - points[i][1]) / (points[i + 1][0] - points[i][0]);
  }
  const m: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  m[n - 1] = slope[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(slope[i]) < 1e-12) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      m[i] = k * a * slope[i];
      m[i + 1] = k * b * slope[i];
    }
  }
  return (x: number) => {
    if (x <= points[0][0]) return points[0][1];
    if (x >= points[n - 1][0]) return points[n - 1][1];
    let i = 0;
    while (i < n - 2 && points[i + 1][0] < x) i++;
    const h = points[i + 1][0] - points[i][0];
    const t = (x - points[i][0]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * points[i][1] +
      (t3 - 2 * t2 + t) * h * m[i] +
      (-2 * t3 + 3 * t2) * points[i + 1][1] +
      (t3 - t2) * h * m[i + 1]
    );
  };
}

function bake(fn: (t: number) => number) {
  const table = new Float32Array(CURVE_SAMPLES);
  for (let i = 0; i < CURVE_SAMPLES; i++) table[i] = fn(i / (CURVE_SAMPLES - 1));
  return table;
}

function sample(table: Float32Array, t: number) {
  if (t <= 0) return table[0];
  const last = table.length - 1;
  if (t >= 1) return table[last];
  const x = t * last;
  const i = x | 0;
  return table[i] + (table[i + 1] - table[i]) * (x - i);
}

interface VortexShape {
  writePoint: (
    out: Float32Array,
    at: number,
    s: number,
    lane: number,
    flow: number,
    wobble: number,
    phase: number,
    time: number,
  ) => void;
  lane: (i: number, total: number) => number;
}

function makeShape(cfg: ResolvedConfig): VortexShape {
  const w = clamp(cfg.waistAt, 0.08, 0.92);
  const floor = cfg.floorRadius;
  const crown = cfg.crownRadius;
  const turn = cfg.twist * TAU;
  const radius = bake(
    monotone([
      [0, floor],
      [0.24 * w, floor * 0.667],
      [0.5 * w, floor * 0.3],
      [0.76 * w, floor * 0.08],
      [w, cfg.waistRadius],
      [w + 0.3 * (1 - w), crown * 0.2],
      [w + 0.6 * (1 - w), crown * 0.44],
      [1, crown],
    ]),
  );
  const height = bake(
    monotone([
      [0, 0],
      [0.1, 0.2],
      [0.2, 0.8],
      [0.35, 2],
      [0.5, FORM_HEIGHT * 0.38],
      [0.75, FORM_HEIGHT * 0.7],
      [1, FORM_HEIGHT],
    ]),
  );
  const angle = bake(
    monotone([
      [0, 0],
      [0.15, 0.15 * turn],
      [0.25, 0.25 * turn],
      [0.45, 0.55 * turn],
      [0.6, 0.7 * turn],
      [0.8, 0.88 * turn],
      [1, turn],
    ]),
  );
  return {
    writePoint(out, at, s, lane, flow, wobble, phase, time) {
      const r = sample(radius, s);
      const y = sample(height, s);
      const a = sample(angle, s) + lane + flow;
      const rr = r + Math.sin(s * 25 + phase + time * 0.3) * wobble * r;
      out[at] = Math.cos(a) * rr;
      out[at + 1] = y;
      out[at + 2] = Math.sin(a) * rr;
    },
    lane: (i, total) => (i / total) * TAU,
  };
}

interface Strand {
  lane: number;
  speed: number;
  pulse: number;
  wobblePhase: number;
  from: number;
  to: number;
  bright: number;
  offset: number;
  pts: Float32Array;
  cols: Float32Array;
}

interface Dot {
  s: number;
  lane: number;
  strand: number;
  pulse: number;
  flickerRate: number;
  bright: number;
}

interface Comet {
  bright: number;
  lane: number;
  speed: number;
  pulse: number;
  wobblePhase: number;
  base: number;
  boost: number;
  boostMul: number;
  racing: boolean;
  s: number;
  idle: number;
  idleFor: number;
  trail: Float32Array;
  trailCol: Float32Array;
  geo: THREE.BufferGeometry;
  line: THREE.Line;
  head: THREE.Sprite;
}

interface Wave {
  active: boolean;
  x: number;
  y: number;
  z: number;
  at: number;
  amp: number;
}

export function SentinelBackground({ tuning }: { tuning?: Partial<VortexTuning> } = {}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const outer = outerRef.current;

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const mobile = isMobileGPU();
    // Phones get a lite vortex: ~1/3 strands + dots, no mouse repel.
    const mobileTuning: Partial<VortexTuning> = mobile
      ? {
          lineCount: 90,
          dotCount: 1500,
          cometCount: 4,
          cometTail: 10,
          hoverRepel: false,
          repelStrength: 0,
          dotGlow: 6,
          lineGlow: 8,
        }
      : {};
    const strandSegments = mobile ? STRAND_SEGMENTS_MOBILE : STRAND_SEGMENTS;

    const cfgRef = {
      current: resolveConfig({ ...mobileTuning, ...(tuning ?? {}) }, !prefersReducedMotion),
    };

    // ---------------- Renderer / scene ----------------
    const renderer = new THREE.WebGLRenderer({
      antialias: !mobile,
      alpha: true,
      powerPreference: mobile ? "low-power" : "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(fovForZoom(cfgRef.current.zoom), 1, 0.1, 500);
    const group = new THREE.Group();
    scene.add(group);

    const repelUniforms = {
      uMouse: { value: new THREE.Vector2(0, 0) },
      uAspect: { value: 1 },
      uRadius: { value: 0.2 },
      uStrength: { value: 0 },
    };

    const withRepel = <T extends THREE.Material>(material: T): T => {
      material.onBeforeCompile = (shader) => {
        const s = shader as unknown as {
          uniforms: Record<string, THREE.IUniform>;
          vertexShader: string;
        };
        s.uniforms.uMouse = repelUniforms.uMouse;
        s.uniforms.uAspect = repelUniforms.uAspect;
        s.uniforms.uRadius = repelUniforms.uRadius;
        s.uniforms.uStrength = repelUniforms.uStrength;
        s.vertexShader = s.vertexShader
          .replace(
            "void main() {",
            "uniform vec2 uMouse; uniform float uAspect; uniform float uRadius; uniform float uStrength;\nvoid main() {",
          )
          .replace(
            "#include <fog_vertex>",
            `#include <fog_vertex>
            if (uStrength > 0.0 && uRadius > 0.0 && gl_Position.w > 0.0) {
              vec2 ndc = gl_Position.xy / gl_Position.w;
              vec2 off = ndc - uMouse;
              float dist = length(off * vec2(uAspect, 1.0));
              float f = uStrength * exp(-(dist * dist) / (2.0 * uRadius * uRadius));
              float m = length(off);
              if (m > 1e-4) { ndc += (off / m) * f; gl_Position.xy = ndc * gl_Position.w; }
            }`,
          );
      };
      return material;
    };

    let shape: VortexShape = makeShape(cfgRef.current);
    const disposables: Array<{ dispose: () => void }> = [];
    const track = <T extends { dispose: () => void }>(x: T): T => {
      disposables.push(x);
      return x;
    };

    let strands: Strand[] = [];
    let strandPos = new Float32Array(0);
    let strandCol = new Float32Array(0);
    let strandGeo: THREE.BufferGeometry | null = null;

    let dotList: Dot[] = [];
    let dotCount = 0;
    let dotMesh: THREE.InstancedMesh | null = null;
    let dotColors = new Float32Array(0);
    let dotHome = new Float32Array(0);
    let dotShift = new Float32Array(0);
    let dotVel = new Float32Array(0);
    let dotScale = new Float32Array(0);
    let dotScaleVel = new Float32Array(0);
    let dotHitAt = new Float32Array(0);
    let dotFlash = new Float32Array(0);
    let dotAlive = new Float32Array(0);
    let rippleAwake = false;

    let cometList: Comet[] = [];
    let cometTex: THREE.Texture | null = null;
    let waves: Wave[] = [];
    let wavesAwake = false;

    const dummy = new THREE.Matrix4();
    const tint = { strand: new THREE.Color(), dot: new THREE.Color(), comet: new THREE.Color() };
    const lastColors = { line: "", dot: "", comet: "" };

    function syncColors(cfg: ResolvedConfig) {
      if (cfg.lineColor !== lastColors.line) {
        tint.strand.set(cfg.lineColor);
        lastColors.line = cfg.lineColor;
      }
      if (cfg.dotColor !== lastColors.dot) {
        tint.dot.set(cfg.dotColor);
        lastColors.dot = cfg.dotColor;
      }
      if (cfg.cometColor !== lastColors.comet) {
        tint.comet.set(cfg.cometColor);
        lastColors.comet = cfg.cometColor;
        for (const comet of cometList) {
          comet.head.material.color.setRGB(tint.comet.r * 1.2, tint.comet.g * 1.2, tint.comet.b * 1.2);
        }
      }
    }

    function blob(size: number, stops: Array<[number, string]>) {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx2d = c.getContext("2d");
      if (ctx2d) {
        const g = ctx2d.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        for (const [at, color] of stops) g.addColorStop(at, color);
        ctx2d.fillStyle = g;
        ctx2d.fillRect(0, 0, size, size);
      }
      const tex = new THREE.Texture(c);
      tex.needsUpdate = true;
      return tex;
    }

    function build() {
      const cfg = cfgRef.current;
      for (let i = group.children.length - 1; i >= 0; i--) group.remove(group.children[i]);
      for (const d of disposables) d.dispose();
      disposables.length = 0;

      shape = makeShape(cfg);
      camera.fov = fovForZoom(cfg.zoom);
      camera.updateProjectionMatrix();
      syncColors(cfg);

      const count = Math.max(3, Math.round(cfg.lineCount));
      const segs = strandSegments - 1;
      const verts = count * segs * 2;
      strandPos = new Float32Array(verts * 3);
      strandCol = new Float32Array(verts * 3);
      strandGeo = track(new THREE.BufferGeometry());
      strandGeo.setAttribute("position", new THREE.BufferAttribute(strandPos, 3).setUsage(THREE.DynamicDrawUsage));
      strandGeo.setAttribute("color", new THREE.BufferAttribute(strandCol, 3).setUsage(THREE.DynamicDrawUsage));
      const strandMat = track(
        withRepel(
          new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );
      const strandLines = new THREE.LineSegments(strandGeo, strandMat);
      strandLines.frustumCulled = false;
      group.add(strandLines);

      strands = [];
      for (let i = 0; i < count; i++) {
        strands.push({
          lane: shape.lane(i, count),
          speed: 0.95 + Math.random() * 0.1,
          pulse: Math.random() * TAU,
          wobblePhase: Math.random() * TAU,
          from: 0,
          to: 1,
          bright: 0.5,
          offset: i * segs * 2 * 3,
          pts: new Float32Array(strandSegments * 3),
          cols: new Float32Array(strandSegments * 3),
        });
      }

      dotCount = cfg.showDots ? Math.max(0, Math.round(cfg.dotCount)) : 0;
      dotList = [];
      for (let i = 0; i < dotCount; i++) {
        const s = Math.random() < 0.5 ? 0.2 + Math.random() * 0.4 : 0.05 + Math.random() * 0.9;
        const strand = Math.floor(Math.random() * strands.length);
        dotList.push({
          s,
          lane: strands[strand].lane,
          strand,
          pulse: Math.random() * TAU,
          flickerRate: 0.15 + Math.random() * 4.5,
          bright: 0.04 + Math.random() ** 1.5 * 0.96,
        });
      }

      dotHome = new Float32Array(dotCount * 3);
      dotShift = new Float32Array(dotCount * 3);
      dotVel = new Float32Array(dotCount * 3);
      dotScale = new Float32Array(dotCount).fill(1);
      dotScaleVel = new Float32Array(dotCount);
      dotHitAt = new Float32Array(dotCount);
      dotFlash = new Float32Array(dotCount);
      dotAlive = new Float32Array(dotCount).fill(1);
      dotColors = new Float32Array(dotCount * 3);
      rippleAwake = false;

      if (dotCount > 0) {
        const dotGeo = track(new THREE.PlaneGeometry(1, 1));
        const dotMat = track(
          withRepel(
            new THREE.MeshBasicMaterial({
              color: 0xffffff,
              transparent: true,
              opacity: 0.9,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            }),
          ),
        );
        dotMesh = new THREE.InstancedMesh(dotGeo, dotMat, dotCount);
        dotMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        const white = new THREE.Color(1, 1, 1);
        for (let i = 0; i < dotCount; i++) dotMesh.setColorAt(i, white);
        if (dotMesh.instanceColor) dotMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        dotMesh.frustumCulled = false;
        group.add(dotMesh);
      } else {
        dotMesh = null;
      }

      waves = [];
      for (let i = 0; i < MAX_WAVES; i++) waves.push({ active: false, x: 0, y: 0, z: 0, at: 0, amp: 1 });
      wavesAwake = false;

      cometTex = track(
        blob(32, [
          [0, "rgba(255,255,255,0.9)"],
          [0.3, "rgba(255,120,255,0.4)"],
          [0.7, "rgba(200,50,200,0.08)"],
          [1, "rgba(0,0,0,0)"],
        ]),
      );
      const cometTotal = cfg.showComets ? Math.max(0, Math.round(cfg.cometCount)) : 0;
      const tailLen = Math.max(2, Math.round(cfg.cometTail));
      cometList = [];
      for (let i = 0; i < cometTotal; i++) {
        const trail = new Float32Array(tailLen * 3);
        const trailCol = new Float32Array(tailLen * 3);
        const geo = track(new THREE.BufferGeometry());
        geo.setAttribute("position", new THREE.BufferAttribute(trail, 3).setUsage(THREE.DynamicDrawUsage));
        geo.setAttribute("color", new THREE.BufferAttribute(trailCol, 3).setUsage(THREE.DynamicDrawUsage));
        const lineMat = track(
          withRepel(
            new THREE.LineBasicMaterial({
              vertexColors: true,
              transparent: true,
              opacity: 0.9,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            }),
          ),
        );
        const line = new THREE.Line(geo, lineMat);
        line.frustumCulled = false;
        const headMat = track(
          new THREE.SpriteMaterial({
            map: cometTex,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            color: new THREE.Color(tint.comet.r * 1.2, tint.comet.g * 1.2, tint.comet.b * 1.2),
          }),
        );
        const head = new THREE.Sprite(headMat);
        head.scale.set(0.35, 0.35, 1);
        group.add(line);
        group.add(head);
        const home = strands[Math.floor(Math.random() * strands.length)];
        const speed = cfg.cometSpeed * (0.7 + Math.random() * 0.6);
        cometList.push({
          bright: 0.7 + Math.random() * 0.3,
          lane: home.lane,
          speed,
          pulse: home.speed,
          wobblePhase: home.wobblePhase,
          base: speed,
          boost: 0,
          boostMul: 1,
          racing: false,
          s: 0,
          idle: 0,
          idleFor: cometTotal > 0 ? 0.4 + (i / cometTotal) * cfg.cometDelay : 0.4,
          trail,
          trailCol,
          geo,
          line,
          head,
        });
      }
      born = 0;
      resize();
    }

    const distance = FORM_HEIGHT / 2 / Math.tan(((BASE_ZOOM * Math.PI) / 180 / 2));
    const viewDir = new THREE.Vector3(3.4, -0.6, 10).normalize();
    const lookTarget = new THREE.Vector3(0, FORM_HEIGHT / 2, 0);
    camera.position.copy(lookTarget).addScaledVector(viewDir, distance);
    camera.lookAt(lookTarget);

    function resize() {
      const cfg = cfgRef.current;
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      repelUniforms.uAspect.value = w / h;
      repelUniforms.uRadius.value = clamp(cfg.repelRadius / (h / 2), 0.01, 3);
      if (!cfg.running) renderer.render(scene, camera);
    }
    window.addEventListener("resize", resize);

    let repelTarget = 0;
    const onPointerMove = (e: PointerEvent) => {
      const cfg = cfgRef.current;
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      repelUniforms.uMouse.value.set((e.clientX / w) * 2 - 1, -((e.clientY / h) * 2 - 1));
      repelTarget = cfg.hoverRepel && cfg.running ? clamp(cfg.repelStrength / 100, 0, 1) * REPEL_MAX_NDC : 0;
    };
    const onPointerLeave = () => {
      repelTarget = 0;
    };
    // Canvas is pointer-events:none (background), so listen on window.
    window.addEventListener("pointermove", onPointerMove);
    document.documentElement.addEventListener("pointerleave", onPointerLeave);

    function addWave(x: number, y: number, z: number, at: number, amp: number) {
      wavesAwake = true;
      let slot = 0;
      let oldest = Infinity;
      for (let i = 0; i < MAX_WAVES; i++) {
        if (!waves[i].active) {
          slot = i;
          break;
        }
        if (waves[i].at < oldest) {
          oldest = waves[i].at;
          slot = i;
        }
      }
      waves[slot] = { active: true, x, y, z, at, amp };
    }

    const waveTmp = { out: new Float32Array(3) };
    void waveTmp;

    function waveAt(x: number, y: number, z: number, now: number, out: Float32Array, at: number, radius: number) {
      let ox = 0;
      let oy = 0;
      let oz = 0;
      let any = false;
      for (let i = 0; i < MAX_WAVES; i++) {
        const w = waves[i];
        if (!w.active) continue;
        const age = now - w.at;
        if (age > WAVE_LIFE) {
          w.active = false;
          continue;
        }
        any = true;
        const dx = x - w.x;
        const dy = y - w.y;
        const dz = z - w.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < 0.001 || d > radius * 1.5) continue;
        const front = Math.abs(d - WAVE_SPEED * age);
        if (front > WAVE_WIDTH) continue;
        const shell = Math.cos(((front / WAVE_WIDTH) * Math.PI) / 2);
        const fade = Math.exp(-age / WAVE_DECAY);
        const near = 1 / Math.max(d, 0.3);
        const push = RIPPLE_STRENGTH * w.amp * WAVE_STRENGTH * shell * fade * near;
        ox += (dx / d) * push;
        oy += (dy / d) * push;
        oz += (dz / d) * push;
      }
      if (!any) wavesAwake = false;
      out[at] += ox;
      out[at + 1] += oy;
      out[at + 2] += oz;
    }

    function burstAt(i: number, now: number, force: number) {
      rippleAwake = true;
      const x = dotHome[i * 3];
      const y = dotHome[i * 3 + 1];
      const z = dotHome[i * 3 + 2];
      addWave(x, y, z, now, force);
      const radius = RIPPLE_RADIUS;
      const maxSq = radius * radius;
      for (let j = 0; j < dotCount; j++) {
        const dx = dotHome[j * 3] - x;
        const dy = dotHome[j * 3 + 1] - y;
        const dz = dotHome[j * 3 + 2] - z;
        const sq = dx * dx + dy * dy + dz * dz;
        if (sq > maxSq || sq < 1e-4) continue;
        const d = Math.sqrt(sq);
        const f = 1 - d / radius;
        const push = (RIPPLE_STRENGTH * force * f * f) / Math.max(d, 0.1);
        dotVel[j * 3] += dx * push;
        dotVel[j * 3 + 1] += dy * push;
        dotVel[j * 3 + 2] += dz * push;
        const swell = 1 + (SCALE_PEAK - 1) * force * f * f;
        if (swell > dotScale[j]) {
          dotScale[j] = swell;
          dotScaleVel[j] = 0;
        }
      }
    }

    function settle(dt: number) {
      let moving = false;
      for (let i = 0; i < dotCount; i++) {
        const at = i * 3;
        for (let k = 0; k < 3; k++) {
          const a = -RIPPLE_SPRING * dotShift[at + k] - RIPPLE_DAMPING * dotVel[at + k];
          dotVel[at + k] += a * dt;
          dotShift[at + k] += dotVel[at + k] * dt;
        }
        const restSq = dotShift[at] ** 2 + dotShift[at + 1] ** 2 + dotShift[at + 2] ** 2;
        const velSq = dotVel[at] ** 2 + dotVel[at + 1] ** 2 + dotVel[at + 2] ** 2;
        if (restSq < 1e-8 && velSq < 1e-8) {
          dotShift[at] = dotShift[at + 1] = dotShift[at + 2] = 0;
          dotVel[at] = dotVel[at + 1] = dotVel[at + 2] = 0;
        } else moving = true;
        const sa = -SCALE_SPRING * (dotScale[i] - 1) - SCALE_DAMPING * dotScaleVel[i];
        dotScaleVel[i] += sa * dt;
        dotScale[i] += dotScaleVel[i] * dt;
        if (Math.abs(dotScale[i] - 1) < 0.001 && Math.abs(dotScaleVel[i]) < 0.001) {
          dotScale[i] = 1;
          dotScaleVel[i] = 0;
        } else moving = true;
      }
      if (!moving) rippleAwake = false;
    }

    let raf = 0;
    let disposed = false;
    let born = 0;
    let flow = 0;
    let strandClock = 0;
    let tick = 0;
    let lastTime = performance.now();

    function drawStrand(strand: Strand, now: number, entrance: number) {
      const cfg = cfgRef.current;
      const spin = flow * strand.speed;
      const bright = strand.bright * cfg.lineGlow;
      const lift = 0.15 + bright * 1.5;
      const alpha = Math.min(bright * 0.5 * (0.9 + 0.1 * Math.sin(now * 0.18 + strand.pulse)), 0.7) * Math.min(entrance * 3, 1);
      const reach = strand.from + entrance * (strand.to - strand.from);
      const tipFade = 0.15 * (strand.to - strand.from);
      const { pts, cols } = strand;
      const total = pts.length / 3;
      for (let i = 0; i < total; i++) {
        const u = i / (total - 1);
        const s = strand.from + u * (strand.to - strand.from);
        const at = i * 3;
        shape.writePoint(pts, at, s, strand.lane, spin, WOBBLE, strand.wobblePhase, now);
        if (wavesAwake) waveAt(pts[at], pts[at + 1], pts[at + 2], now, pts, at, RIPPLE_RADIUS);
        let edge = 1;
        if (u < FADE_ZONE) {
          const k = u / FADE_ZONE;
          edge = k * k;
        } else if (u > 1 - FADE_ZONE) {
          const k = (1 - u) / FADE_ZONE;
          edge = k * k;
        }
        let tip = 1;
        if (s > reach) tip = 0;
        else if (s > reach - tipFade) {
          tip = (reach - s) / tipFade;
          tip *= tip;
        }
        const v = edge * lift * tip * alpha;
        cols[at] = tint.strand.r * v;
        cols[at + 1] = tint.strand.g * v;
        cols[at + 2] = tint.strand.b * v;
      }
      let wpos = strand.offset;
      for (let i = 0; i < total - 1; i++) {
        const a = i * 3;
        const b = (i + 1) * 3;
        strandPos[wpos] = pts[a];
        strandPos[wpos + 1] = pts[a + 1];
        strandPos[wpos + 2] = pts[a + 2];
        strandCol[wpos] = cols[a];
        strandCol[wpos + 1] = cols[a + 1];
        strandCol[wpos + 2] = cols[a + 2];
        wpos += 3;
        strandPos[wpos] = pts[b];
        strandPos[wpos + 1] = pts[b + 1];
        strandPos[wpos + 2] = pts[b + 2];
        strandCol[wpos] = cols[b];
        strandCol[wpos + 1] = cols[b + 1];
        strandCol[wpos + 2] = cols[b + 2];
        wpos += 3;
      }
    }

    function driveComet(comet: Comet, now: number, dt: number, entrance: number) {
      const cfg = cfgRef.current;
      const tailLen = comet.trail.length / 3;
      if (!comet.racing) {
        comet.head.material.opacity = 0;
        if (entrance < 0.3) return;
        comet.idle += dt;
        if (comet.idle > comet.idleFor) {
          comet.racing = true;
          comet.s = cfg.flowDir < 0 ? RUN_HIGH : RUN_LOW;
          comet.base = cfg.cometSpeed * (0.7 + Math.random() * 0.6);
          comet.speed = comet.base;
          comet.boost = 0;
          comet.boostMul = 1;
          const home = strands[Math.floor(Math.random() * strands.length)];
          comet.lane = home.lane;
          comet.pulse = home.speed;
          comet.wobblePhase = home.wobblePhase;
        }
        return;
      }
      if (comet.boost > 0) {
        comet.boost -= dt;
        if (comet.boost <= 0) {
          comet.boost = 0;
          comet.boostMul = 1;
        } else comet.boostMul = 1 + (HIT_BOOST - 1) * (comet.boost / HIT_BOOST_TIME);
        comet.speed = comet.base * comet.boostMul;
      }
      comet.s += dt * comet.speed * cfg.flowDir;
      if (cfg.flowDir < 0 ? comet.s < RUN_LOW : comet.s > RUN_HIGH) {
        comet.racing = false;
        comet.idle = 0;
        comet.idleFor = cfg.cometDelay * (0.6 + Math.random() * 0.8);
        comet.trailCol.fill(0);
        comet.geo.attributes.color.needsUpdate = true;
        comet.head.material.opacity = 0;
        return;
      }
      const spin = flow * comet.pulse;
      const ends = clamp((comet.s - RUN_LOW) / RUN_FADE, 0, 1) * clamp((RUN_HIGH - comet.s) / RUN_FADE, 0, 1);
      for (let i = 0; i < tailLen; i++) {
        const s = clamp(comet.s - i * 0.005 * cfg.flowDir, 0.005, 0.995);
        const at = i * 3;
        shape.writePoint(comet.trail, at, s, comet.lane, spin, WOBBLE, comet.wobblePhase, now);
        const along = (1 - i / tailLen) ** 2;
        const v = comet.bright * cfg.cometGlow * along * ends;
        const hot = entrance * (i < 3 ? 1.3 : 1);
        comet.trailCol[at] = tint.comet.r * v * hot;
        comet.trailCol[at + 1] = tint.comet.g * v * hot;
        comet.trailCol[at + 2] = tint.comet.b * v * hot;
      }
      comet.head.position.set(comet.trail[0], comet.trail[1], comet.trail[2]);
      const swell = comet.boost > 0 ? 1 + (comet.boostMul - 1) * 0.8 : 1;
      comet.head.material.opacity = ends * 0.35 * entrance * swell;
      comet.head.scale.set(0.35 * swell, 0.35 * swell, 1);
      comet.geo.attributes.position.needsUpdate = true;
      comet.geo.attributes.color.needsUpdate = true;
    }

    function collide(now: number) {
      const cfg = cfgRef.current;
      const force = cfg.collideForce;
      if (force <= 0) return;
      const hitSq = HIT_RADIUS * HIT_RADIUS;
      for (const comet of cometList) {
        if (!comet.racing) continue;
        const x = comet.trail[0];
        const y = comet.trail[1];
        const z = comet.trail[2];
        if (x === 0 && y === 0 && z === 0) continue;
        for (let i = 0; i < dotCount; i++) {
          const dx = dotHome[i * 3] - x;
          const dy = dotHome[i * 3 + 1] - y;
          const dz = dotHome[i * 3 + 2] - z;
          const sq = dx * dx + dy * dy + dz * dz;
          if (sq < hitSq && dotHitAt[i] === 0) {
            dotHitAt[i] = 0.001;
            dotFlash[i] = HIT_FLASH * force;
            dotScale[i] = 1 + (HIT_POP - 1) * force;
            burstAt(i, now, force);
            comet.boost = HIT_BOOST_TIME;
            comet.boostMul = 1 + (HIT_BOOST - 1) * force;
            comet.speed = comet.base * comet.boostMul;
          }
        }
      }
    }

    // ---------------- Scroll-linked parallax + entrance ----------------
    const scrollTarget = { value: typeof window !== "undefined" ? window.scrollY : 0 };
    let smoothScroll = scrollTarget.value;
    const onScroll = () => {
      scrollTarget.value = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const INTRO_MS = 1500;
    let introStart = 0;
    let wasDeep = false;

    function introProgress(now: number) {
      const raw = Math.min(Math.max((now - introStart) / INTRO_MS, 0), 1);
      return raw * raw * (3 - 2 * raw);
    }

    function applyScrollParallax(): void {
      if (!outer) return;
      smoothScroll += (scrollTarget.value - smoothScroll) * 0.12;
      if (Math.abs(scrollTarget.value - smoothScroll) < 0.05) {
        smoothScroll = scrollTarget.value;
      }
      const vh = window.innerHeight || 1;
      if (scrollTarget.value > vh * 1.0) {
        wasDeep = true;
      } else if (wasDeep && scrollTarget.value < vh * 0.35) {
        wasDeep = false;
        introStart = performance.now();
      }
      const intro = introProgress(performance.now());
      const scale = 1 + (1 - intro) * 0.06;
      outer.style.transform =
        `translate3d(0, ${(-smoothScroll * 0.22).toFixed(1)}px, 0) ` + `scale(${scale.toFixed(4)})`;
      const fade = Math.min(Math.max(smoothScroll / (vh * 1.2), 0), 1);
      outer.style.opacity = ((1 - fade * 0.92) * intro).toFixed(3);
      const lift = (smoothScroll / vh) * 2.2;
      group.position.y = -lift - (1 - intro) * 1.2;
    }

    function renderVortex(now: number, dt: number) {
      const cfg = cfgRef.current;
      const t = now;
      const fadeStrand = ramp(t, ENTRANCE.strandStart, ENTRANCE.strandEnd);
      const fadeDot = ramp(t, ENTRANCE.dotStart, ENTRANCE.dotEnd);
      const fadeComet = ramp(t, ENTRANCE.cometStart, ENTRANCE.cometEnd);
      syncColors(cfg);
      const fov = fovForZoom(cfg.zoom);
      if (camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      repelUniforms.uRadius.value = clamp(cfg.repelRadius / (window.innerHeight / 2), 0.01, 3);
      flow += dt * cfg.flowSpeed;
      const us = repelUniforms.uStrength;
      us.value += (repelTarget - us.value) * Math.min(1, dt * 12);
      strandClock += dt;
      if (strandClock >= STRAND_HZ && strandGeo) {
        strandClock -= STRAND_HZ;
        for (const strand of strands) drawStrand(strand, t, fadeStrand);
        strandGeo.attributes.position.needsUpdate = true;
        (strandGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      }
      if (rippleAwake) settle(dt);
      if (dotMesh && dotCount > 0) {
        const size = cfg.dotSize;
        const color = new THREE.Color();
        for (let i = 0; i < dotCount; i++) {
          const dot = dotList[i];
          const strand = strands[dot.strand] ?? strands[0];
          const spin = flow * strand.speed;
          const at = i * 3;
          shape.writePoint(dotHome, at, dot.s, dot.lane, spin, WOBBLE, strand.wobblePhase, t);
          if (dotHitAt[i] > 0) {
            dotHitAt[i] += dt;
            const age = dotHitAt[i];
            if (age < HIT_FADE) {
              const k = age / HIT_FADE;
              dotAlive[i] = (1 + (HIT_POP - 1) * (1 - k)) * (1 - k * k);
              dotFlash[i] = HIT_FLASH * (1 - k * k) * (1 - k * k);
            } else {
              dotAlive[i] = 0;
              dotFlash[i] = 0;
            }
            if (age > HIT_RESPAWN) {
              dotHitAt[i] = 0;
              dotAlive[i] = 1;
              dotFlash[i] = 0;
            }
          }
          const alive = dotAlive[i];
          const sc = size * dotScale[i] * alive;
          dummy.makeScale(sc, sc, sc);
          dummy.setPosition(dotHome[at] + dotShift[at], dotHome[at + 1] + dotShift[at + 1], dotHome[at + 2] + dotShift[at + 2]);
          dotMesh.setMatrixAt(i, dummy);
          const beat =
            1 - cfg.dotFlicker + cfg.dotFlicker * (0.08 + 0.92 * Math.max(0, Math.sin(t * dot.flickerRate + dot.pulse)) ** 2.5);
          const swollen = dotScale[i] > 1.02 ? 1 + (dotScale[i] - 1) * 0.5 : 1;
          const v = dot.bright * beat * cfg.dotGlow * swollen * fadeDot * (1 + dotFlash[i]) * alive;
          color.setRGB(tint.dot.r * v, tint.dot.g * v, tint.dot.b * v);
          dotMesh.setColorAt(i, color);
        }
        dotMesh.instanceMatrix.needsUpdate = true;
        if (dotMesh.instanceColor) dotMesh.instanceColor.needsUpdate = true;
        (dotMesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * fadeDot;
      }
      for (const comet of cometList) driveComet(comet, t, dt, fadeComet);
      tick++;
      const collideEvery = mobile ? 6 : 2;
      if (tick % collideEvery === 0 && dotCount > 0) collide(t);
      applyScrollParallax();
      renderer.render(scene, camera);
    }

    build();
    resize();

    const onVisibility = () => {
      cfgRef.current.running = document.hidden ? false : !prefersReducedMotion;
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (prefersReducedMotion) {
      // One static frame: vortex fully formed, no loop.
      cfgRef.current.running = false;
      flow = 0.6;
      introStart = performance.now() - INTRO_MS;
      renderVortex(ENTRANCE.cometEnd + 0.5, 0.016);
    } else {
      introStart = performance.now();
      born = 0;
      lastTime = performance.now();
      let elapsed = 0;
      let lastFrame = 0;
      const step = (nowMs: number) => {
        if (disposed) return;
        raf = requestAnimationFrame(step);
        const cfg = cfgRef.current;
        const dt = Math.min((nowMs - lastTime) / 1000, 0.04);
        lastTime = nowMs;
        // Phones: cap at ~30fps — halves GPU work, still looks smooth.
        if (mobile && nowMs - lastFrame < 33) {
          applyScrollParallax();
          return;
        }
        lastFrame = nowMs;
        // Fully faded out (scrolled past hero)? Skip WebGL work entirely.
        const vh = window.innerHeight || 1;
        if (smoothScroll > vh * 1.35) {
          applyScrollParallax();
          return;
        }
        if (document.hidden || !cfg.running) {
          applyScrollParallax();
          renderer.render(scene, camera);
          return;
        }
        if (born === 0) born = nowMs;
        elapsed = (nowMs - born) / 1000;
        renderVortex(elapsed, dt);
      };
      raf = requestAnimationFrame(step);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      scene.remove(group);
      for (const d of disposables) d.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={outerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black will-change-transform"
    >
      <div ref={mountRef} className="absolute inset-0 [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full" />
      {/* Readability overlays: darken edges so hero copy stays legible over the vortex */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_42%,transparent_40%,rgba(0,0,0,0.55)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 to-transparent" />
    </div>
  );
}
