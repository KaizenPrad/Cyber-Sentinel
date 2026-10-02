import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import { api, DEMO_TOKEN, getToken, isDemoMode, setToken } from "./api";
import { DEMO_EMAIL, DEMO_PASSWORD, demoSessionUser } from "./demo";

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  organization: { id: string; name: string; slug: string };
  role: string;
  /** Profile photo URL — null for password auth. Set when OAuth (Google/GitHub/…) is added. */
  avatarUrl?: string | null;
  /** Identity provider that issued the session (e.g. "google") — null for password auth. */
  provider?: string | null;
}

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Turn an API failure into a message that tells the user what actually happened. */
function toAuthError(err: unknown): Error {
  const status = (err as { response?: { status?: number } })?.response?.status;
  const apiMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
  if (status === undefined)
    return new Error("Cannot reach the API. Is the backend running on :5000?");
  if (status === 429)
    return new Error("Too many attempts — wait a few minutes and try again.");
  if (status >= 500)
    return new Error("Server error. Try again in a moment.");
  return new Error(apiMsg || "Invalid credentials. Check email and password.");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    // Offline demo session — no backend call.
    if (token === DEMO_TOKEN) {
      setUser(demoSessionUser);
      setLoading(false);
      return;
    }
    api
      .get("/auth/session")
      .then((r) => setUser(r.data.data as SessionUser))
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Prefer the real backend for every login (including the demo account,
    // which is seeded in the backend DB). Fall back to the offline demo
    // session only when the backend is unreachable, so the UI keeps working
    // with zero backend while showing live data whenever it is running.
    try {
      const r = await api.post("/auth/login", { email, password });
      setToken(r.data.data.token as string);
      setUser({
        id: r.data.data.user.id,
        email: r.data.data.user.email,
        firstName: r.data.data.user.firstName,
        lastName: r.data.data.user.lastName,
        organizationId: r.data.data.organization.id,
        organization: r.data.data.organization,
        role: r.data.data.role,
        avatarUrl: r.data.data.user.avatarUrl ?? null,
        provider: r.data.data.user.provider ?? null,
      });
      return;
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const isDemoCreds =
        email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;
      // Offline fallback: backend down / no network -> local demo session.
      // Wrong credentials against a live backend (401) still surface as error.
      const unreachable = status === undefined || status === 502 || status === 503 || status === 504;
      if (isDemoCreds && unreachable) {
        setToken(DEMO_TOKEN);
        setUser(demoSessionUser);
        return;
      }
      throw toAuthError(err);
    }
  }, []);

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      organizationName: string;
    }) => {
      try {
        const r = await api.post("/auth/register", input);
      setToken(r.data.data.token as string);
      setUser({
        id: r.data.data.user.id,
        email: r.data.data.user.email,
        firstName: r.data.data.user.firstName,
        lastName: r.data.data.user.lastName,
        organizationId: r.data.data.organization.id,
        organization: r.data.data.organization,
        role: r.data.data.role,
        avatarUrl: r.data.data.user.avatarUrl ?? null,
        provider: r.data.data.user.provider ?? null,
      });
    } catch (err) {
      throw toAuthError(err);
    }
  },
    [],
  );

  const logout = useCallback(async () => {
    if (isDemoMode()) {
      // Nothing to tell the backend in demo mode — clear locally.
      setToken(null);
      setUser(null);
      return;
    }
    try {
      await api.post("/auth/logout");
    } catch {
      // Session already gone — clear locally regardless.
    }
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
