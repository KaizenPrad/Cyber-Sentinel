import axios from "axios";
import {
  demoAddRemediation,
  demoDetection,
  demoDetections,
  demoGraph,
  demoIncident,
  demoIncidents,
  demoPromoteDetection,
  demoReport,
  demoSessionUser,
  demoSignals,
  demoStats,
  demoUpdateIncident,
} from "./demo";

const TOKEN_KEY = "cybersentinel-token";

/** Demo session token — when present, all data below serves local mock data. */
export const DEMO_TOKEN = "cybersentinel-demo-token";

export function isDemoMode(): boolean {
  try {
    return localStorage.getItem(TOKEN_KEY) === DEMO_TOKEN;
  } catch {
    return false;
  }
}

// Same-origin /api via Vite proxy by default; override with VITE_API_URL for production.
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || "";
export const api = axios.create({
  baseURL: API_BASE ? `${API_BASE.replace(/\/$/, "")}/api` : "/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/* ---------- types ---------- */

export interface Paginated<T> {
  success: boolean;
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface Signal {
  id: string;
  signal_type: string;
  category: "NETWORK" | "AUTH" | "ENDPOINT" | "EMAIL" | "WEB";
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  source_ip: string | null;
  user_identity: string | null;
  hostname: string | null;
  domain: string | null;
  raw_data: Record<string, unknown>;
  risk_score: number;
  risk_factors: string[];
  event_timestamp: string;
}

export interface Detection {
  id: string;
  title: string;
  detection_type: "PHISHING" | "MALWARE" | "RANSOMWARE" | "UNAUTH_ACCESS" | "ANOMALY";
  risk_score: number;
  confidence: number | null;
  severity: string;
  explanation: {
    matchedSignals?: string[];
    weights?: Record<string, number>;
    reasoning?: string;
  };
  status: string;
  created_at: string;
  signals_count?: string | number;
  signals?: (Signal & { weight: number })[];
}

export interface Incident {
  id: string;
  title: string;
  description: string | null;
  status: "OPEN" | "INVESTIGATING" | "CONTAINED" | "RESOLVED" | "FALSE_POSITIVE" | "DISMISSED";
  severity: string;
  assignee_id: string | null;
  assignee_email?: string | null;
  detection_id: string | null;
  created_at: string;
  resolved_at: string | null;
  remediation?: Remediation[];
  signals?: (Signal & { weight: number })[];
}

export interface Remediation {
  id: string;
  action: string;
  notes: string | null;
  created_at: string;
}

export interface GraphData {
  nodes: { id: string; type: "user" | "device" | "ip" | "domain"; label: string; risk: number }[];
  edges: { from: string; to: string; label: string }[];
}

export interface Stats {
  totalSignals: number;
  detections24h: number;
  openIncidents: number;
  devices: number;
}

export interface Report {
  range: { start: string; end: string };
  byType: { detection_type: string; c: string }[];
  bySeverity: { severity: string; c: string }[];
  topRiskyUsers: { user_identity: string; avg_risk: number; c: string }[];
  incidents: { status: string; c: string }[];
}

/* ---------- endpoints ---------- */

export async function fetchStats(): Promise<Stats> {
  if (isDemoMode()) return demoStats();
  const r = await api.get("/monitor/stats");
  return r.data.data as Stats;
}

export interface SignalQuery {
  page?: number;
  limit?: number;
  severity?: string;
  category?: string;
  search?: string;
  minRisk?: number;
}

export async function fetchSignals(q: SignalQuery): Promise<Paginated<Signal>> {
  if (isDemoMode()) return demoSignals(q);
  const params: Record<string, string | number> = {
    page: q.page ?? 1,
    limit: q.limit ?? 20,
  };
  if (q.severity) params.severity = q.severity;
  if (q.category) params.category = q.category;
  if (q.search) params.search = q.search;
  if (q.minRisk) params.minRisk = q.minRisk;
  const r = await api.get("/monitor/signals", { params });
  return r.data as Paginated<Signal>;
}

export async function fetchGraph(window: "1h" | "24h" | "7d"): Promise<GraphData> {
  if (isDemoMode()) return demoGraph(window);
  const r = await api.get("/graph", { params: { window } });
  return r.data.data as GraphData;
}

export async function fetchDetections(params?: {
  type?: string;
  severity?: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<Detection>> {
  if (isDemoMode()) return demoDetections(params);
  const clean: Record<string, string | number> = {};
  if (params?.type) clean.type = params.type;
  if (params?.severity) clean.severity = params.severity;
  if (params?.page) clean.page = params.page;
  if (params?.limit) clean.limit = params.limit;
  const r = await api.get("/detections", { params: clean });
  return r.data as Paginated<Detection>;
}

export async function fetchDetection(id: string): Promise<Detection> {
  if (isDemoMode()) return demoDetection(id);
  const r = await api.get(`/detections/${id}`);
  return r.data.data as Detection;
}

export async function promoteDetection(id: string): Promise<Incident> {
  if (isDemoMode()) return demoPromoteDetection(id);
  const r = await api.post(`/detections/${id}/promote`);
  return r.data.data as Incident;
}

export async function fetchIncidents(params?: {
  status?: string;
  severity?: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<Incident>> {
  if (isDemoMode()) return demoIncidents(params);
  const clean: Record<string, string | number> = {};
  if (params?.status) clean.status = params.status;
  if (params?.severity) clean.severity = params.severity;
  if (params?.page) clean.page = params.page;
  if (params?.limit) clean.limit = params.limit;
  const r = await api.get("/incidents", { params: clean });
  return r.data as Paginated<Incident>;
}

export async function fetchIncident(id: string): Promise<Incident> {
  if (isDemoMode()) return demoIncident(id);
  const r = await api.get(`/incidents/${id}`);
  return r.data.data as Incident;
}

export async function updateIncident(
  id: string,
  body: { status?: Incident["status"]; assigneeId?: string | null },
): Promise<Incident> {
  if (isDemoMode()) return demoUpdateIncident(id, body);
  const r = await api.patch(`/incidents/${id}`, body);
  return r.data.data as Incident;
}

export async function addRemediation(
  id: string,
  body: { action: string; notes?: string },
): Promise<Remediation> {
  if (isDemoMode()) return demoAddRemediation(id, body);
  const r = await api.post(`/incidents/${id}/remediation`, body);
  return r.data.data as Remediation;
}

export async function fetchReport(params?: {
  start?: string;
  end?: string;
}): Promise<Report> {
  if (isDemoMode()) return demoReport();
  const clean: Record<string, string> = {};
  if (params?.start) clean.start = params.start;
  if (params?.end) clean.end = params.end;
  const r = await api.get("/reports", { params: clean });
  return r.data.data as Report;
}

/* ---------- API keys ---------- */

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface ApiKeyCreated {
  id: string;
  name: string;
  keyPrefix: string;
  /** Full key — returned ONLY at creation. Save it immediately. */
  key: string;
  organizationId: string;
  expiresAt: string | null;
  createdAt: string;
}

function demoApiKeysError(): Error {
  return new Error("API keys need the live backend — start it and sign in again.");
}

export async function fetchApiKeys(): Promise<ApiKey[]> {
  if (isDemoMode()) throw demoApiKeysError();
  const r = await api.get("/auth/api-keys");
  return r.data.data as ApiKey[];
}

export async function createApiKey(body: {
  name: string;
  expiresInDays?: number;
}): Promise<ApiKeyCreated> {
  if (isDemoMode()) throw demoApiKeysError();
  const r = await api.post("/auth/api-keys", body);
  return r.data.data as ApiKeyCreated;
}

export async function revokeApiKey(id: string): Promise<void> {
  if (isDemoMode()) throw demoApiKeysError();
  await api.delete(`/auth/api-keys/${id}`);
}

/* ---------- organization members (admin) ---------- */

export interface OrgMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  lastLoginAt: string | null;
  createdAt: string;
}

export async function fetchMembers(): Promise<OrgMember[]> {
  if (isDemoMode()) return [{ ...demoSessionUser, firstName: demoSessionUser.firstName, lastName: demoSessionUser.lastName, lastLoginAt: null, createdAt: new Date().toISOString() } as OrgMember];
  const r = await api.get("/auth/members");
  return r.data.data as OrgMember[];
}

export async function updateMemberRole(id: string, role: OrgMember["role"]): Promise<OrgMember> {
  if (isDemoMode()) throw demoApiKeysError();
  const r = await api.patch(`/auth/members/${id}`, { role });
  return r.data.data as OrgMember;
}
