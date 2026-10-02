import { useEffect, type CSSProperties } from "react";
import { useOnscreen } from "@/src/lib/useOnscreen";

interface Streak {
  x: number;
  y: number;
  len: number;
  speed: number;
  alpha: number;
  sway: number;
  phase: number;
  width: number;
}

interface Mote {
  x: number;
  y: number;
  radius: number;
  speed: number;
  alpha: number;
  phase: number;
}

/**
 * Bottom-to-top digital rain: thin vertical streaks + faint glowing motes
 * rising and wrapping, like the CyberSentinel hero backdrop. Pure 2D canvas,
 * DPR-aware, pauses offscreen, static frame under prefers-reduced-motion.
 * Mount once per page as a fixed backdrop; page content sits above it.
 */
export function RiseStreaks({
  className = "",
  style,
  id,
}: {
  className?: string;
  style?: CSSProperties;
  id?: string;
}) {
  const { ref: canvasRef, onscreen } = useOnscreen<HTMLCanvasElement>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let streaks: Streak[] = [];
    let motes: Mote[] = [];
    let raf = 0;
    let frame = 0;

    const seed = () => {
      const area = width * height;
      const streakCount = Math.min(
        170,
        Math.max(70, Math.floor(area / 9500)),
      );
      const moteCount = Math.min(110, Math.max(40, Math.floor(area / 16000)));
      streaks = Array.from({ length: streakCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        len: 18 + Math.random() * 80,
        speed: 0.7 + Math.random() * 1.9,
        alpha: 0.06 + Math.random() * 0.22,
        sway: 2 + Math.random() * 8,
        phase: Math.random() * Math.PI * 2,
        width: Math.random() < 0.85 ? 1 : 1.5,
      }));
      motes = Array.from({ length: moteCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.5 + Math.random() * 1.4,
        speed: 0.12 + Math.random() * 0.4,
        alpha: 0.1 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const paint = (twinkle: boolean) => {
      context.clearRect(0, 0, width, height);
      context.lineCap = "round";
      for (const s of streaks) {
        const x = s.x + Math.sin(frame / 70 + s.phase) * s.sway;
        const gradient = context.createLinearGradient(0, s.y, 0, s.y + s.len);
        gradient.addColorStop(0, `rgba(228, 228, 231, ${s.alpha.toFixed(3)})`);
        gradient.addColorStop(1, "rgba(228, 228, 231, 0)");
        context.strokeStyle = gradient;
        context.lineWidth = s.width;
        context.beginPath();
        context.moveTo(x, s.y);
        context.lineTo(x, s.y + s.len);
        context.stroke();
      }
      for (const m of motes) {
        const alpha = twinkle
          ? m.alpha * (0.6 + 0.4 * Math.sin(frame / 45 + m.phase))
          : m.alpha;
        context.beginPath();
        context.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(228, 228, 231, ${alpha.toFixed(3)})`;
        context.fill();
      }
    };

    const tick = () => {
      frame += 1;
      for (const s of streaks) {
        s.y -= s.speed;
        if (s.y + s.len < 0) {
          s.y = height + Math.random() * 60;
          s.x = Math.random() * width;
        }
      }
      for (const m of motes) {
        m.y -= m.speed;
        if (m.y < -4) {
          m.y = height + 4;
          m.x = Math.random() * width;
        }
      }
      paint(true);
      raf = requestAnimationFrame(tick);
    };

    resize();
    if (reducedMotion || !onscreen) {
      paint(false);
    } else {
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, [onscreen]);

  return (
    <div
      id={id}
      aria-hidden="true"
      style={style}
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black ${className}`}
    >
      <canvas ref={canvasRef} className="block size-full" />
      {/* Top fade so streaks dissolve before the navbar; bottom glow lift. */}
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-background via-background/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/40 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_45%,transparent_55%,rgba(0,0,0,0.5)_100%)]" />
    </div>
  );
}
