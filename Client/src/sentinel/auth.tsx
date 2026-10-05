import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import { api, getToken, setToken } from "./api";

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
    inviteCode?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Turn an API failure into a message that tells the user what actually happened. */
function toAuthError(err: unknown): Error {
  const status = (err as { response?: { status?: number } })?.response?.status;
  const apiMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
  if (status === undefined)
    return new Error("Cannot reach the API. Is the backend running?");
  if (status === 429)
    return new Error("Too many attempts — wait a few minutes and try again.");
  if (status >= 500)
    return new Error("Server error. Try again in a moment.");
  return new Error(apiMsg || "Invalid credentials. Check email and password.");
}

function toSessionUser(data: {
  user: { id: string; email: string; firstName: string; lastName: string; avatarUrl?: string | null; provider?: string | null };
  organization: { id: string; name: string; slug: string };
  role: string;
}): SessionUser {
  return {
    id: data.user.id,
    email: data.user.email,
    firstName: data.user.firstName,
    lastName: data.user.lastName,
    organizationId: data.organization.id,
    organization: data.organization,
    role: data.role,
    avatarUrl: data.user.avatarUrl ?? null,
    provider: data.user.provider ?? null,
  };
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
    try {
      const r = await api.post("/auth/login", { email, password });
      setToken(r.data.data.token as string);
      setUser(toSessionUser(r.data.data));
    } catch (err) {
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
      inviteCode?: string;
    }) => {
      try {
        const r = await api.post("/auth/register", input);
        setToken(r.data.data.token as string);
        setUser(toSessionUser(r.data.data));
      } catch (err) {
        throw toAuthError(err);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
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
