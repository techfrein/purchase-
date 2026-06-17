"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormSection, inputClass } from "@/components/ui";

export default function CategoryManager({ initial }: { initial: string[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState(initial);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not add category.");
        return;
      }
      setCategories(data.categories ?? categories);
      setName("");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormSection title="Purchase Categories">
      <p className="mb-3 text-sm text-slate-500">
        Categories appear in purchase request forms and the reference catalog.
      </p>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <span
            key={c}
            className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800"
          >
            {c}
          </span>
        ))}
      </div>
      <form onSubmit={handleAdd} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[12rem] flex-1 text-sm font-medium text-slate-700">
          New category
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Laboratory Equipment"
            required
            className={inputClass}
          />
        </label>
        <button type="submit" disabled={busy} className="btn btn-secondary">
          {busy ? "Adding…" : "Add Category"}
        </button>
      </form>
      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
    </FormSection>
  );
}