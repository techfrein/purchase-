"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, FormSection, inputClass } from "@/components/ui";

export default function SettingsForm({ initial }: { initial: Record<string, string> }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Could not save settings." });
        return;
      }
      setMessage({ type: "ok", text: "Settings saved." });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Could not reach the server." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card elevated className="p-6 sm:p-8">
      <form onSubmit={handleSubmit}>
        <label className="label">
          Hospital Name
          <input
            value={values.hospital_name}
            onChange={(e) => set("hospital_name", e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="label mt-5 block">
          Price Tolerance (%)
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={values.tolerance_pct}
            onChange={(e) => set("tolerance_pct", e.target.value)}
            className={inputClass}
          />
          <span className="mt-1.5 block text-xs font-normal text-slate-500">
            A quoted price up to this much above the best online price is still rated &ldquo;Good Price&rdquo;.
            Anything beyond is flagged as &ldquo;Better Price Available&rdquo;.
          </span>
        </label>

        <FormSection title="Price Data Sources">
          <label className="mt-2 flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={values.scrape_enabled === "1"}
              onChange={(e) => set("scrape_enabled", e.target.checked ? "1" : "0")}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600"
            />
            <span>
              <span className="font-semibold">Direct store search (Amazon.in, Flipkart)</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Best-effort scraping of public search pages. Large stores often block automated
                requests, so results can be intermittent.
              </span>
            </span>
          </label>

          <label className="mt-4 flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={values.catalog_enabled === "1"}
              onChange={(e) => set("catalog_enabled", e.target.checked ? "1" : "0")}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600"
            />
            <span>
              <span className="font-semibold">Internal reference catalog</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Benchmark prices maintained by admins — works offline and guarantees a verdict.
              </span>
            </span>
          </label>

          <label className="label mt-4 block">
            Serper.dev API Key <span className="font-normal text-slate-400">(optional, recommended)</span>
            <input
              type="password"
              value={values.serper_key}
              onChange={(e) => set("serper_key", e.target.value)}
              placeholder="Paste key to enable Google Shopping results"
              className={inputClass}
            />
            <span className="mt-1.5 block text-xs font-normal text-slate-500">
              A Serper.dev key enables reliable live prices from Google Shopping across
              Amazon, Flipkart, Croma and other Indian stores.
            </span>
          </label>
        </FormSection>

        {message && (
          <p
            className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
              message.type === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn btn-primary mt-6 px-6 py-2.5">
          {busy ? "Saving…" : "Save Settings"}
        </button>
      </form>
    </Card>
  );
}