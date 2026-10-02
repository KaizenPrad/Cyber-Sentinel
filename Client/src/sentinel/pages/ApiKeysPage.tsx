import { useCallback, useEffect, useState } from "react";
import { SectionHeader } from "@/src/components/SectionHeader";
import { StarButton } from "@/src/components/StarButton";
import { useAuth } from "../auth";
import { createApiKey, fetchApiKeys, revokeApiKey } from "../api";
import type { ApiKey, ApiKeyCreated } from "../api";
import { EmptyState, Spinner, inputCls, labelCls } from "../ui";

const EXPIRIES = [
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "1 year", value: 365 },
  { label: "Never", value: 0 },
];

function errMsg(err: unknown, fallback: string): string {
  const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
  return apiErr || (err instanceof Error ? err.message : fallback);
}

export function ApiKeysPage() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState(365);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setKeys(await fetchApiKeys());
    } catch (err) {
      setError(errMsg(err, "Could not load API keys."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const canManage = user?.role === "OWNER" || user?.role === "ADMIN";

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const k = await createApiKey({ name: name.trim(), ...(expiry > 0 ? { expiresInDays: expiry } : {}) });
      setCreated(k);
      setName("");
      await load();
    } catch (err) {
      setError(errMsg(err, "Could not create API key."));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await revokeApiKey(id);
      await load();
    } catch (err) {
      setError(errMsg(err, "Could not revoke API key."));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.key);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = created.key;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
  };

  return (
    <div>
      <SectionHeader
        title={["API keys for", "ingestion."]}
        description="Long-lived server-to-server credentials. Your backend sends them as Authorization: Bearer on POST /api/ingest — unlike login tokens, they don't expire every hour."
      />

      {created ? (
        <div className="card-frame mt-10 border-[#00d294]/30 p-6 sm:p-8" role="alert">
          <p className="font-mono text-xs tracking-[0.1em] text-[#00d294]">KEY CREATED — COPY IT NOW, IT WON'T BE SHOWN AGAIN</p>
          <p className="break-id mt-4 rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-sm text-foreground">
            {created.key}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <StarButton size="sm" onClick={() => void copy()}>{copied ? "COPIED ✓" : "COPY KEY"}</StarButton>
            <button
              type="button"
              onClick={() => setCreated(null)}
              className="rounded-full border border-white/10 px-5 py-2 text-sm font-medium text-white/60 hover:text-white"
            >
              I'VE SAVED IT
            </button>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/50">
            Add to your app's <span className="font-mono">.env</span> as{" "}
            <span className="font-mono">SENTINEL_TOKEN={created.key.slice(0, 12)}…</span> with{" "}
            <span className="font-mono">SENTINEL_URL=http://localhost:5000</span>. Full setup in Docs.
          </p>
        </div>
      ) : null}

      {canManage ? (
        <form onSubmit={(e) => void create(e)} className="card-frame mt-6 grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
          <div className="sm:col-span-1">
            <label className={labelCls} htmlFor="key-name">KEY NAME</label>
            <input
              id="key-name"
              className={inputCls}
              required
              maxLength={100}
              placeholder="production-ingest"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="key-expiry">EXPIRES</label>
            <select id="key-expiry" className={inputCls} value={expiry} onChange={(e) => setExpiry(Number(e.target.value))}>
              {EXPIRIES.map((x) => (
                <option key={x.label} value={x.value}>{x.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <StarButton size="sm" type="submit" disabled={busy || !name.trim()} className="w-full">
              {busy ? "CREATING…" : "CREATE KEY"}
            </StarButton>
          </div>
        </form>
      ) : (
        <p className="card-frame mt-6 p-6 text-base text-muted-foreground">
          Only workspace owners and admins can create keys. Ask an admin to issue one for ingestion.
        </p>
      )}

      {error ? <p className="mt-4 text-base text-[#ffa3a3]">{error}</p> : null}

      <div className="mt-6">
        {loading ? (
          <Spinner label="Loading API keys" />
        ) : keys.length === 0 && !error ? (
          <EmptyState title="No API keys" body="Create one above for your backend ingestion service." />
        ) : (
          <div className="card-frame overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-base">
                <thead>
                  <tr className="border-b border-white/[0.06] font-mono text-xs tracking-[0.1em] text-white/50">
                    <th className="px-5 py-4">NAME</th>
                    <th className="px-5 py-4">PREFIX</th>
                    <th className="px-5 py-4">LAST USED</th>
                    <th className="px-5 py-4">EXPIRES</th>
                    <th className="px-5 py-4">STATUS</th>
                    <th className="px-5 py-4"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} className="border-b border-white/[0.06] last:border-0">
                      <td className="px-5 py-4 font-medium text-foreground">{k.name}</td>
                      <td className="break-id px-5 py-4 font-mono text-[13px] text-white/60">{k.key_prefix}…</td>
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-[13px] text-white/60">
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-[13px] text-white/60">
                        {k.expires_at ? new Date(k.expires_at).toLocaleDateString() : "never"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 font-mono text-xs tracking-[0.1em] ${
                            k.revoked_at
                              ? "border-white/15 bg-white/5 text-white/60"
                              : "border-[#00d294]/30 bg-[#00d294]/10 text-[#00d294]"
                          }`}
                        >
                          {k.revoked_at ? "REVOKED" : "ACTIVE"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        {!k.revoked_at && canManage ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void revoke(k.id)}
                            className="text-sm font-medium text-[#ffa3a3] hover:text-white disabled:opacity-30"
                          >
                            REVOKE
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
