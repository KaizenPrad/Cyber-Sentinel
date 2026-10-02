import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Reveal } from "@/src/components/Reveal";
import { StarButton } from "@/src/components/StarButton";
import { useAuth } from "../auth";
import { DEMO_EMAIL, DEMO_PASSWORD } from "../demo";
import { inputCls, labelCls } from "../ui";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@cybersentinel.local");
  const [password, setPassword] = useState("");
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
            <input id="login-pass" type="password" required className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error ? <p className="text-base text-[#ffa3a3]">{error}</p> : null}
          <StarButton size="md" type="submit" disabled={busy} className="w-full">
            {busy ? "SIGNING IN…" : "SIGN IN"}
          </StarButton>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setEmail(DEMO_EMAIL);
              setPassword(DEMO_PASSWORD);
              setError(null);
            }}
            className="w-full rounded-full border border-dashed border-white/20 px-5 py-2 text-sm text-white/70 transition-colors hover:border-white/40 hover:text-white"
          >
            No backend? Fill demo account
          </button>
          <p className="text-center font-mono text-xs leading-relaxed text-white/40">
            DEMO LOGIN · {DEMO_EMAIL} · {DEMO_PASSWORD}
          </p>
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
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "", organizationName: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(form);
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
            <input id="reg-org" required className={inputCls} value={form.organizationName} onChange={set("organizationName")} placeholder="Acme Corp" />
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
            <input id="reg-pass" type="password" required minLength={8} className={inputCls} value={form.password} onChange={set("password")} />
          </div>
          {error ? <p className="text-base text-[#ffa3a3]">{error}</p> : null}
          <StarButton size="md" type="submit" disabled={busy} className="w-full">
            {busy ? "CREATING…" : "CREATE WORKSPACE"}
          </StarButton>
          <p className="text-center text-base text-muted-foreground">
            Have a workspace? <Link to="/login" className="text-white underline underline-offset-4">Sign in</Link>
          </p>
        </form>
      </Reveal>
    </div>
  );
}
