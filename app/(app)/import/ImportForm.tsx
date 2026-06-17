"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconUpload } from "@/components/icons";

type Result = { imported: number; flagged: number; skipped: string[] };

export default function ImportForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed.");
        if (Array.isArray(data.details)) {
          setResult({ imported: 0, flagged: 0, skipped: data.details });
        }
        return;
      }
      setResult(data);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="rounded-lg border-2 border-dashed border-sky-200 bg-sky-50/50 p-6">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full cursor-pointer text-sm text-slate-600 file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-sky-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-sky-600"
        />
        {file && (
          <p className="mt-3 text-sm font-medium text-slate-700">
            Selected: {file.name}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={busy || !file}
        className="btn btn-primary mt-4 px-6 py-2.5"
      >
        <IconUpload className="h-4 w-4" />
        {busy ? "Importing & checking prices…" : "Upload & Verify Prices"}
      </button>
      {busy && (
        <p className="mt-2 text-sm text-slate-500">
          Each row is being checked against online stores — large files can take a few minutes.
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {result && result.imported > 0 && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Imported <strong>{result.imported}</strong> purchase(s).{" "}
          {result.flagged > 0 ? (
            <>
              <strong>{result.flagged}</strong> flagged as overpriced —{" "}
              <a href="/purchases?verdict=BETTER_PRICE_AVAILABLE" className="font-semibold underline">
                review them now
              </a>
              .
            </>
          ) : (
            "No rows were flagged."
          )}
        </div>
      )}
      {result && result.skipped.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="font-semibold">Skipped rows:</div>
          <ul className="mt-1 list-inside list-disc">
            {result.skipped.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}