import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from "react-router-dom";
import { ContentProvider } from "@/src/lib/content";
import { AuthProvider, useAuth } from "@/src/sentinel/auth";
import { SentinelLayout } from "@/src/sentinel/layout";
import { HomePage } from "@/src/sentinel/pages/HomePage";
import { LoginPage, RegisterPage } from "@/src/sentinel/pages/AuthPages";
import { Spinner, EmptyState } from "@/src/sentinel/ui";
import type { JSX } from "react";
import { Suspense, lazy, useEffect } from "react";

// Route-level code splitting: heavy vendors (three / vis-network /
// recharts) only download when their route is visited. This keeps the
// initial mobile bundle small and first paint fast.
const MonitorPage = lazy(() =>
  import("@/src/sentinel/pages/MonitorPage").then((m) => ({ default: m.MonitorPage })),
);
const GraphPage = lazy(() =>
  import("@/src/sentinel/pages/GraphPage").then((m) => ({ default: m.GraphPage })),
);
const DetectionPage = lazy(() =>
  import("@/src/sentinel/pages/DetectionPage").then((m) => ({ default: m.DetectionPage })),
);
const IncidentsPage = lazy(() =>
  import("@/src/sentinel/pages/IncidentsPage").then((m) => ({ default: m.IncidentsPage })),
);
const IncidentDetailPage = lazy(() =>
  import("@/src/sentinel/pages/IncidentDetailPage").then((m) => ({ default: m.IncidentDetailPage })),
);
const ReportPage = lazy(() =>
  import("@/src/sentinel/pages/ReportPage").then((m) => ({ default: m.ReportPage })),
);
const ApiKeysPage = lazy(() =>
  import("@/src/sentinel/pages/ApiKeysPage").then((m) => ({ default: m.ApiKeysPage })),
);
const ProfilePage = lazy(() =>
  import("@/src/sentinel/pages/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);
const AdminPage = lazy(() =>
  import("@/src/sentinel/pages/AdminPage").then((m) => ({ default: m.AdminPage })),
);
const DocsPage = lazy(() =>
  import("@/src/sentinel/pages/DocsPage").then((m) => ({ default: m.DocsPage })),
);

function RouteFallback() {
  return <Spinner label="Loading page" />;
}

/** Reset scroll on every route change (logo → home always lands at the top). */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname ]);
  return null;
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <SentinelLayout>
        <Spinner label="Checking session" />
      </SentinelLayout>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({ roles, children }: { roles: string[]; children: JSX.Element }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <EmptyState title="Admins only" body="This area is limited to workspace owners and admins." />;
  }
  return children;
}

export function App() {
  return (
    <ContentProvider>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <SentinelLayout>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/docs" element={<DocsPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/monitor" element={<RequireAuth><MonitorPage /></RequireAuth>} />
                <Route path="/graph" element={<RequireAuth><GraphPage /></RequireAuth>} />
                <Route path="/detection" element={<RequireAuth><DetectionPage /></RequireAuth>} />
                <Route path="/incidents" element={<RequireAuth><IncidentsPage /></RequireAuth>} />
                <Route path="/incidents/:id" element={<RequireAuth><IncidentDetailPage /></RequireAuth>} />
                <Route path="/report" element={<RequireAuth><ReportPage /></RequireAuth>} />
                <Route path="/keys" element={<RequireAuth><ApiKeysPage /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                <Route path="/admin" element={<RequireAuth><RequireRole roles={["OWNER", "ADMIN"]}><AdminPage /></RequireRole></RequireAuth>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </SentinelLayout>
        </Router>
      </AuthProvider>
    </ContentProvider>
  );
}
