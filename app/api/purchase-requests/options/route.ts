import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { getProductOptions, analyseOptions } from "@/lib/gemini";
import { getCached, setCached, searchKey } from "@/lib/search-cache";

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { heading?: string; quantity?: number; unit?: string };
  const heading = (body.heading || "").trim();
  if (!heading) return NextResponse.json({ error: "Product heading is required." }, { status: 400 });

  const qty = Math.max(0.001, Number(body.quantity) || 1);
  const unit = body.unit || "unit";

  // Per-unit prices and the analysis don't depend on quantity, so the cache key
  // is heading+unit only. A hit skips ALL Serper + Gemini calls for this search.
  const key = searchKey(heading, unit);
  const cached = getCached<{ options: unknown; stats: unknown; analysis: unknown }>(key);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  try {
    const options = await getProductOptions(heading, qty, unit);

    // Compute realistic median / avg
    let stats = null;
    if (options.length > 0) {
      const prices = [...options.map(o => o.price)].sort((a,b) => a - b);
      const median = prices[Math.floor(prices.length / 2)];
      const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
      stats = {
        count: options.length,
        medianPrice: median,
        averagePrice: avg,
        lowest: Math.min(...prices),
        highest: Math.max(...prices)
      };
    }

    // Smart Analyser — best-value pick + insights. Best-effort; null hides the panel.
    const analysis = await analyseOptions(heading, qty, unit, options);

    // Only cache real results — never cache an empty/fallback search so a
    // transient outage doesn't get pinned for the whole TTL.
    if (options.length > 0) setCached(key, { options, stats, analysis });

    return NextResponse.json({ options, stats, analysis });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Product search failed" }, { status: 500 });
  }
}
