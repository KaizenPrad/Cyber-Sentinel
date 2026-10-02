import { useCallback, useEffect, useState } from "react";
import { SectionHeader } from "@/src/components/SectionHeader";
import { useAuth } from "../auth";
import { fetchMembers, updateMemberRole } from "../api";
import type { OrgMember } from "../api";
import { EmptyState, Spinner, inputCls } from "../ui";

const ROLES: OrgMember["role"][] = ["OWNER", "ADMIN", "MEMBER"];

export function AdminPage() {
  const { user: me } = useAuth();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMembers(await fetchMembers());
    } catch {
      setError("Could not load organization members. Is the API reachable?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changeRole = async (id: string, role: OrgMember["role"]) => {
    setBusyId(id);
    setError(null);
    try {
      const updated = await updateMemberRole(id, role);
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role: updated.role } : m)));
    } catch (err) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(apiErr ?? "Could not update role.");
    } finally {
      setBusyId(null);
    }
  };

  const isOwner = me?.role === "OWNER";

  return (
    <div>
      <SectionHeader
        title={["Workspace", "admin."]}
        description="Everyone with access to your organization's signals, detections, and incidents. Owners can change roles."
      />

      {error ? <p className="mt-6 text-base text-[#ffa3a3]">{error}</p> : null}

      <div className="mt-6">
        {loading ? (
          <Spinner label="Loading members" />
        ) : members.length === 0 && !error ? (
          <EmptyState title="No members" body="Invite teammates by having them register — today each registration creates its own workspace." />
        ) : (
          <div className="card-frame overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-base">
                <thead>
                  <tr className="border-b border-white/[0.06] font-mono text-xs tracking-[0.1em] text-white/50">
                    <th className="px-5 py-4">MEMBER</th>
                    <th className="px-5 py-4">EMAIL</th>
                    <th className="px-5 py-4">ROLE</th>
                    <th className="px-5 py-4">LAST LOGIN</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b border-white/[0.06] last:border-0">
                      <td className="px-5 py-4 font-medium text-foreground">
                        {m.firstName} {m.lastName}
                        {m.id === me?.id ? <span className="ml-2 font-mono text-xs text-white/40">(you)</span> : null}
                      </td>
                      <td className="break-id px-5 py-4 font-mono text-[13px] text-white/60">{m.email}</td>
                      <td className="px-5 py-4">
                        {isOwner && m.id !== me?.id ? (
                          <select
                            aria-label={`Role for ${m.email}`}
                            className={`${inputCls} w-auto py-2 text-sm`}
                            value={m.role}
                            disabled={busyId === m.id}
                            onChange={(e) => void changeRole(m.id, e.target.value as OrgMember["role"])}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="font-mono text-[13px] tracking-[0.08em] text-white/70">{m.role}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-[13px] text-white/60">
                        {m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString() : "never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {!isOwner ? (
        <p className="mt-4 text-sm text-white/50">Read-only: only workspace owners can change roles.</p>
      ) : null}
    </div>
  );
}
