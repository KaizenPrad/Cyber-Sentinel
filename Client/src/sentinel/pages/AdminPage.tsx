import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SectionHeader } from "@/src/components/SectionHeader";
import { StarButton } from "@/src/components/StarButton";
import { useAuth } from "../auth";
import { createMember, fetchActivity, fetchInviteCode, fetchMembers, rotateInviteCode, updateMemberRole } from "../api";
import type { NewOrgMember, OrgActivity, OrgMember, OrgRole } from "../api";
import { EmptyState, Spinner, inputCls, labelCls } from "../ui";

/** Legacy "MEMBER" rows read as the employee role everywhere in the UI. */
const displayRole = (role: OrgRole): string => (role === "MEMBER" ? "EMPLOYEE" : role);

/** What the signed-in manager may assign. OWNERs can grant anything; ADMINs add ADMINs + employees. */
const assignableRoles = (callerRole?: string): NewOrgMember["role"][] =>
  callerRole === "OWNER" ? ["OWNER", "ADMIN", "EMPLOYEE"] : ["ADMIN", "EMPLOYEE"];

const EDIT_ROLES: OrgRole[] = ["OWNER", "ADMIN", "EMPLOYEE"];

function normalize(m: OrgMember): OrgMember {
  return { ...m, role: m.role === "MEMBER" ? "EMPLOYEE" : m.role };
}

