import { ChevronDown, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, type SessionUser } from "./auth";
import { StarButton } from "@/src/components/StarButton";

/** "Ada Lovelace" → "Ada Lovelace"; falls back to the email prefix. */
export function getDisplayName(user: SessionUser): string {
  const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  if (full) return full;
  const prefix = user.email?.split("@")[0]?.trim();
  return prefix || user.email;
}

/** "Ada Lovelace" → "AL"; falls back to the first email letter. */
export function getInitials(user: SessionUser): string {
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();
  if (initials.trim()) return initials;
  return (user.email?.[0] ?? "U").toUpperCase();
}

export function UserAvatar({
  user,
  className = "size-8 text-xs",
}: {
  user: SessionUser;
  className?: string;
}) {
  // When OAuth lands, `avatarUrl` carries the platform photo and wins automatically.
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={`${getDisplayName(user)}'s profile photo`}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        className={`rounded-full border border-white/15 object-cover ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 font-mono font-semibold text-white ${className}`}
    >
      {getInitials(user)}
    </span>
  );
}

/**
 * Signed-in identity shown where SIGN IN used to be: avatar (+ photo when the
 * provider supplies one) and first name — never the raw email. Opens a small
 * menu with full profile details and Log out.
 */
export function UserMenu({ scrolled = false }: { scrolled?: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  if (!user) return null;

  const handleLogout = () => {
    setOpen(false);
    void logout().then(() => navigate("/login"));
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${getDisplayName(user)} — account menu`}
        className={`inline-flex items-center gap-2 rounded-full border py-1 pr-2 pl-1 transition-all duration-500 ${
          scrolled
            ? "min-h-[32px] border-white/20 bg-white/10 shadow-[0_2px_12px_rgb(0,0,0,0.3)] backdrop-blur-xl hover:bg-white/[0.16]"
            : "min-h-[44px] border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
        }`}
      >
        <UserAvatar user={user} className={scrolled ? "size-6 text-[10px]" : "size-8 text-xs"} />
        <span className={`truncate text-white/85 transition-all duration-500 ${scrolled ? "max-w-24 text-xs" : "max-w-28 text-sm"}`}>
          {user.firstName || getDisplayName(user)}
        </span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`text-white/50 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className="absolute top-full right-0 z-50 mt-2 w-64 rounded-2xl border border-white/10 bg-black/95 p-4 shadow-xl backdrop-blur-md"
        >
          <div className="flex items-center gap-3">
            <UserAvatar user={user} className="size-10 text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {getDisplayName(user)}
              </p>
              <p className="truncate text-xs text-white/50" title={user.email}>
                {user.email}
              </p>
            </div>
          </div>
          <p className="mt-3 truncate text-xs text-white/40">
            {user.organization?.name}
            {user.role ? ` · ${user.role}` : ""}
            {user.provider ? ` · via ${user.provider}` : ""}
          </p>
          <div className="mt-3 grid gap-1 border-t border-white/10 pt-3">
            {[
              { to: "/profile", label: "Profile" },
              { to: "/keys", label: "API keys" },
              ...(user.role === "OWNER" || user.role === "ADMIN"
                ? [{ to: "/admin", label: "Admin" }]
                : []),
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <StarButton size="sm" className="mt-3 w-full" onClick={handleLogout}>
            <LogOut size={14} strokeWidth={1.8} aria-hidden="true" />
            LOG OUT
          </StarButton>
        </div>
      ) : null}
    </div>
  );
}
