"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, FormSection, inputClass } from "@/components/ui";
export default function PurchaseForm({
  canQuoteVendor,
  categories,
}: {
  canQuoteVendor: boolean;
  categories: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the purchase.");
        setBusy(false);
        return;
      }
      router.push(`/purchases/${data.id}`);
    } catch {
      setError("Could not reach the server. Try again.");
      setBusy(false);
    }
  }

  return (
    <Card elevated className="p-6 sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection title="Product Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="label sm:col-span-2">
              Product Name *
              <input name="productName" required placeholder="e.g. Samsung 43 inch Crystal 4K UHD Smart TV" className={inputClass} />
            </label>
            <label className="label">
              Category *
              <select name="category" required defaultValue="" className={inputClass}>
                <option value="" disabled>Select category…</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="label">
              Brand
              <input name="brand" placeholder="e.g. Samsung" className={inputClass} />
            </label>
            <label className="label">
              Model
              <input name="model" placeholder="e.g. UA43DUE70" className={inputClass} />
            </label>
            <label className="label">
              Specifications
              <input name="specs" placeholder="e.g. 43 inch, 4K UHD, Smart TV" className={inputClass} />
            </label>
            <label className="label">
              Quantity *
              <input name="quantity" type="number" min="1" step="1" defaultValue="1" required className={inputClass} />
            </label>
          </div>
        </FormSection>

        {canQuoteVendor && (
          <>
            <FormSection title="Quoted Price (optional)">
              <p className="mb-3 text-sm text-slate-500">
                Leave blank if you don&apos;t have a vendor quote yet — the request will be saved for manual review.
              </p>
              <label className="label">
                Unit Price (₹)
                <input name="unitPrice" type="number" min="0.01" step="0.01" placeholder="e.g. 31500" className={inputClass} />
              </label>
            </FormSection>

            <FormSection title="Vendor & Invoice (optional)">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="label">
                  Vendor Name
                  <input name="vendorName" placeholder="e.g. Sharma Electronics" className={inputClass} />
                </label>
                <label className="label">
                  Vendor Contact
                  <input name="vendorContact" placeholder="Phone / email" className={inputClass} />
                </label>
                <label className="label">
                  Invoice / Quotation No
                  <input name="invoiceNo" className={inputClass} />
                </label>
                <label className="label">
                  Invoice Date
                  <input name="invoiceDate" type="date" className={inputClass} />
                </label>
              </div>
            </FormSection>
          </>
        )}

        <FormSection title="Additional Notes">
          <label className="label">
            Notes
            <textarea name="notes" rows={2} placeholder="Purpose, department, remarks…" className={inputClass} />
          </label>
        </FormSection>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6">
          <button type="submit" disabled={busy} className="btn btn-primary px-6 py-2.5">
            {busy
              ? canQuoteVendor
                ? "Saving & checking prices…"
                : "Saving request…"
              : canQuoteVendor
                ? "Save & Verify Price"
                : "Submit Request"}
          </button>
          {busy && canQuoteVendor && (
            <span className="text-sm text-slate-500">
              Searching online stores — this can take a few seconds…
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}