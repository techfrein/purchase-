"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/ui";
import { IconCheck } from "@/components/icons";

export default function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const data = Object.fromEntries(new FormData(e.currentTarget).entries());
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(body.error ?? "Could not create the account.");
          return;
        }
        setDone(true);
      } catch {
        setError("Could not reach the server. Try again.");
      }
    });
  }

  if (done) {
    return (
      <div className="overflow-hidden rounded-3xl border border-[var(--line)] bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600">
          <IconCheck className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Request submitted</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Your account is awaiting administrator approval. You can sign in once it has been approved.
        </p>
        <button onClick={() => router.push("/login")} className="btn btn-primary mt-6 w-full py-2.5">
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--line)] bg-white p-6 sm:p-8">
      <div className="mb-6 text-center">
        <div className="text-3xl font-bold tracking-tight text-slate-900">
          Create Account
        </div>
        <div className="mt-2 text-base text-slate-500">Request access to the purchase portal</div>
      </div>

      <form onSubmit={handleSubmit}>
        <label className="label">
          Full Name
          <input name="name" required className={inputClass} placeholder="Your full name" />
        </label>
        <label className="label mt-4 block">
          Username
          <input
            name="username"
            required
            pattern="[a-zA-Z0-9._-]{3,30}"
            autoComplete="username"
            className={inputClass}
            placeholder="Choose a username"
          />
        </label>
        <label className="label mt-4 block">
          Department
          <select name="role" defaultValue="STAFF" className={inputClass}>
            <option value="STAFF">Staff</option>
            <option value="PURCHASE">Purchase Department</option>
          </select>
        </label>
        <label className="label mt-4 block">
          Password <span className="font-normal text-slate-400">(min 6 characters)</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className={inputClass}
            placeholder="Create a password"
          />
        </label>
        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className={`btn btn-primary mt-6 w-full py-2.5 ${isPending ? "loading" : ""}`}
        >
          <span className="spinner" />
          <span className="btn-text">{isPending ? "Submitting…" : "Request Account"}</span>
        </button>
        <p className="mt-4 text-center text-xs text-slate-400">
          New accounts require administrator approval before first sign-in.
        </p>
      </form>
    </div>
  );
}