import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Reveal } from "@/src/components/Reveal";
import { StarButton } from "@/src/components/StarButton";
import { useAuth } from "../auth";
import { inputCls, labelCls } from "../ui";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/monitor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg py-10">
      <Reveal offset="md" duration={1000}>
        <p className="font-mono text-xs tracking-[0.12em] text-white/50">SOC SIGN IN</p>
        <h1 className="mt-3 font-display text-[34px] leading-[1.02] tracking-tight text-foreground">
          Welcome <span className="text-muted-foreground">back.</span>
        </h1>
      </Reveal>
      <Reveal offset="sm" delay={150} duration={700}>
        <form onSubmit={(e) => void submit(e)} className="card-frame mt-8 space-y-5 p-6 sm:p-8">
          <div>
            <label className={labelCls} htmlFor="login-email">EMAIL</label>
            <input id="login-email" type="email" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="login-pass">PASSWORD</label>
            <div className="relative">
              <input
                id="login-pass"
                type={showPassword ? "text" : "password"}
                required
                className={`${inputCls} pr-12`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-white/50 transition-colors hover:text-white"
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>
          {error ? <p className="text-base text-[#ffa3a3]">{error}</p> : null}
          <StarButton size="md" type="submit" disabled={busy} className="w-full">
            {busy ? "SIGNING IN…" : "SIGN IN"}
          </StarButton>
          <p className="text-center text-base text-muted-foreground">
            No workspace? <Link to="/register" className="text-white underline underline-offset-4">Create one</Link>
          </p>
        </form>
      </Reveal>
    </div>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "", organizationName: "", inviteCode: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const joiningWithCode = form.inviteCode.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        organizationName: form.organizationName,
        inviteCode: joiningWithCode ? form.inviteCode.trim() : undefined,
      });
      navigate("/monitor");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed — email may already be taken, or password too short (min 8).",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg py-10">
      <Reveal offset="md" duration={1000}>
        <p className="font-mono text-xs tracking-[0.12em] text-white/50">CREATE WORKSPACE</p>
        <h1 className="mt-3 font-display text-[34px] leading-[1.02] tracking-tight text-foreground">
          Stand up <span className="text-muted-foreground">your SOC.</span>
        </h1>
      </Reveal>
      <Reveal offset="sm" delay={150} duration={700}>
        <form onSubmit={(e) => void submit(e)} className="card-frame mt-8 space-y-5 p-6 sm:p-8">
          <div>
            <label className={labelCls} htmlFor="reg-org">ORGANIZATION</label>
            <input id="reg-org" required={!joiningWithCode} disabled={joiningWithCode} className={inputCls} value={form.organizationName} onChange={set("organizationName")} placeholder="Acme Corp" />
            {joiningWithCode ? <p className="mt-1 text-sm text-white/50">Not needed — the invite code picks your workspace.</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="reg-first">FIRST NAME</label>
              <input id="reg-first" required className={inputCls} value={form.firstName} onChange={set("firstName")} />
            </div>
            <div>
              <label className={labelCls} htmlFor="reg-last">LAST NAME</label>
              <input id="reg-last" required className={inputCls} value={form.lastName} onChange={set("lastName")} />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="reg-email">EMAIL</label>
            <input id="reg-email" type="email" required className={inputCls} value={form.email} onChange={set("email")} />
          </div>
          <div>
            <label className={labelCls} htmlFor="reg-pass">PASSWORD · MIN 8</label>
            <div className="relative">
              <input
                id="reg-pass"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                className={`${inputCls} pr-12`}
                value={form.password}
                onChange={set("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-white/50 transition-colors hover:text-white"
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="reg-invite">INVITE CODE · OPTIONAL</label>
            <input id="reg-invite" className={inputCls} value={form.inviteCode} onChange={set("inviteCode")} placeholder="CS-XXXXXX — from your admin" autoComplete="off" />
            <p className="mt-1 text-sm text-white/50">Have a code from your admin? Paste it to join their workspace as EMPLOYEE instead of creating a new one.</p>
          </div>
          {error ? <p className="text-base text-[#ffa3a3]">{error}</p> : null}
          <StarButton size="md" type="submit" disabled={busy} className="w-full">
            {busy ? "CREATING…" : joiningWithCode ? "JOIN WORKSPACE" : "CREATE WORKSPACE"}
          </StarButton>
          <p className="text-center text-base text-muted-foreground">
            Have a workspace? <Link to="/login" className="text-white underline underline-offset-4">Sign in</Link>
          </p>
        </form>
      </Reveal>
    </div>
  );
}
