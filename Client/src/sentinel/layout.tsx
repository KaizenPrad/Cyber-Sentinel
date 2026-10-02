import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { CornerMark } from "@/src/components/SectionDivider";
import { Footer } from "@/src/components/Footer";
import { RiseStreaks } from "@/src/components/RiseStreaks";
import { StarButton } from "@/src/components/StarButton";
import { useAuth } from "./auth";
import { UserAvatar, UserMenu, getDisplayName } from "./UserMenu";
import "./readable.css";

const LINKS = [
  { to: "/monitor", label: "Threat Monitor" },
  { to: "/graph", label: "Network Graph" },
  { to: "/detection", label: "AI Detection" },
  { to: "/incidents", label: "Incidents" },
  { to: "/report", label: "Security Report" },
  { to: "/docs", label: "Docs" },
];

/**
 * Fixed header mirroring the CyberSentinel Navbar shell (max-w 1344px bar,
 * h-12, hairline rules, corner ticks, StarButton, hamburger below md),
 * wired to CyberSentinel routes instead of anchor links.
 */
export function SentinelHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  // Apple-style frosted pill: transparent at the top, grey liquid-glass once scrolled.
  const [scrolled, setScrolled] = useState(
    () => typeof window !== "undefined" && window.scrollY > 16,
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open ]);

  return (
    <header className="fixed top-3 right-0 left-0 z-50 transition-all duration-500">
      <nav
        aria-label="Primary"
        className={`relative mx-auto w-full max-w-[1600px] px-4 font-nav transition-all duration-500 ease-out sm:px-8 lg:px-14 ${
          scrolled
            ? "rounded-2xl border border-white/10 bg-[#1c1c1e]/70 shadow-[0_8px_32px_rgb(0,0,0,0.45)] backdrop-blur-2xl backdrop-saturate-150 lg:w-[calc(100%-5rem)]"
            : "rounded-2xl border border-transparent bg-transparent backdrop-blur-none lg:w-[calc(100%-3.5rem)]"
        } before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-px before:bg-foreground/10 before:transition-opacity before:duration-500 after:absolute after:inset-x-0 after:bottom-0 after:z-10 after:h-px after:bg-foreground/10 after:transition-opacity after:duration-500 ${
          scrolled ? "before:opacity-0 after:opacity-0" : "before:opacity-100 after:opacity-100"
        }`}
      >
        <CornerMark tone="z-20" className={`top-0 left-0 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500 ${scrolled ? "opacity-0" : "opacity-100"}`} />
        <CornerMark tone="z-20" className={`top-0 right-0 translate-x-1/2 -translate-y-1/2 transition-opacity duration-500 ${scrolled ? "opacity-0" : "opacity-100"}`} />
        <CornerMark tone="z-20" className={`bottom-0 left-0 -translate-x-1/2 translate-y-1/2 transition-opacity duration-500 ${scrolled ? "opacity-0" : "opacity-100"}`} />
        <CornerMark tone="z-20" className={`right-0 bottom-0 translate-x-1/2 translate-y-1/2 transition-opacity duration-500 ${scrolled ? "opacity-0" : "opacity-100"}`} />
        <div
          className={`flex items-center justify-between transition-all duration-500 ease-out ${
            scrolled ? "h-10 px-3" : "h-12 px-5"
          }`}
        >
          <Link
            to="/"
            aria-label="CyberSentinel home"
            title="CyberSentinel home"
            onClick={() => {
              // Already home → glide back to the top; otherwise the
              // route change below resets scroll via ScrollToTop.
              if (pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="relative z-30 inline-flex cursor-pointer items-center gap-2 rounded-sm transition-all duration-500 hover:opacity-80"
          >
            <img
              src="/Cyberlogo/hourglass-mark.png"
              alt=""
              aria-hidden="true"
              width={22}
              height={22}
              className={`object-contain transition-all duration-500 ${
                scrolled ? "size-[18px]" : "size-[22px]"
              }`}
            />
            <span
              className={`font-semibold tracking-[0.12em] text-foreground transition-all duration-500 ${
                scrolled ? "text-xs" : "text-sm"
              }`}
            >
              CYBERSENTINEL
            </span>
          </Link>

          <div className={`hidden items-center md:flex ${scrolled ? "gap-6" : "gap-7"}`}>
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `nav-link group text-[15px] transition-all duration-500 ${scrolled ? "py-1 text-sm" : "py-3"} ${isActive ? "nav-link-active text-white" : ""}`
                }
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {/* Persistent active node: sits on the underline and
                        keeps pulsing until another link is clicked. */}
                    <span
                      aria-hidden="true"
                      className={`nav-active-dot absolute -bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-white transition-all duration-300 ${
                        isActive
                          ? "animate-pulse scale-100 opacity-100 shadow-[0_0_8px_rgba(255,255,255,0.9)]"
                          : "scale-0 opacity-0"
                      }`}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <UserMenu scrolled={scrolled} />
            ) : (
              <StarButton
                size="sm"
                onClick={() => navigate("/login")}
                className={scrolled ? "star-button-glass" : ""}
              >
                SIGN IN
              </StarButton>
            )}
          </div>

          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="rounded-sm p-2.5 text-white transition-colors duration-300 hover:text-white md:hidden"
          >
            {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>

        <div
          className={`mx-4 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden ${
            open
              ? "max-h-[36rem] translate-y-0 opacity-100"
              : "pointer-events-none max-h-0 -translate-y-3 opacity-0"
          }`}
        >
          <div className="mt-2 flex flex-col gap-1 rounded-2xl border border-white/10 bg-black/95 p-4">
            {LINKS.map((link, i) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                onClick={() => setOpen(false)}
                style={{ transitionDelay: open ? `${120 + i * 70}ms` : "0ms" }}
                className={({ isActive }) =>
                  `nav-link rounded-lg px-3 py-3 text-lg transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    open ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
                  } ${isActive ? "nav-link-active-mobile text-white" : ""}`
                }
              >
                {({ isActive }) => (
                  <span className="flex items-center gap-2.5">
                    {/* Persistent active bar: visible until another link is clicked. */}
                    <span
                      aria-hidden="true"
                      className={`nav-active-dot h-5 w-1 rounded-full bg-white transition-all duration-300 ${
                        isActive
                          ? "animate-pulse scale-y-100 opacity-100 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                          : "scale-y-0 opacity-0"
                      }`}
                    />
                    {link.label}
                  </span>
                )}
              </NavLink>
            ))}
            <div
              style={{ transitionDelay: open ? `${120 + LINKS.length * 70}ms` : "0ms" }}
              className={`flex gap-2 pt-2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                open ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
              }`}
            >
              {user ? (
                <div className="w-full">
                  <div className="flex items-center gap-3 rounded-xl px-3 py-3">
                    <UserAvatar user={user} className="size-10 text-sm" />
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium text-white">
                        {getDisplayName(user)}
                      </p>
                      <p className="truncate text-xs text-white/50">{user.organization?.name}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 px-3 pb-1">
                    {[
                      { to: "/profile", label: "Profile" },
                      { to: "/keys", label: "API keys" },
                      ...(user.role === "OWNER" || user.role === "ADMIN"
                        ? [{ to: "/admin", label: "Admin" }]
                        : []),
                    ].map((l) => (
                      <NavLink
                        key={l.to}
                        to={l.to}
                        onClick={() => setOpen(false)}
                        className="rounded-full border border-white/10 px-4 py-1.5 text-sm text-white/70"
                      >
                        {l.label}
                      </NavLink>
                    ))}
                  </div>
                  <StarButton
                    size="md"
                    className="mt-1 w-full"
                    onClick={() => {
                      setOpen(false);
                      void logout().then(() => navigate("/login"));
                    }}
                  >
                    LOG OUT
                  </StarButton>
                </div>
              ) : (
                <StarButton
                  size="md"
                  className="w-full"
                  onClick={() => {
                    setOpen(false);
                    navigate("/login");
                  }}
                >
                  SIGN IN
                </StarButton>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

export function SentinelLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  // Drives the top scrim: invisible at rest so the hero stays pristine,
  // faded in once scrolling begins (in sync with the frosted pill).
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="sentinel-scale relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <SentinelHeader />
      {/* Shared rising-streak backdrop on every page except home,
          which has its own 3D flow-field background. */}
      {pathname === "/" ? null : <RiseStreaks />}
      {/* Scroll scrim: solid behind the pill, then a fade zone so rising
          content dissolves before touching the bar; the faint sheen at the
          tail reads as light catching the paper curl. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-x-0 top-0 z-40 transition-opacity duration-500 ${
          scrolled ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="h-[76px] bg-background" />
        <div className="h-[130px] bg-gradient-to-b from-background to-transparent" />
        <div className="h-6 -mt-6 bg-[radial-gradient(ellipse_55%_100%_at_50%_100%,rgba(255,255,255,0.08),transparent_70%)]" />
      </div>
      <div className="relative z-10 mx-auto w-full min-w-0 max-w-[1600px] px-4 pt-24 pb-16 sm:px-8 lg:px-14 lg:pt-32 lg:pb-20">
        {children}
      </div>
      <Footer />
    </main>
  );
}
