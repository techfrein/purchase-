"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconCheck, IconRefresh } from "@/components/icons";
import { inputClass } from "@/components/ui";

export default function PurchaseActions({
  purchaseId,
  status,
  isAdmin,
}: {
  purchaseId: number;
  status: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "check" | "APPROVED" | "REJECTED">("");

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
    if (decision === "REJECTED" && !note.trim()) {
      setError("Add a note explaining the rejection.");
      return;
    }
    setBusy(decision);
    setError("");
    try {
      const res = await fetch(`/api/purchases/${purchaseId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note }),
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

  return (
    <div className="mt-6 border-t border-slate-100 pt-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={recheck}
          disabled={busy !== ""}
          className="btn btn-secondary"
        >
          <IconRefresh className="h-4 w-4" />
          {busy === "check" ? "Checking…" : "Re-check Price"}
        </button>

        {isAdmin && status === "PENDING_REVIEW" && (
          <>
            <button
              onClick={() => decide("APPROVED")}
              disabled={busy !== ""}
              className="btn btn-success"
            >
              <IconCheck className="h-4 w-4" />
              {busy === "APPROVED" ? "Approving…" : "Approve"}
            </button>
            <button
              onClick={() => decide("REJECTED")}
              disabled={busy !== ""}
              className="btn btn-danger"
            >
              {busy === "REJECTED" ? "Rejecting…" : "Reject"}
            </button>
          </>
        )}
      </div>

      {isAdmin && status === "PENDING_REVIEW" && (
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Decision note (required for rejection)…"
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