function fmtDate(iso: string | null): string {
  if (!iso) return "never";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function AdminPage() {
  const { user: me } = useAuth();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [activity, setActivity] = useState<OrgActivity | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", role: "EMPLOYEE" as NewOrgMember["role"] });
  const [adding, setAdding] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ms, act, inv] = await Promise.all([fetchMembers(), fetchActivity(), fetchInviteCode()]);
      setMembers(ms.map(normalize));
      setActivity(act);
      setInviteCode(inv.inviteCode);
    } catch {
      setError("Could not load organization data. Is the API reachable?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changeRole = async (id: string, role: OrgRole) => {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateMemberRole(id, role);
      setMembers((prev) => prev.map((m) => (m.id === id ? normalize(updated) : m)));
      setNotice(`Role updated to ${displayRole(normalize(updated).role)}.`);
    } catch (err) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(apiErr ?? "Could not update role.");
    } finally {
      setBusyId(null);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    setNotice(null);
    try {
      const createdMember = normalize(await createMember(form));
      setMembers((prev) => [...prev, createdMember]);
      setForm({ firstName: "", lastName: "", email: "", password: "", role: "EMPLOYEE" });
      setNotice(`${createdMember.email} added to ${me?.organization?.name ?? "your organization"} as ${displayRole(createdMember.role)}. They can now log in.`);
    } catch (err) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(apiErr ?? "Could not add member.");
    } finally {
      setAdding(false);
    }
  };

  const rotate = async () => {
    setRotating(true);
    setError(null);
    setNotice(null);
    try {
      const inv = await rotateInviteCode();
      setInviteCode(inv.inviteCode);
      setNotice("Invite code rotated. The old code no longer works — share the new one.");
    } catch (err) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(apiErr ?? "Could not rotate invite code.");
    } finally {
      setRotating(false);
    }
  };

  const copyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy — select the code manually.");
    }
  };

  const canManage = me?.role === "OWNER" || me?.role === "ADMIN";
  const isOwner = me?.role === "OWNER";

  /** Can the signed-in manager edit this row's role? */
  const editable = (m: OrgMember): boolean => {
    if (m.id === me?.id) return false;
    if (isOwner) return true;
    if (me?.role === "ADMIN" && (m.role === "EMPLOYEE" || m.role === "MEMBER")) return true;
    return false;
  };

  const roleOptionsFor = (m: OrgMember): OrgRole[] => {
    void m;
    if (isOwner) return EDIT_ROLES;
    return ["EMPLOYEE"];
  };

  return (
    <div>
      <SectionHeader
        title={["Workspace", "admin."]}
        description={`Full control of ${me?.organization?.name ?? "your organization"} — signed in as ${me?.email ?? ""} (${displayRole((me?.role ?? "EMPLOYEE") as OrgRole)}). Invite employees, set every member's role, and watch all workspace activity below. Employees only ever see this workspace.`}
      />

      {error ? <p className="mt-6 text-base text-[#ffa3a3]">{error}</p> : null}
      {notice ? <p className="mt-6 text-base text-[#00d294]">{notice}</p> : null}

      {loading ? (
        <div className="mt-6"><Spinner label="Loading workspace" /></div>
      ) : (
        <>
          {/* ---- INVITE CARD: admin calls employees to join ---- */}
          {canManage ? (
            <div className="card-frame mt-6 p-6 sm:p-8">
              <p className="font-mono text-xs tracking-[0.1em] text-white/50">INVITE EMPLOYEES TO JOIN</p>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                <code className="break-id rounded-xl border border-white/15 bg-[#07090c] px-5 py-3 font-mono text-xl tracking-[0.15em] text-foreground">
                  {inviteCode ?? "—"}
                </code>
                <div className="flex gap-2">
                  <StarButton size="md" type="button" onClick={() => void copyCode()} disabled={!inviteCode}>
                    {copied ? "COPIED ✓" : "COPY CODE"}
                  </StarButton>
                  <button
                    type="button"
                    onClick={() => void rotate()}
                    disabled={rotating}
                    className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                  >
                    {rotating ? "ROTATING…" : "ROTATE"}
                  </button>
                </div>
              </div>
              <ol className="mt-4 list-decimal space-y-1 pl-5 text-base text-muted-foreground">
                <li>Share this code with your employee (chat, email, or SMS).</li>
                <li>They open <span className="text-white">Register</span>, fill their details, and paste the code in <span className="text-white">INVITE CODE</span>.</li>
                <li>They land straight inside <span className="text-white">{me?.organization?.name ?? "this workspace"}</span> as EMPLOYEE — no new workspace is created.</li>
              </ol>
            </div>
          ) : null}

          {/* ---- DIRECT ADD ---- */}
          {canManage ? (
            <form onSubmit={(e) => void add(e)} className="card-frame mt-6 space-y-4 p-6 sm:p-8">
              <p className="font-mono text-xs tracking-[0.1em] text-white/50">ADD EMPLOYEE DIRECTLY (NO CODE NEEDED)</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls} htmlFor="mem-first">FIRST NAME</label>
                  <input id="mem-first" required className={inputCls} value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="mem-last">LAST NAME</label>
                  <input id="mem-last" required className={inputCls} value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls} htmlFor="mem-email">EMAIL (LOGIN)</label>
                  <input id="mem-email" type="email" required className={inputCls} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="analyst@company.com" />
                </div>
                <div>
                  <label className={labelCls} htmlFor="mem-pass">INITIAL PASSWORD · MIN 8</label>
                  <input id="mem-pass" type="password" required minLength={8} className={inputCls} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="mem-role">ROLE</label>
                <select
                  id="mem-role"
                  className={`${inputCls} w-auto`}
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as NewOrgMember["role"] }))}
                >
                  {assignableRoles(me?.role).map((r) => (
                    <option key={r} value={r}>{r === "MEMBER" ? "EMPLOYEE" : r}</option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-white/50">
                  EMPLOYEE = analyst access (monitor, detections, incidents). ADMIN = full control like you. OWNER = highest control.
                </p>
              </div>
              <StarButton size="md" type="submit" disabled={adding} className="w-full sm:w-auto">
                {adding ? "ADDING…" : "ADD TO ORGANIZATION"}
              </StarButton>
            </form>
          ) : null}

          {/* ---- MEMBERS: details + role dropdown on the right of EVERY row ---- */}
          <div className="mt-6">
            <p className="font-mono text-xs tracking-[0.1em] text-white/50">MEMBERS · {members.length}</p>
            {members.length === 0 && !error ? (
              <div className="mt-3">
                <EmptyState title="No members yet" body="Invite with the code above or add your first employee directly — they will log in into this organization." />
              </div>
            ) : (
              <div className="card-frame mt-3 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-base">
                    <thead>
                      <tr className="border-b border-white/[0.06] font-mono text-xs tracking-[0.1em] text-white/50">
                        <th className="px-5 py-4">MEMBER DETAILS</th>
                        <th className="px-5 py-4">EMAIL</th>
                        <th className="px-5 py-4">LAST LOGIN</th>
                        <th className="px-5 py-4 text-right">ROLE ▾</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr key={m.id} className="border-b border-white/[0.06] last:border-0">
                          <td className="px-5 py-4">
                            <p className="font-medium text-foreground">
                              {m.firstName} {m.lastName}
                              {m.id === me?.id ? <span className="ml-2 font-mono text-xs text-white/40">(you)</span> : null}
                            </p>
                            <p className="mt-0.5 font-mono text-xs text-white/40">joined {fmtDate(m.createdAt)}</p>
                          </td>
                          <td className="break-id px-5 py-4 font-mono text-[13px] text-white/60">{m.email}</td>
                          <td className="whitespace-nowrap px-5 py-4 font-mono text-[13px] text-white/60">
                            {fmtDate(m.lastLoginAt)}
                          </td>
                          <td className="px-5 py-4 text-right">
                            {editable(m) ? (
                              <select
                                aria-label={`Role for ${m.email}`}
                                className={`${inputCls} w-auto py-2 text-sm`}
                                value={m.role}
                                disabled={busyId === m.id}
                                onChange={(e) => void changeRole(m.id, e.target.value as OrgRole)}
                              >
                                {roleOptionsFor(m).map((r) => (
                                  <option key={r} value={r}>{displayRole(r)}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="inline-block rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 font-mono text-[13px] tracking-[0.08em] text-white/70">
                                {displayRole(m.role)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ---- ACTIVITY: admin sees every change in the workspace ---- */}
          <div className="mt-6">
            <p className="font-mono text-xs tracking-[0.1em] text-white/50">WORKSPACE ACTIVITY · WHAT CHANGED</p>
            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="card-frame p-6">
                <p className="font-mono text-xs tracking-[0.1em] text-white/50">LATEST INCIDENTS</p>
                {!activity || activity.incidents.length === 0 ? (
                  <p className="mt-3 text-sm text-white/50">No incidents yet in this workspace.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {activity.incidents.map((i) => (
                      <li key={i.id} className="border-b border-white/[0.06] pb-3 last:border-0 last:pb-0">
                        <Link to={`/incidents/${i.id}`} className="text-base text-foreground underline-offset-4 hover:underline">
                          {i.title}
                        </Link>
                        <p className="mt-1 font-mono text-xs text-white/50">
                          {i.severity} · {i.status} · {fmtDate(i.created_at)}
                          {i.assignee_email ? ` · → ${i.assignee_email}` : " · unassigned"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="card-frame p-6">
                <p className="font-mono text-xs tracking-[0.1em] text-white/50">LATEST EMPLOYEE ACTIONS</p>
                {!activity || activity.remediations.length === 0 ? (
                  <p className="mt-3 text-sm text-white/50">No remediation actions logged yet.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {activity.remediations.map((r) => (
                      <li key={r.id} className="border-b border-white/[0.06] pb-3 last:border-0 last:pb-0">
                        <p className="text-base text-foreground">{r.action}</p>
                        <p className="mt-1 font-mono text-xs text-white/50">
                          {r.author_email} · on “{r.incident_title}” · {fmtDate(r.created_at)}
                        </p>
                        {r.notes ? <p className="mt-1 text-sm text-white/60">{r.notes}</p> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {!canManage ? (
            <p className="mt-4 text-sm text-white/50">Read-only: only workspace owners and admins manage roles.</p>
          ) : null}
        </>
      )}
    </div>
  );
}
