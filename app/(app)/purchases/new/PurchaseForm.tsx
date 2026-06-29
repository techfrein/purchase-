"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/ui";
import { PURCHASE_UNITS } from "@/lib/categories";
import { inr } from "@/lib/format";

type Option = {
  title: string;
  source: string;
  price: number;
  url: string | null;
  image?: string | null;
  description?: string;
};

type Analysis = {
  recommendedIndex: number;
  recommendation: string;
  insights: string[];
};

type SpecComparison = {
  attributes: string[];
  values: Array<Record<string, string>>;
  verdict?: string;
};

// Stepped progress shown while results load — phrased generically so the
// underlying provider is never surfaced to the user.
const ANALYSE_STEPS = [
  "Understanding your request",
  "Scanning trusted suppliers",
  "Comparing live prices",
  "Ranking the best value",
];

function AnalysingLoader() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, ANALYSE_STEPS.length - 1)), 1100);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="mt-8 rounded-3xl bg-white border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
        </span>
        <span className="text-lg font-semibold tracking-tight">Analysing…</span>
      </div>
      <div className="space-y-3">
        {ANALYSE_STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={i} className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                  done ? "bg-primary text-white" : active ? "bg-primary/15 text-primary" : "bg-slate-100 text-slate-400"
                }`}
              >
                {done ? "✓" : active ? <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> : i + 1}
              </span>
              <span className={`text-sm transition-colors ${done || active ? "text-slate-900 font-medium" : "text-slate-400"}`}>
                {label}
                {active && <span className="ml-0.5 inline-block animate-pulse">…</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PurchaseRequestForm({ userRole }: { userRole: string }) {
  const router = useRouter();
  const [heading, setHeading] = useState("");
  // Stored as a string so the field can be fully cleared while typing (a numeric
  // state forced the value back to 1, turning "30" into "130"). The numeric
  // value used for pricing/submit is derived below.
  const [qtyInput, setQtyInput] = useState("1");
  const quantity = Math.max(0.001, parseFloat(qtyInput) || 1);
  const [unit, setUnit] = useState("unit");
  const [overallReason, setOverallReason] = useState("");

  const [options, setOptions] = useState<Option[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [compare, setCompare] = useState<Record<number, boolean>>({});
  const [specs, setSpecs] = useState<SpecComparison | null>(null);
  const [specsLoading, setSpecsLoading] = useState(false);

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function findOptions() {
    if (!heading.trim()) {
      setError("Enter product + keywords (e.g. Laptop, Dell i7 16GB)");
      return;
    }
    setError("");
    setLoadingOptions(true);
    setSelected({});
    setReasons({});
    setCompare({});
    setAnalysis(null);
    setOptions([]);

    try {
      const res = await fetch("/api/purchase-requests/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heading: heading.trim(), quantity, unit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setOptions(data.options || []);
      setStats(data.stats || null);
      setAnalysis(data.analysis || null);
    } catch (e: any) {
      setError(e.message || "Could not get options. Try again.");
    } finally {
      setLoadingOptions(false);
    }
  }

  function toggle(idx: number) {
    const next = !selected[idx];
    setSelected(s => ({ ...s, [idx]: next }));
    if (!next) {
      setReasons(r => { const c = {...r}; delete c[idx]; return c; });
    }
  }

  function setReasonFor(idx: number, val: string) {
    setReasons(r => ({ ...r, [idx]: val }));
  }

  function toggleCompare(idx: number) {
    setCompare(c => ({ ...c, [idx]: !c[idx] }));
  }

  const compareList = Object.keys(compare)
    .filter(k => compare[Number(k)])
    .map(k => Number(k));
  const compareLow = compareList.length ? Math.min(...compareList.map(i => options[i].price)) : 0;

  // Fetch a feature/spec comparison whenever the set of ticked options changes
  // (and there are at least 2). Keyed on the sorted index list so it only
  // refires on a real change. Clears below 2.
  const compareKey = [...compareList].sort((a, b) => a - b).join(",");
  useEffect(() => {
    const idxs = compareKey ? compareKey.split(",").map(Number) : [];
    if (idxs.length < 2) {
      setSpecs(null);
      setSpecsLoading(false);
      return;
    }
    let cancelled = false;
    setSpecsLoading(true);
    setSpecs(null);
    (async () => {
      try {
        const res = await fetch("/api/purchase-requests/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            heading: heading.trim(),
            options: idxs.map(i => ({
              title: options[i].title,
              source: options[i].source,
              price: options[i].price,
              description: options[i].description,
            })),
          }),
        });
        const data = await res.json();
        if (!cancelled && res.ok) setSpecs(data.comparison || null);
      } catch {
        /* leave specs null — compare table still shows price rows */
      } finally {
        if (!cancelled) setSpecsLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareKey]);

  const selectedList = Object.keys(selected)
    .filter(k => selected[Number(k)])
    .map(k => {
      const i = Number(k);
      return { i, ...options[i], reason: reasons[i] || "" };
    });

  function submit() {
    if (selectedList.length === 0) {
      setError("Please select at least one option.");
      return;
    }
    if (!overallReason.trim()) {
      setError("Please add a reason for this request.");
      return;
    }

    const chosen = selectedList.map(({ i, ...opt }) => ({
      title: opt.title,
      source: opt.source,
      price: opt.price,
      url: opt.url,
      selection_reason: (reasons[i] || "Good value and specs").trim(),
    }));

    setError("");

    startTransition(async () => {
      try {
        const res = await fetch("/api/purchase-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productHeading: heading.trim(),
            quantity,
            unit,
            reason: overallReason.trim(),
            selectedOptions: chosen,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        router.push(`/purchases/${data.id}?type=request`);
      } catch (e: any) {
        setError(e.message || "Failed to submit.");
      }
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero / Search Header - inspired by the reference */}
      <div className="mb-8">
        <div className="rounded-3xl bg-white border border-slate-200 p-8">
          <div className="text-xs font-semibold tracking-[1px] uppercase text-primary mb-1">NEW REQUEST</div>
          <h1 className="text-4xl font-bold tracking-tighter">What do you need to purchase?</h1>
          <p className="mt-2 text-lg text-slate-500 max-w-xl">
            Search like you would on any modern store. For vegetables, use the dedicated <a href="/vegetables" className="text-primary underline">Vegetables section</a> for accurate eNAM mandi rates.
          </p>

          <div className="mt-6 space-y-3">
            <input
              value={heading}
              onChange={e => setHeading(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') findOptions(); }}
              placeholder="Laptop, Dell Latitude 15, i7, 16GB RAM, business"
              className="w-full text-xl border border-slate-300 focus:border-primary rounded-2xl px-5 py-4 outline-none"
              disabled={loadingOptions}
            />

            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 shrink-0">Qty</span>
                <input
                  type="number"
                  value={qtyInput}
                  onChange={e => setQtyInput(e.target.value)}
                  onFocus={e => e.target.select()}
                  onBlur={() => {
                    const n = parseFloat(qtyInput);
                    setQtyInput(!isFinite(n) || n <= 0 ? "1" : String(n));
                  }}
                  disabled={loadingOptions}
                  className={inputClass + " w-20"}
                  min="0.001"
                  step="any"
                />
              </div>

              <select 
                value={unit} 
                onChange={e=>setUnit(e.target.value)} 
                disabled={loadingOptions} 
                className={inputClass + " w-32"}
              >
                {PURCHASE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>

              <button 
                onClick={findOptions} 
                disabled={loadingOptions || !heading.trim()}
                className={`btn btn-primary flex-1 min-w-[130px] sm:flex-none px-6 text-base ${loadingOptions ? 'loading' : ''}`}
              >
                <span className="spinner" />
                <span className="btn-text">{loadingOptions ? "Analysing..." : "Find Options"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Options Results - beautiful product cards */}
      {options.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4 px-1">
            <div>
              <div className="font-semibold text-2xl tracking-tight">Best matches from trusted sources</div>
              <div className="text-sm text-slate-500">For “{heading}” — eNAM mandi wholesale prices (only for vegetables)</div>
            </div>
            <button onClick={() => {setOptions([]); setSelected({}); setReasons({}); setCompare({}); setAnalysis(null);}} className="text-sm font-medium text-primary">Start over</button>
          </div>

          {/* Real stats from scraped results */}
          {stats && (
            <div className="mb-3 text-xs bg-white border rounded-xl px-3 py-1.5 inline-flex gap-4 text-slate-600">
              <span><strong className="text-slate-900">Median:</strong> ₹{stats.medianPrice}</span>
              <span><strong className="text-slate-900">Avg:</strong> ₹{stats.averagePrice}</span>
              <span className="text-slate-400">({stats.count} listings)</span>
            </div>
          )}

          {/* Smart Analyser — recommended pick + insights */}
          {analysis && options[analysis.recommendedIndex] && (
            <div className="mb-6 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary text-sm">✨</span>
                <span className="font-semibold tracking-tight text-lg">Smart Analyser</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-2">
                <span className="text-sm text-slate-500">Recommended:</span>
                <span className="font-semibold text-slate-900">{options[analysis.recommendedIndex].title}</span>
                <span className="text-sm font-semibold text-primary tabular-nums">{inr(options[analysis.recommendedIndex].price)} / {unit}</span>
              </div>
              <p className="text-sm text-slate-700 mb-3">{analysis.recommendation}</p>
              {analysis.insights.length > 0 && (
                <ul className="space-y-1.5">
                  {analysis.insights.map((ins, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-600">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{ins}</span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => toggle(analysis.recommendedIndex)}
                className="mt-4 rounded-xl bg-primary text-white text-sm font-semibold px-4 py-2 hover:opacity-90"
              >
                {selected[analysis.recommendedIndex] ? '✓ Recommended option selected' : 'Select recommended option'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {options.map((opt, idx) => {
              const isSelected = !!selected[idx];
              const isCompared = !!compare[idx];
              const isBest = analysis?.recommendedIndex === idx;
              return (
                <div key={idx} className={`group border rounded-3xl bg-white overflow-hidden flex flex-col transition-all ${isSelected ? 'ring-2 ring-primary border-primary' : isCompared ? 'ring-2 ring-amber-400 border-amber-400' : 'border-slate-200 hover:border-slate-300'}`}>
                  {/* Image / Visual area - real product image when available */}
                  <div className="bg-slate-100 h-48 flex items-center justify-center relative overflow-hidden">
                    {isBest && (
                      <div className="absolute top-2 left-2 z-20 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shadow">★ Best value</div>
                    )}
                    <label className={`absolute z-20 ${isBest ? 'top-10' : 'top-2'} left-2 flex items-center gap-1.5 cursor-pointer bg-white/90 hover:bg-white rounded-full px-2 py-1 text-[11px] font-medium shadow-sm`}>
                      <input
                        type="checkbox"
                        checked={isCompared}
                        onChange={() => toggleCompare(idx)}
                        className="accent-amber-500"
                      />
                      Compare
                    </label>
                    {/* Always show a nice source-based placeholder underneath */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 z-0">
                      <div className="text-4xl mb-1">
                        {opt.source.includes('eNAM') ? '🌾' : 
                         opt.source.includes('Amazon') ? '📦' : 
                         opt.source.includes('Flipkart') ? '🛍️' : 
                         opt.source.includes('Croma') ? '🛒' : 
                         opt.source.includes('IndiaMART') ? '🏭' : '📷'}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest font-medium">{opt.source}</div>
                    </div>

                    {opt.image && (
                      <img 
                        src={opt.image} 
                        alt={opt.title} 
                        className="relative z-10 max-h-full max-w-full object-contain p-2" 
                        loading="lazy"
                        onError={(e) => { 
                          const target = e.target as HTMLImageElement; 
                          target.style.opacity = '0'; 
                        }}
                      />
                    )}

                    <div className="absolute top-2 right-2 bg-white/90 text-[10px] px-1.5 py-0.5 rounded font-medium shadow-sm z-20">{opt.source}</div>
                    {opt.url && (
                      <a href={opt.url} target="_blank" className="absolute bottom-2 right-2 text-[10px] px-2 py-0.5 bg-white/90 rounded border text-primary hover:bg-white z-20">View ↗</a>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="font-semibold text-[17px] leading-tight tracking-[-0.2px] mb-1 pr-1">{opt.title}</div>
                    
                    <div className="mt-auto">
                      {/* Per-unit price is the hero — what matters for bulk comparison */}
                      <div className="rounded-2xl bg-primary/5 border border-primary/15 px-3 py-2.5 mb-3">
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-primary/80">
                          Price per {unit}
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[28px] leading-none font-bold tabular-nums tracking-tighter text-primary">
                            {inr(opt.price)}
                          </span>
                          <span className="text-sm font-medium text-slate-500">/ {unit}</span>
                        </div>
                        <div className="mt-1.5 pt-1.5 border-t border-primary/10 flex items-center justify-between text-xs">
                          <span className="text-slate-500">{quantity} {unit} total</span>
                          <span className="font-semibold text-slate-900 tabular-nums">{inr(opt.price * quantity)}</span>
                        </div>
                      </div>

                      {opt.description && (
                        <p className="text-sm text-slate-600 line-clamp-2 mb-4">{opt.description}</p>
                      )}

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => toggle(idx)}
                          className={`flex-1 rounded-2xl py-3 text-sm font-semibold transition ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}
                        >
                          {isSelected ? '✓ Selected' : 'Select this option'}
                        </button>
                      </div>

                      {isSelected && (
                        <div className="mt-3">
                          <textarea 
                            value={reasons[idx] || ''} 
                            onChange={e => setReasonFor(idx, e.target.value)}
                            placeholder="Why this one? (price, delivery, warranty...)"
                            className="w-full text-sm border border-slate-200 rounded-2xl p-3 resize-y min-h-[70px] focus:border-primary outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compare panel — side-by-side of the ticked options */}
          {compareList.length >= 2 && (
            <div className="mt-8 rounded-3xl border border-amber-300 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 bg-amber-50 border-b border-amber-200">
                <div>
                  <div className="font-semibold tracking-tight">Compare {compareList.length} options</div>
                  {specs?.verdict && <div className="text-xs text-slate-600 mt-0.5 max-w-2xl">{specs.verdict}</div>}
                </div>
                <button onClick={() => setCompare({})} className="text-sm font-medium text-amber-700 hover:underline">Clear comparison</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b">
                      <th className="text-left font-medium text-slate-500 px-4 py-3 align-top w-28">Product</th>
                      {compareList.map(i => (
                        <td key={i} className="px-4 py-3 align-top min-w-[160px]">
                          {options[i].image && <img src={options[i].image!} className="w-12 h-12 object-contain rounded border mb-1.5" alt="" />}
                          <div className="font-medium leading-tight">{options[i].title}</div>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <th className="text-left font-medium text-slate-500 px-4 py-3">Source</th>
                      {compareList.map(i => <td key={i} className="px-4 py-3 text-slate-600">{options[i].source}</td>)}
                    </tr>
                    <tr className="border-b">
                      <th className="text-left font-medium text-slate-500 px-4 py-3">Per {unit}</th>
                      {compareList.map(i => (
                        <td key={i} className="px-4 py-3">
                          <span className={`font-bold tabular-nums ${options[i].price === compareLow ? 'text-green-600' : 'text-slate-900'}`}>{inr(options[i].price)}</span>
                          {options[i].price === compareLow && <span className="ml-1 text-[10px] font-bold uppercase text-green-600">Lowest</span>}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <th className="text-left font-medium text-slate-500 px-4 py-3">Total ({quantity} {unit})</th>
                      {compareList.map(i => <td key={i} className="px-4 py-3 font-semibold tabular-nums">{inr(options[i].price * quantity)}</td>)}
                    </tr>

                    {/* Feature / specification rows */}
                    {specsLoading && (
                      <tr className="border-b">
                        <th className="text-left font-medium text-slate-500 px-4 py-3">Features</th>
                        <td colSpan={compareList.length} className="px-4 py-3 text-slate-400 italic">Comparing features &amp; specifications…</td>
                      </tr>
                    )}
                    {!specsLoading && specs && specs.attributes.map((attr, ai) => (
                      <tr key={attr} className="border-b last:border-0 even:bg-slate-50/50">
                        <th className="text-left font-medium text-slate-500 px-4 py-3 capitalize align-top">{attr}</th>
                        {compareList.map((optIdx, col) => {
                          const val = specs.values[col]?.[attr] ?? "—";
                          return <td key={optIdx} className="px-4 py-3 text-slate-700 align-top">{val}</td>;
                        })}
                      </tr>
                    ))}

                    <tr>
                      <th className="px-4 py-3" />
                      {compareList.map(i => (
                        <td key={i} className="px-4 py-3">
                          <button
                            onClick={() => toggle(i)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${selected[i] ? 'bg-primary text-white' : 'bg-slate-100 hover:bg-slate-200'}`}
                          >
                            {selected[i] ? '✓ Selected' : 'Select'}
                          </button>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Selection Summary - acts like a mini cart */}
          {selectedList.length > 0 && (
            <div className="mt-10 border rounded-3xl bg-white p-6">
              <div className="font-semibold text-xl mb-4">Your selections ({selectedList.length})</div>

              <div className="space-y-3 mb-6">
                {selectedList.map(({i, title, source, price, image}) => (
                  <div key={i} className="flex items-center gap-3 border-b pb-3 last:border-0">
                    {image && <img src={image} className="w-8 h-8 object-contain rounded border" alt="" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{title}</div>
                      <div className="text-xs text-slate-500">{source}</div>
                    </div>
                    <div className="font-semibold shrink-0">{inr(price * quantity)} <span className="text-xs text-slate-500">for {quantity} {unit}</span></div>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-sm font-medium mb-1.5">Reason for this purchase request *</div>
                <textarea 
                  value={overallReason} 
                  onChange={e=>setOverallReason(e.target.value)} 
                  className={inputClass + " min-h-[90px]"} 
                  placeholder="Department needs, project, replacement of broken unit..."
                />
              </div>

              <button 
                onClick={submit} 
                disabled={isPending}
                className={`mt-5 w-full btn btn-primary text-base py-4 ${isPending ? 'loading' : ''}`}
              >
                <span className="spinner" />
                <span className="btn-text">
                  {isPending ? "Submitting request..." : `Submit Request with ${selectedList.length} option(s)`}
                </span>
              </button>
              <p className="text-center text-xs text-slate-500 mt-3">This will go to Admin → Owner for final approval and ticket creation.</p>
            </div>
          )}
        </>
      )}

      {error && <p className="mt-6 text-sm text-red-600 bg-red-50 p-3 rounded-2xl">{error}</p>}

      {loadingOptions && <AnalysingLoader />}
    </div>
  );
}
