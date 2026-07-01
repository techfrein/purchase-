"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActivityList, ActivityRow, Card, inputClass } from "@/components/ui";
import { VEGETABLES, Vegetable } from "@/lib/vegetables";

export default function VegetablesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Vegetable | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("kg");
  const [reason, setReason] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredVeg = VEGETABLES.filter((v) =>
    [v.official, ...v.aliases]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  async function fetchPrice() {
    if (!selected) return;
    setLoading(true);
    setError("");
    setOptions([]);

    try {
      const res = await fetch("/api/purchase-requests/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heading: selected.official,
          quantity,
          unit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setOptions(data.options || []);
    } catch (e: any) {
      setError(e.message || "Could not fetch eNAM price");
    } finally {
      setLoading(false);
    }
  }

  async function submitRequest(selectedOpt: any) {
    if (!selected || !reason.trim()) {
      setError("Please provide a reason for the request.");
      return;
    }

    setSubmitting(true);
    setError("");

    const chosen = [{
      title: selectedOpt.title,
      source: selectedOpt.source,
      price: selectedOpt.price,
      url: selectedOpt.url,
      selection_reason: "Official eNAM mandi price",
    }];

    try {
      const res = await fetch("/api/purchase-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productHeading: selected.official,
          quantity,
          unit,
          reason: reason.trim(),
          selectedOptions: chosen,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      router.push(`/purchases/${data.id}?type=request`);
    } catch (e: any) {
      setError(e.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Vegetables</h1>
        <p className="mt-2 text-base text-slate-500">
          Official eNAM mandi wholesale prices for bulk vegetable purchases. Select the vegetable, enter quantity, and get the current mandi rate.
        </p>
      </div>

      <Card className="mb-6 p-6">
        <div className="mb-4">
          <label className="label text-sm font-medium">Search or select vegetable</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name (e.g. pyaz, aloo, tamatar, bhindi...)"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-auto">
          {filteredVeg.length === 0 && (
            <div className="col-span-full text-sm text-slate-500 p-2">No matches found.</div>
          )}
          {filteredVeg.map((veg) => (
            <button
              key={veg.official}
              onClick={() => {
                setSelected(veg);
                setSearch("");
                setOptions([]);
              }}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                selected?.official === veg.official
                  ? "border-2 border-[var(--line)] bg-slate-50 text-slate-900"
                  : "border-[var(--line)] hover:border-[var(--line)] hover:bg-slate-50"
              }`}
            >
              <div className="font-medium">{veg.official}</div>
              <div className="text-[10px] text-slate-400 truncate">
                {veg.aliases.slice(0, 3).join(", ")}
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="mt-3 text-sm">
            Selected: <span className="font-semibold">{selected.official}</span> (eNAM name)
          </div>
        )}
      </Card>

      {/* Quantity + Reason */}
      {selected && (
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Quantity</label>
              <input
                type="number"
                min="0.001"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="label">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={inputClass}
              >
                <option value="kg">Kilogram (kg)</option>
                <option value="quintal">Quintal (100 kg)</option>
                <option value="g">Gram (g)</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="label">Reason for request *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="For kitchen / canteen / hospital use..."
                className={inputClass}
              />
            </div>
          </div>

          <button
            onClick={fetchPrice}
            disabled={loading}
            className="btn btn-primary mt-4 w-full sm:w-auto"
          >
            {loading ? "Fetching eNAM price..." : "Get Current eNAM Mandi Price"}
          </button>
        </Card>
      )}

      {/* Results */}
      {options.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 px-1 text-xl font-bold tracking-tight text-slate-900">eNAM Price</div>
          <ActivityList>
            {options.map((opt, idx) => (
              <ActivityRow
                key={idx}
                icon="🥕"
                title={opt.title}
                subtitle={opt.source}
                meta={`₹${opt.price} / ${unit}`}
                trailing={
                  <button
                    onClick={() => submitRequest(opt)}
                    disabled={submitting || !reason.trim()}
                    className="btn btn-primary btn-sm shrink-0"
                  >
                    {submitting ? "…" : "Select"}
                  </button>
                }
              />
            ))}
          </ActivityList>
        </div>
      )}

      {error && (
        <p className="text-red-600 bg-red-50 p-3 rounded-xl text-sm">{error}</p>
      )}

      <div className="text-xs text-slate-500 mt-8">
        Prices are official wholesale mandi rates from eNAM. Always verify current rates and local availability before ordering.
      </div>
    </div>
  );
}
