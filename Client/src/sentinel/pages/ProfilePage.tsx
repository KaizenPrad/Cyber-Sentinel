import { Link, useNavigate } from "react-router-dom";
import { SectionHeader } from "@/src/components/SectionHeader";
import { StarButton } from "@/src/components/StarButton";
import { useAuth } from "../auth";
import { UserAvatar, getDisplayName } from "../UserMenu";

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    void logout().then(() => navigate("/login"));
  };

  return (
    <div>
      <SectionHeader
        title={["Your", "profile."]}
        description="Identity and workspace this session is signed into."
      />

      <div className="card-frame mt-10 flex flex-wrap items-center gap-5 p-6 sm:p-8">
        <UserAvatar user={user} className="size-14 text-lg" />
        <div className="min-w-0">
          <p className="font-display text-2xl text-foreground">{getDisplayName(user)}</p>
          <p className="break-id mt-1 font-mono text-sm text-white/60">{user.email}</p>
        </div>
        <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-xs tracking-[0.1em] text-white/70">
          {user.role}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card-frame p-6 sm:p-8">
          <p className="font-mono text-xs tracking-[0.1em] text-white/50">ACCOUNT</p>
          <dl className="tnum mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-white/50">USER ID</dt>
              <dd className="break-id text-right font-mono text-[13px] text-white/80">{user.id.slice(0, 8)}…</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/50">SIGN-IN METHOD</dt>
              <dd className="text-white/80">{user.provider === "demo" ? "Demo session" : "Password"}</dd>
            </div>
          </dl>
        </div>
        <div className="card-frame p-6 sm:p-8">
          <p className="font-mono text-xs tracking-[0.1em] text-white/50">WORKSPACE</p>
          <dl className="tnum mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-white/50">ORGANIZATION</dt>
              <dd className="text-right text-white/80">{user.organization?.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/50">SLUG</dt>
              <dd className="break-id text-right font-mono text-[13px] text-white/80">{user.organization?.slug}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/keys"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/25 bg-white/[0.06] px-5 py-2 text-base text-foreground backdrop-blur-md transition-colors hover:bg-white/[0.1]"
        >
          Manage API keys
        </Link>
        <StarButton size="sm" onClick={handleLogout}>
          LOG OUT
        </StarButton>
      </div>
    </div>
  );
}
