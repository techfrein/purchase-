"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconCheck, IconRefresh } from "@/components/icons";
import { inputClass } from "@/components/ui";
import { inr } from "@/lib/format";

type Listing = { source: string; title: string; price: number; url: string | null };

export default function PurchaseActions({
  purchaseId,
  status,
  isAdmin,
  isOwner,
  checkedAt,
  listings = [],
}: {
  purchaseId: number;
  status: string;
  isAdmin: boolean;
  isOwner: boolean;
  checkedAt: string | null;
  listings?: Listing[];
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "check" | "APPROVED" | "REJECTED">("");
  // Index of the chosen benchmark listing, or null for none.
  const [chosen, setChosen] = useState<number | null>(null);

  async function recheck() {
    setBusy("check");
    setError("");
    try {
      const res = await fetch(`/api/purchases/${purchaseId}/check`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Price check failed.");
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy("");
    }
  }

  async function decide(decision: "APPROVED" | "REJECTED") {
    setBusy(decision);
    setError("");
    try {
      const approvedListing =
        decision === "APPROVED" && chosen != null ? listings[chosen] : null;
      const res = await fetch(`/api/purchases/${purchaseId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note, approvedListing }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not record the decision.");
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy("");
    }
  }

  const canDecide = isAdmin && status === "PENDING_REVIEW";
  // Only the owner gets the benchmark picker (admins approve plainly).
  const showPicker = canDecide && isOwner && listings.length > 0;

  return (
    <div className="mt-6 border-t border-[var(--line)] pt-5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={recheck} disabled={busy !== ""} className="btn btn-secondary">
          <IconRefresh className="h-4 w-4" />
          {busy === "check" ? "Checking…" : checkedAt ? "Re-check Price" : "Check Online Price"}
        </button>

        {canDecide && (
          <>
            <button onClick={() => decide("APPROVED")} disabled={busy !== ""} className="btn btn-success">
              <IconCheck className="h-4 w-4" />
              {busy === "APPROVED"
                ? "Approving…"
                : chosen != null
                  ? "Approve at benchmark"
                  : "Approve"}
            </button>
            <button onClick={() => decide("REJECTED")} disabled={busy !== ""} className="btn btn-danger">
              {busy === "REJECTED" ? "Rejecting…" : "Reject"}
            </button>
          </>
        )}
      </div>

      {showPicker && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Approve against an online price <span className="font-normal normal-case text-slate-400">(optional)</span>
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setChosen(null)}
              className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                chosen == null
                  ? "border-primary bg-primary-light"
                  : "border-[var(--line)] hover:border-[var(--line)]"
              }`}
            >
              <span className="font-semibold text-slate-800">No benchmark</span>
              <span className="mt-0.5 block text-xs text-slate-500">Approve at the vendor&apos;s quoted price</span>
            </button>
            {listings.slice(0, 7).map((l, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setChosen(i)}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  chosen === i ? "border-primary bg-primary-light" : "border-[var(--line)] hover:border-[var(--line)]"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">{l.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{l.source}</span>
                </span>
                <span className="shrink-0 font-bold text-slate-900">{inr(l.price)}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            The vendor&apos;s quoted price is kept unchanged — the selected listing is recorded as the
            approval benchmark.
          </p>
        </div>
      )}

      {canDecide && (
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Decision note (optional)…"
          className={`${inputClass} mt-4`}
        />
      )}
      {!isAdmin && status === "PENDING_REVIEW" && (
        <p className="mt-3 text-xs text-slate-500">
          Awaiting administrator approval. Only admins can approve or reject purchases.
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
