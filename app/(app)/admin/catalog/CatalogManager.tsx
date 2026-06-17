"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/ui";

export default function CatalogManager(
  props: ({ mode: "create"; categories: string[] } | { mode: "delete"; entryId: number })
) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (props.mode === "delete") {
    return (
      <button
        disabled={busy}
        onClick={async () => {
          if (!window.confirm("Delete this reference price?")) return;
          setBusy(true);
          await fetch(`/api/catalog/${props.entryId}`, { method: "DELETE" });
          setBusy(false);
          router.refresh();
        }}
        className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
      >
        Delete
      </button>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setBusy(true);
        setError("");
        try {
          const res = await fetch("/api/catalog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError(data.error ?? "Could not add the entry.");
            return;
          }
          form.reset();
          router.refresh();
        } catch {
          setError("Could not reach the server.");
        } finally {
          setBusy(false);
        }
      }}
      className=""
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          Product Name *
          <input name="productName" required className={inputClass} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Category *
          <select name="category" required defaultValue="Other" className={inputClass}>
            {props.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Brand
          <input name="brand" className={inputClass} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Model
          <input name="model" className={inputClass} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Verified Price (₹) *
          <input name="price" type="number" min="0.01" step="0.01" required className={inputClass} />
        </label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          Source <span className="font-normal text-slate-400">(where this price was verified)</span>
          <input name="source" placeholder="e.g. Amazon.in, GeM portal, dealer quote" className={inputClass} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          URL
          <input name="url" type="url" placeholder="https://…" className={inputClass} />
        </label>
      </div>
      {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="btn btn-primary mt-4 px-5 py-2"
      >
        {busy ? "Adding…" : "Add Entry"}
      </button>
    </form>
  );
}
