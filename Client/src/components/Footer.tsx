import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "@/src/components/Reveal";
import { useContent } from "@/src/lib/content";

/**
 * Site footer: brand column (logo, blurb, socials with arrow-reveal
 * hover), four link columns, bottom status bar.
 * Content rises with a staggered reveal on entry; a top fade + hairline
 * lifts the footer off the animated page backdrop so it reads as its
 * own stage instead of merging into the background.
 */
export function Footer() {
  const { FOOTER_BLURB, FOOTER_COLUMNS, FOOTER_SOCIALS } = useContent();
  return (
    <footer className="relative bg-black shadow-[0_-30px_80px_rgb(0,0,0,0.9)]">
      {/* Bridge fade: melts the canvas into the footer + highlight edge. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-28 h-28 bg-gradient-to-t from-black via-black/70 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
      />
      <div className="relative z-10 mx-auto max-w-[1400px] px-[15px] lg:px-14">
        <div className="py-16 lg:py-20">
          <div className="grid grid-cols-2 gap-12 md:grid-cols-6 lg:gap-8">
            <Reveal offset="sm" duration={700} className="col-span-2">
            <div>
              <Link
                to="/"
                aria-label="CyberSentinel home"
                className="mb-6 inline-flex items-center gap-2 rounded-sm transition-opacity hover:opacity-80"
              >
                <img
                  src="/Cyberlogo/hourglass-mark.png"
                  alt=""
                  aria-hidden="true"
                  width={22}
                  height={22}
                  className="size-[22px] object-contain"
                />
                <span className="font-nav text-sm font-semibold tracking-[0.12em] text-foreground">
                  CYBERSENTINEL
                </span>
              </Link>
              <p className="mb-8 max-w-xs text-sm leading-relaxed text-white/50">
                {FOOTER_BLURB}
              </p>
              <div className="flex gap-6">
                {FOOTER_SOCIALS.map((social) => (
                  <a
                    key={social}
                    href="#"
                    className="group flex items-center gap-1 text-sm text-white/40 transition-colors hover:text-white"
                  >
                    {social}
                    <ArrowUpRight
                      size={12}
                      aria-hidden="true"
                      className="-translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                    />
                  </a>
                ))}
              </div>
            </div>
            </Reveal>

            {FOOTER_COLUMNS.map((column, i) => (
              <Reveal
                key={column.heading}
                offset="sm"
                delay={(i % 2 === 0 ? 0 : 150) as 0 | 150}
                duration={700}
              >
              <div>
                <h3 className="mb-6 text-sm font-medium text-white">
                  {column.heading}
                </h3>
                <ul className="space-y-4">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
                      >
                        {link.label}
                        {link.badge && (
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs text-black">
                            {link.badge}
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal offset="sm" duration={700}>
        <div className="flex flex-col items-start justify-between gap-4 border-t border-white/10 py-8 md:flex-row md:items-center">
          <p className="text-sm text-white/30">
            © 2026 CyberSentinel. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-white/30">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400" />
              All scheduler systems operational
            </span>
          </div>
        </div>
        </Reveal>
      </div>
    </footer>
  );
}
