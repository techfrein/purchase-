"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function ApprovalActions({ userId }: { userId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "APPROVED" | "REJECTED">("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function decide(decision: "APPROVED" | "REJECTED") {
    if (decision === "REJECTED" && !window.confirm("Reject this account request?")) return;
    setBusy(decision);
    setError("");

    startTransition(async () => {
      try {
        const res = await fetch(`/api/users/${userId}/approval`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Could not record the decision.");
          return;
        }
        router.refresh();
      } catch {
        setError("Could not reach the server.");
      } finally {
        setBusy("");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        onClick={() => decide("APPROVED")}
        disabled={busy !== "" || isPending}
        className={`btn btn-success !px-3 !py-1 !text-xs ${(busy === "APPROVED" || isPending) ? 'loading' : ''}`}
      >
        <span className="spinner" />
        <span className="btn-text">{busy === "APPROVED" ? "Approving…" : "Approve"}</span>
      </button>
      <button
        onClick={() => decide("REJECTED")}
        disabled={busy !== "" || isPending}
        className={`btn btn-secondary !border-red-200 !px-3 !py-1 !text-xs !text-red-600 hover:!bg-red-50 ${(busy === "REJECTED" || isPending) ? 'loading' : ''}`}
      >
        <span className="spinner" />
        <span className="btn-text">{busy === "REJECTED" ? "Rejecting…" : "Reject"}</span>
      </button>
    </div>
  );
}