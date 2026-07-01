"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconCheck } from "@/components/icons";

/**
 * Inline approve / reject / delete for a single purchase row, so the owner
 * and admins can clear the queue without opening each request.
 *
 * - Approve / Reject: Owner + Admin, only while PENDING_REVIEW.
 * - Delete: Owner only, always available, with a confirm step.
 */
export default function RowActions({
  purchaseId,
  refNo,
  status,
  canDecide,
  canDelete,
}: {
  purchaseId: number;
  refNo: string;
  status: string;
  canDecide: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "APPROVED" | "REJECTED" | "delete">("");
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState("");

  const pending = status === "PENDING_REVIEW";

  async function decide(decision: "APPROVED" | "REJECTED") {
    setBusy(decision);
    setErr("");
    try {
      const res = await fetch(`/api/purchases/${purchaseId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error ?? "Failed");
      } else {
        router.refresh();
      }
    } catch {
      setErr("Network error");
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    setBusy("delete");
    setErr("");
    try {
      const res = await fetch(`/api/purchases/${purchaseId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error ?? "Failed");
      } else {
        router.refresh();
      }
    } catch {
      setErr("Network error");
    } finally {
      setBusy("");
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <span className="hidden text-xs text-slate-500 sm:inline">Delete {refNo}?</span>
        <button
          onClick={remove}
          disabled={busy !== ""}
          className="rounded-lg bg-red-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
        >
          {busy === "delete" ? "…" : "Yes"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={busy !== ""}
          className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {canDecide && pending && (
        <>
          <button
            onClick={() => decide("APPROVED")}
            disabled={busy !== ""}
            title="Approve"
            aria-label={`Approve ${refNo}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-40"
          >
            {busy === "APPROVED" ? <Spinner /> : <IconCheck className="h-4 w-4" />}
          </button>
          <button
            onClick={() => decide("REJECTED")}
            disabled={busy !== ""}
            title="Reject"
            aria-label={`Reject ${refNo}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 transition hover:bg-red-100 disabled:opacity-40"
          >
            {busy === "REJECTED" ? <Spinner /> : <XIcon />}
          </button>
        </>
      )}
      {canDelete && (
        <button
          onClick={() => setConfirming(true)}
          disabled={busy !== ""}
          title="Delete"
          aria-label={`Delete ${refNo}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-red-500 disabled:opacity-40"
        >
          <TrashIcon />
        </button>
      )}
      {err && <span className="text-xs text-red-500">{err}</span>}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}
