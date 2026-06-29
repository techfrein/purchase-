"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/ui";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

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
    <div className="card max-w-sm mx-auto p-8">
      <div className="text-center mb-6">
        <div className="font-bold text-2xl tracking-tighter">Sign in</div>
        <div className="text-sm text-slate-500">Purchase Portal</div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
          className={inputClass + " !mt-0"}
          placeholder="Username"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className={inputClass + " !mt-0"}
          placeholder="Password"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button 
          type="submit" 
          disabled={isPending} 
          className={`btn btn-primary w-full mt-2 py-3 text-base ${isPending ? 'loading' : ''}`}
        >
          <span className="spinner" />
          <span className="btn-text">{isPending ? "Signing in…" : "Sign In"}</span>
        </button>
      </form>
    </div>
  );
}