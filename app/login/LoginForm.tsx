"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type RoleKey = "OWNER" | "STAFF" | "PURCHASE" | "ADMIN";

const ROLES: { key: RoleKey; label: string; emoji: string; bg: string; active: string }[] = [
  { key: "OWNER", label: "Owner", emoji: "👑", bg: "role-honey", active: "role-honey-on" },
  { key: "STAFF", label: "Staff", emoji: "🧑‍⚕️", bg: "role-sage", active: "role-sage-on" },
  { key: "PURCHASE", label: "Purchase", emoji: "🛒", bg: "role-teal", active: "role-teal-on" },
  { key: "ADMIN", label: "Admin", emoji: "🛡️", bg: "role-plum", active: "role-plum-on" },
];

export default function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<RoleKey | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!role) {
      setError("Please pick who you are first.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Login failed.");
          return;
        }
        router.push("/");
        router.refresh();
      } catch {
        setError("Could not reach the server. Try again.");
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--line)] bg-white p-7 sm:p-9">
      <div className="mb-6 text-center">
        <div className="text-3xl font-bold tracking-tight text-slate-900">
          Sign In
        </div>
        <div className="mt-2 text-base text-slate-500">Tap who you are, then enter your details</div>
      </div>

      <div className="mb-7">
        <div className="section-label mb-3">1 · I am the…</div>
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map((r) => {
            const selected = role === r.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => setRole(r.key)}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border py-4 text-base font-semibold transition-colors ${
                  selected
                    ? `border-2 border-[var(--line)] ${r.active} text-slate-900`
                    : `border-[var(--line)] ${r.bg} text-slate-700 hover:brightness-95`
                }`}
              >
                <span className="text-3xl">{r.emoji}</span>
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="section-label mb-1">2 · Enter your details</div>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
          className="input !py-3.5 text-base"
          placeholder="Username"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className="input !py-3.5 text-base"
          placeholder="Password"
        />
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className={`btn btn-primary w-full !py-3.5 text-base ${isPending ? "loading" : ""}`}
        >
          <span className="spinner" />
          <span className="btn-text">{isPending ? "Signing in…" : "Sign In →"}</span>
        </button>
      </form>
    </div>
  );
}