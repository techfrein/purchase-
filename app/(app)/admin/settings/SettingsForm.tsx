"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, FormSection, inputClass } from "@/components/ui";

export default function SettingsForm({
  initial,
  serperConfigured,
}: {
  initial: Record<string, string>;
  serperConfigured: boolean;
}) {
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

        <FormSection title="AI Product Research (New Flow)">
          <label className="label mt-2 block">
            Serper API Key (live pricing)
            <input
              type="password"
              value={values.serper_key}
              onChange={(e) => set("serper_key", e.target.value)}
              placeholder="paste your serper.dev key"
              className={inputClass}
            />
            <span className="mt-1.5 block text-xs font-normal text-slate-500">
              Powers live product <strong>prices</strong> via Google Shopping (serper.dev).<br/>
              <strong>Recommended:</strong> Set <code>SERPER_API_KEY</code> in <code>.env.local</code>.
              A key pasted here is used only when no env var is set.
            </span>
          </label>

          <label className="label mt-5 block">
            Gemini API Key (product images)
            <input
              type="password"
              value={values.gemini_key}
              onChange={(e) => set("gemini_key", e.target.value)}
              placeholder="AIza... paste your Gemini key"
              className={inputClass}
            />
            <span className="mt-1.5 block text-xs font-normal text-slate-500">
              Used to pick the best matching product <strong>image</strong> for each option.<br/>
              <strong>Recommended:</strong> Set <code>GEMINI_KEY</code> in <code>.env.local</code>.
              A key pasted here is used only when no env var is set.
            </span>
          </label>
        </FormSection>

        <FormSection title="Legacy Price Sources (kept for old records)">
          <label className="mt-2 flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={values.catalog_enabled === "1"}
              onChange={(e) => set("catalog_enabled", e.target.checked ? "1" : "0")}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600"
            />
            <span>
              <span className="font-semibold">Internal reference catalog</span>
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