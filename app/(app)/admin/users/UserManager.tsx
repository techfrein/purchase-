"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { inputClass } from "@/components/ui";

export default function UserManager(props:
  | { mode: "create"; viewerRole: string }
  | { mode: "row"; userId: number; active: boolean; isSelf: boolean; targetRole: string; viewerRole: string }
) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isOwner = props.viewerRole === "OWNER";

  async function call(url: string, method: string, body: unknown) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Request failed.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Could not reach the server.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (props.mode === "row") {
    const targetPrivileged = props.targetRole === "OWNER" || props.targetRole === "ADMIN";
    // Admins may only manage staff/purchase accounts (and their own).
    const canManage = isOwner || (!targetPrivileged && !props.isSelf) || props.isSelf;
    if (!canManage) {
      return <span className="text-xs text-slate-400">Owner-managed</span>;
    }
    return (
      <div className="flex items-center justify-end gap-2">
        {isOwner && !props.isSelf && (
          <select
            disabled={busy}
            defaultValue={props.targetRole}
            onChange={(e) => {
              const role = e.target.value;
              if (role !== props.targetRole) call(`/api/users/${props.userId}`, "PATCH", { role });
            }}
            className="rounded-md border border-[var(--line)] px-2 py-1 text-xs text-slate-600 disabled:opacity-40"
            title="Change role"
          >
            <option value="OWNER">Owner</option>
            <option value="ADMIN">Administrator</option>
            <option value="STAFF">Staff</option>
            <option value="PURCHASE">Purchase Dept</option>
          </select>
        )}
        <button
          disabled={busy || props.isSelf}
          title={props.isSelf ? "You cannot deactivate your own account" : ""}
          onClick={() => call(`/api/users/${props.userId}`, "PATCH", { active: !props.active })}
          className="rounded-md border border-[var(--line)] px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          {props.active ? "Deactivate" : "Activate"}
        </button>
        <button
          disabled={busy}
          onClick={() => {
            const pw = window.prompt("New password (min 6 characters):");
            if (pw) call(`/api/users/${props.userId}`, "PATCH", { password: pw });
          }}
          className="rounded-md border border-[var(--line)] px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          Reset Password
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());
        const ok = await call("/api/users", "POST", data);
        if (ok) form.reset();
      }}
      className=""
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Full Name *
          <input name="name" required className={inputClass} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Username *
          <input name="username" required pattern="[a-zA-Z0-9._-]{3,30}" className={inputClass} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Password * <span className="font-normal text-slate-400">(min 6 chars)</span>
          <input name="password" type="password" required minLength={6} className={inputClass} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Role *
          <select name="role" defaultValue="PURCHASE" className={inputClass}>
            <option value="PURCHASE">Purchase Department</option>
            <option value="STAFF">Staff</option>
            {isOwner && <option value="ADMIN">Administrator</option>}
            {isOwner && <option value="OWNER">Owner</option>}
          </select>
          {!isOwner && (
            <span className="mt-1 block text-xs font-normal text-slate-400">
              Only the owner can create administrator or owner accounts.
            </span>
          )}
        </label>
      </div>
      {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="btn btn-primary mt-4 px-5 py-2"
      >
        {busy ? "Creating…" : "Create User"}
      </button>
    </form>
  );
}
