"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/ui";
import { PURCHASE_UNITS, inferUnit } from "@/lib/categories";
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

type SortMode = "best-value" | "price-asc" | "price-desc" | "source";

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: "best-value", label: "Best value" },
  { id: "price-asc", label: "Price: low → high" },
  { id: "price-desc", label: "Price: high → low" },
  { id: "source", label: "Source A–Z" },
];

function sourceEmoji(source: string) {
  if (source.includes("eNAM")) return "🌾";
  if (source.includes("Amazon")) return "📦";
  if (source.includes("Flipkart")) return "🛍️";
  if (source.includes("Croma")) return "🛒";
  if (source.includes("IndiaMART")) return "🏭";
  return "📷";
}

function AnalysingLoader() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, ANALYSE_STEPS.length - 1)), 1100);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="mt-8 overflow-hidden rounded-3xl border border-[var(--line)] bg-white">
      <div className="grid md:grid-cols-[minmax(220px,320px)_1fr]">
        <div className="relative flex min-h-[220px] items-center justify-center stage-teal px-6 py-10 md:min-h-[280px]">
          <div className="absolute h-52 w-52 rounded-full bg-blue-300/35 blur-3xl md:h-64 md:w-64" />
          <img
            src="/smart-analyser.svg"
            alt=""
            aria-hidden="true"
            className="analyser-bot relative h-48 w-48 object-contain sm:h-56 sm:w-56 md:h-64 md:w-64"
          />
        </div>
        <div className="border-t border-[var(--line)] p-8 md:border-l md:border-t-0">
          <div className="mb-6 flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
            </span>
            <span className="text-xl font-semibold tracking-tight">Analysing…</span>
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
  // Once the user picks a unit by hand we stop auto-overriding it; until then
  // the unit follows whatever they type in the product name.
  const [unitManual, setUnitManual] = useState(false);
  const [unitAuto, setUnitAuto] = useState(false);
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
  const [sortMode, setSortMode] = useState<SortMode>("best-value");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const sortedIndices = useMemo(() => {
    const indices = options.map((_, i) => i);
    if (sortMode === "price-asc") {
      return indices.sort((a, b) => options[a].price - options[b].price);
    }
    if (sortMode === "price-desc") {
      return indices.sort((a, b) => options[b].price - options[a].price);
    }
    if (sortMode === "source") {
      return indices.sort((a, b) => options[a].source.localeCompare(options[b].source));
    }
    const rec = analysis?.recommendedIndex;
    return indices.sort((a, b) => {
      if (rec != null) {
        if (a === rec) return -1;
        if (b === rec) return 1;
      }
      return options[a].price - options[b].price;
    });
  }, [options, sortMode, analysis?.recommendedIndex]);

  // Auto-pick the unit from the product name as the user types. This is a local
  // keyword heuristic — no API call (it used to hit an LLM endpoint on every
  // pause, which was needless cost) — and the user can always override it.
  useEffect(() => {
    const name = heading.trim();
    if (unitManual || name.length < 2) {
      setUnitAuto(false);
      return;
    }
    const guess = inferUnit(name);
    setUnit(guess);
    setUnitAuto(true);
  }, [heading, unitManual]);

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
    setSortMode("best-value");
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
        <div className="overflow-hidden rounded-3xl border border-[var(--line)] bg-white p-8">
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
              className="input !py-4 text-xl"
              disabled={loadingOptions}
            />

            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1.5">
                How much do you need?
                {unitAuto && !unitManual && (
                  <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    ✨ Unit picked for you — change it if needed
                  </span>
                )}
              </label>

              <div className="flex flex-wrap gap-3 items-stretch">
                {/* One connected control: editable number on the left, editable
                    unit on the right — reads like "5 kg". */}
                <div className="flex items-stretch overflow-hidden rounded-xl border border-[var(--line)] bg-white focus-within:border-[var(--line)]">
                  <input
                    type="number"
                    aria-label="Quantity"
                    value={qtyInput}
                    onChange={e => setQtyInput(e.target.value)}
                    onFocus={e => e.target.select()}
                    onBlur={() => {
                      const n = parseFloat(qtyInput);
                      setQtyInput(!isFinite(n) || n <= 0 ? "1" : String(n));
                    }}
                    disabled={loadingOptions}
                    className="w-24 text-xl font-semibold text-center px-3 py-3 outline-none border-none bg-transparent"
                    min="0.001"
                    step="any"
                  />
                  <div className="w-px bg-slate-200" />
                  <select
                    aria-label="Unit"
                    value={unit}
                    onChange={e => { setUnit(e.target.value); setUnitManual(true); setUnitAuto(false); }}
                    disabled={loadingOptions}
                    className="text-lg font-medium px-4 py-3 outline-none border-none bg-transparent cursor-pointer hover:bg-slate-50"
                  >
                    {PURCHASE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>

                <button
                  onClick={findOptions}
                  disabled={loadingOptions || !heading.trim()}
                  className={`btn btn-primary flex-1 min-w-[140px] sm:flex-none px-7 text-base ${loadingOptions ? 'loading' : ''}`}
                >
                  <span className="spinner" />
                  <span className="btn-text">{loadingOptions ? "Analysing..." : "Find Options"}</span>
                </button>
              </div>
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
            <button onClick={() => {setOptions([]); setSelected({}); setReasons({}); setCompare({}); setAnalysis(null); setSortMode("best-value");}} className="btn btn-ghost btn-sm">Start over</button>
          </div>

          {/* Real stats from scraped results */}
          {stats && (
            <div className="mb-3 text-xs bg-white border rounded-xl px-3 py-1.5 inline-flex gap-4 text-slate-600">
              <span><strong className="text-slate-900">Median:</strong> ₹{stats.medianPrice}</span>
              <span><strong className="text-slate-900">Avg:</strong> ₹{stats.averagePrice}</span>
              <span className="text-slate-400">({stats.count} listings)</span>
            </div>
          )}

          {/* Smart Analyser — minimal white card; the robot animation is the hero */}
          {analysis && options[analysis.recommendedIndex] && (
            <div className="mb-6 grid overflow-hidden rounded-3xl border border-[var(--line)] bg-white md:grid-cols-[minmax(240px,340px)_1fr]">
              <div className="relative flex min-h-[260px] items-center justify-center stage-teal px-8 py-10 md:min-h-[300px]">
                <div className="absolute h-56 w-56 rounded-full bg-blue-300/40 blur-3xl md:h-72 md:w-72" />
                <img
                  src="/smart-analyser.svg"
                  alt=""
                  aria-hidden="true"
                  className="analyser-bot relative h-52 w-52 object-contain sm:h-60 sm:w-60 md:h-72 md:w-72"
                />
              </div>

              <div className="border-t border-[var(--line)] p-6 md:border-l md:border-t-0 md:p-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                    ✨ Smart Analyser
                  </span>
                </div>
                <div className="text-sm text-slate-500 mb-0.5">Recommended for you</div>
                <div className="text-lg font-bold tracking-tight text-slate-900">{options[analysis.recommendedIndex].title}</div>
                <div className="mt-0.5 text-base font-semibold text-blue-600 tabular-nums">
                  {inr(options[analysis.recommendedIndex].price)} <span className="text-sm font-normal text-slate-400">/ {unit}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{analysis.recommendation}</p>
                {analysis.insights.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {analysis.insights.map((ins, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-600">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>{ins}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  onClick={() => toggle(analysis.recommendedIndex)}
                  className="mt-5 rounded-xl bg-primary text-white text-sm font-semibold px-5 py-2.5 hover:opacity-90 transition"
                >
                  {selected[analysis.recommendedIndex] ? '✓ Recommended option selected' : 'Select this option'}
                </button>
              </div>
            </div>
          )}

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold text-slate-700">
              {options.length} listing{options.length === 1 ? "" : "s"}
            </div>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSortMode(opt.id)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    sortMode === opt.id ? "pill-active" : "pill-inactive"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-line overflow-hidden rounded-3xl border border-[var(--line)] bg-white divide-y">
            {sortedIndices.map((idx) => {
              const opt = options[idx];
              const isSelected = !!selected[idx];
              const isCompared = !!compare[idx];
              const isBest = analysis?.recommendedIndex === idx;
              const isLowest =
                stats?.lowest != null ? opt.price === stats.lowest : false;

              return (
                <div
                  key={idx}
                  className={`p-4 transition md:p-5 ${isSelected ? "row-selected" : "row-hover"}`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="relative mx-auto h-32 w-32 shrink-0 overflow-hidden rounded-2xl border border-[var(--line)] thumb-well sm:mx-0 sm:h-28 sm:w-28">
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                        <span className="text-3xl">{sourceEmoji(opt.source)}</span>
                        <span className="mt-1 text-[9px] font-semibold uppercase tracking-wider">{opt.source}</span>
                      </div>
                      {opt.image && (
                        <img
                          src={opt.image}
                          alt=""
                          className="relative z-10 h-full w-full object-contain p-2"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.opacity = "0";
                          }}
                        />
                      )}
                      {isBest && (
                        <span className="absolute left-1.5 top-1.5 z-20 rounded-md border border-[var(--line)] bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-800">
                          ★ Best value
                        </span>
                      )}
                      {isLowest && !isBest && (
                        <span className="absolute left-1.5 top-1.5 z-20 rounded-md border border-[var(--line)] bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-800">
                          Lowest
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-[var(--line)] bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                          {opt.source}
                        </span>
                        <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          <input
                            type="checkbox"
                            checked={isCompared}
                            onChange={() => toggleCompare(idx)}
                            className="accent-amber-500"
                          />
                          Compare
                        </label>
                      </div>
                      <h3 className="mt-2 text-base font-semibold leading-snug text-slate-900 sm:text-lg">
                        {opt.title}
                      </h3>
                      {opt.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{opt.description}</p>
                      )}
                      {opt.url && (
                        <a
                          href={opt.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline"
                        >
                          View listing →
                        </a>
                      )}
                    </div>

                    <div className="shrink-0 sm:w-44 sm:text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Per {unit}
                      </div>
                      <div className="text-2xl font-bold tabular-nums tracking-tight text-primary">
                        {inr(opt.price)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {inr(opt.price * quantity)} for {quantity} {unit}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggle(idx)}
                        className={`btn mt-3 w-full sm:w-auto ${isSelected ? "btn-primary" : "btn-secondary"}`}
                      >
                        {isSelected ? "✓ Selected" : "Select"}
                      </button>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-4 border-t border-[var(--line)] pt-4">
                      <textarea
                        value={reasons[idx] || ""}
                        onChange={(e) => setReasonFor(idx, e.target.value)}
                        placeholder="Why this one? (price, delivery, warranty...)"
                        className="input min-h-[70px] resize-y text-sm"
                      />
                    </div>
                  )}
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
