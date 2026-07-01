"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/ui";
import { inr } from "@/lib/format";

export default function RequestReviewPanel({
  requestId,
  currentStatus,
  isOwner,
  isAdmin,
}: {
  requestId: number;
  currentStatus: string;
  isOwner: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [purchaserId, setPurchaserId] = useState("");
  const [recipientIds, setRecipientIds] = useState<number[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [options, setOptions] = useState<any[]>([]);
  const [chosenOption, setChosenOption] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      try {
        const [uRes, rRes] = await Promise.all([
          fetch("/api/purchase-requests/support"),
          fetch(`/api/purchase-requests/${requestId}`), // may not exist, fallback
        ]);
        if (uRes.ok) {
          const uj = await uRes.json();
          setAllUsers(uj.users || []);
        }
        // Best effort: load current request to get options for owner picker
        const reqRes = await fetch("/api/purchase-requests?limit=1"); // cheap list
      } catch {}
    })();
  }, [requestId]);

  // For owner we fetch the specific request client-side
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/purchase-requests/${requestId}/data`);
        if (res.ok) {
          const d = await res.json();
          const opts = d.request?.selected_options || [];
          setOptions(opts);
          if (opts.length > 0 && !chosenOption) setChosenOption(opts[0]); // default first
        }
      } catch {}
      try {
        const u = await fetch("/api/purchase-requests/support");
        if (u.ok) {
          const uj = await u.json();
          setAllUsers(uj.users || []);
        }
      } catch {}
    }
    if (isOwner) load();
  }, [isOwner, requestId]);

  function act(action: string, extra?: any) {
    setBusy(action);
    setError("");

    startTransition(async () => {
      try {
        const payload: any = { action, note: note.trim(), ...extra };
        const res = await fetch(`/api/purchase-requests/${requestId}/decide`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        router.refresh();
      } catch (e: any) {
        setError(e.message);
      } finally {
        setBusy("");
      }
    });
  }

  if (currentStatus === "PENDING_ADMIN" && isAdmin) {
    return (
      <div className="overflow-hidden rounded-3xl border border-[var(--line)] bg-white p-6">
        <div className="font-semibold text-lg">Admin Action</div>
        <p className="text-sm text-slate-500 mb-3">Forward to Owner or reject the request.</p>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note or recommendation..." className={inputClass} rows={2} />
        <div className="flex gap-3 mt-4">
          <button 
            onClick={() => act("ADMIN_APPROVE")} 
            disabled={!!busy || isPending} 
            className={`btn btn-primary flex-1 ${ (busy === "ADMIN_APPROVE" || isPending) ? 'loading' : '' }`}
          >
            <span className="spinner" />
            <span className="btn-text">Approve &amp; Send to Owner</span>
          </button>
          <button 
            onClick={() => act("ADMIN_REJECT")} 
            disabled={!!busy || isPending} 
            className={`btn btn-secondary flex-1 text-red-600 border-red-200 ${busy === "ADMIN_REJECT" ? 'loading' : ''}`}
          >
            <span className="spinner" />
            <span className="btn-text">Deny</span>
          </button>
        </div>
        {error && <div className="text-red-600 mt-3 text-sm">{error}</div>}
      </div>
    );
  }

  if (isOwner && (currentStatus === "PENDING_OWNER" || currentStatus === "PENDING_ADMIN")) {
    return (
      <div className="overflow-hidden rounded-3xl border border-[var(--line)] bg-white p-6">
        <div className="font-semibold text-xl tracking-tight">Final Approval</div>
        <p className="text-sm text-slate-500 mt-1">Choose the winning option, assign purchaser, and decide who gets the PDF.</p>

        <div className="mt-5">
          <div className="text-xs font-semibold mb-2 text-slate-500">CHOOSE THE APPROVED OPTION</div>
          <div className="grid gap-2">
            {options.length === 0 && <div className="text-sm text-amber-600">Loading options…</div>}
            {options.map((o: any, i: number) => (
              <button key={i} onClick={() => setChosenOption(o)} className={`flex w-full justify-between rounded-xl border p-3 text-left text-sm transition ${chosenOption === o ? "border-2 border-[var(--line)] bg-slate-50" : "border-[var(--line)] hover:bg-slate-50"}`}>
                <span>{o.title}</span>
                <span className="font-semibold">{inr(o.price)} · {o.source}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">WHO WILL PURCHASE &amp; ACQUIRE? *</label>
            <select value={purchaserId} onChange={e => setPurchaserId(e.target.value)} className={inputClass}>
              <option value="">Select user…</option>
              {allUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">SEND PDF TO (user IDs, comma separated)</label>
            <input value={recipientIds.join(",")} onChange={e => setRecipientIds(e.target.value.split(",").map(Number).filter(Boolean))} className={inputClass} placeholder="e.g. 3,5" />
          </div>
        </div>

        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Owner note (optional)" className={`${inputClass} mt-4`} />

        <button
          onClick={() => {
            if (!chosenOption) return setError("Pick an option");
            if (!purchaserId) return setError("Choose purchaser");
            act("OWNER_APPROVE", { chosenOption, purchaserId: Number(purchaserId), recipientIds });
          }}
          disabled={!!busy || isPending || !chosenOption || !purchaserId}
          className={`mt-5 w-full btn btn-primary text-base py-3.5 ${ (busy === "OWNER_APPROVE" || isPending) ? 'loading' : '' }`}
        >
          <span className="spinner" />
          <span className="btn-text">
            {busy === "OWNER_APPROVE" ? "Creating ticket..." : "Approve Selected Option & Create Ticket"}
          </span>
        </button>

        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  return null;
}

