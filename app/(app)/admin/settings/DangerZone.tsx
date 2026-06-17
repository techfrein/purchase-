"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";

const CONFIRM_PHRASE = "DELETE ALL";

/**
 * Owner-only destructive action: permanently delete all purchase requests and
 * their price listings. Guarded by an exact typed confirmation phrase.
 */
export default function DangerZone() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const armed = confirm.trim() === CONFIRM_PHRASE;

  async function clearAll() {
    if (!armed) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/clear-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Could not clear data." });
        return;
      }
      setMessage({ type: "ok", text: `Done — ${data.deleted ?? 0} request(s) deleted.` });
      setConfirm("");
      setOpen(false);
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Could not reach the server." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-6 border-red-200 p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-red-700">Danger Zone</h2>
          <p className="mt-1 text-sm text-slate-600">
            Permanently delete <span className="font-semibold">all purchase requests</span> and their
            online price listings. Users, settings, and the reference catalog are kept. This cannot be undone.
          </p>
        </div>
      </div>

      {!open ? (
        <button
          onClick={() => { setOpen(true); setMessage(null); }}
          className="btn btn-danger mt-5"
        >
          Clear all requests &amp; data
        </button>
      ) : (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50/60 p-4">
          <label className="block text-sm font-medium text-slate-700">
            Type <span className="rounded bg-white px-1.5 py-0.5 font-mono text-red-600">{CONFIRM_PHRASE}</span> to confirm
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              autoFocus
              className="input mt-2"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={clearAll} disabled={!armed || busy} className="btn btn-danger">
              {busy ? "Deleting…" : "Permanently delete everything"}
            </button>
            <button
              onClick={() => { setOpen(false); setConfirm(""); }}
              disabled={busy}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {message && (
        <p
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            message.type === "ok"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}
    </Card>
  );
}
