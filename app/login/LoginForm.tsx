"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, inputClass } from "@/components/ui";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card elevated className="p-6 sm:p-8">
      <form onSubmit={handleSubmit}>
        <label className="label">
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            className={inputClass}
            placeholder="Enter your username"
          />
        </label>
        <label className="label mt-5 block">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className={inputClass}
            placeholder="Enter your password"
          />
        </label>
        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
        <button type="submit" disabled={busy} className="btn btn-primary mt-6 w-full py-2.5">
          {busy ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </Card>
  );
}