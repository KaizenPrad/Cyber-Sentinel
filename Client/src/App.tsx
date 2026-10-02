import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from "react-router-dom";
import { ContentProvider } from "@/src/lib/content";
import { AuthProvider, useAuth } from "@/src/sentinel/auth";
import { SentinelLayout } from "@/src/sentinel/layout";
import { HomePage } from "@/src/sentinel/pages/HomePage";
import { MonitorPage } from "@/src/sentinel/pages/MonitorPage";
import { GraphPage } from "@/src/sentinel/pages/GraphPage";
import { DetectionPage } from "@/src/sentinel/pages/DetectionPage";
import { IncidentsPage } from "@/src/sentinel/pages/IncidentsPage";
import { IncidentDetailPage } from "@/src/sentinel/pages/IncidentDetailPage";
import { ReportPage } from "@/src/sentinel/pages/ReportPage";
import { LoginPage, RegisterPage } from "@/src/sentinel/pages/AuthPages";
import { ApiKeysPage } from "@/src/sentinel/pages/ApiKeysPage";
import { ProfilePage } from "@/src/sentinel/pages/ProfilePage";
import { AdminPage } from "@/src/sentinel/pages/AdminPage";
import { DocsPage } from "@/src/sentinel/pages/DocsPage";
import { Spinner, EmptyState } from "@/src/sentinel/ui";
import type { JSX } from "react";
import { useEffect } from "react";

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
          </SentinelLayout>
        </Router>
      </AuthProvider>
    </ContentProvider>
  );
}
