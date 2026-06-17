import { getSetting, getSupabase } from "../db";
import { logAudit } from "../audit";
import { classifyListing } from "./classify";
import { gatherListings } from "./providers";
import type { ClassifiedListing, ProductInput } from "./types";

export type CheckResult = {
  verdict: string;
  verdictBasis: string;
  bestPrice: number | null;
  listings: ClassifiedListing[];
};

function dropPriceOutliers(listings: ClassifiedListing[]): ClassifiedListing[] {
  if (listings.length < 3) return listings;
  const sorted = [...listings].sort((a, b) => a.price - b.price);
  const median = sorted[Math.floor(sorted.length / 2)].price;
  return listings.filter((l) => l.price >= median * 0.25 && l.price <= median * 4);
}

export async function runPriceCheck(purchaseId: number, userId: number): Promise<CheckResult> {
  const supabase = getSupabase();
  const { data: p, error: pErr } = await supabase.from("purchases").select("*").eq("id", purchaseId).maybeSingle();
  if (pErr) throw pErr;
  if (!p) throw new Error("Purchase not found");

  const input: ProductInput = {
    productName: String(p.product_name),
    category: String(p.category),
    brand: String(p.brand),
    model: String(p.model),
    specs: String(p.specs),
    unitPrice: p.unit_price != null ? Number(p.unit_price) : null,
    quantity: Number(p.quantity),
  };

  const raw = await gatherListings(input);
  let classified = raw
    .map((l) => classifyListing(input, l))
    .filter((l): l is ClassifiedListing => l !== null)
    .sort((a, b) => b.matchScore - a.matchScore || a.price - b.price);

  // When scrapers return results but the strict matcher rejects them all, keep
  // the cheapest raw hits so staff still see online prices on the detail page.
  if (classified.length === 0 && raw.length > 0) {
    classified = [...raw]
      .sort((a, b) => a.price - b.price)
      .slice(0, 15)
      .map((l) => ({ ...l, matchType: "ALTERNATIVE" as const, matchScore: 0.15 }));
  }

  classified = classified.slice(0, 40);

  const sameProduct = dropPriceOutliers(classified.filter((l) => l.matchType === "SAME_PRODUCT"));
  const comparable = dropPriceOutliers(
    classified.filter((l) => l.matchType === "SAME_SPEC" || l.matchType === "SIMILAR")
  );
  const pool = sameProduct.length > 0 ? sameProduct : comparable;
  const basis =
    sameProduct.length > 0
      ? "Compared against identical product listings"
      : comparable.length > 0
        ? "No identical listing found — compared against similar / same-spec products"
        : "No comparable online listing found";

  let verdict = "NEEDS_REVIEW";
  let best: ClassifiedListing | null = null;
  let saving: number | null = null;

  if (pool.length > 0) {
    best = pool.reduce((min, l) => (l.price < min.price ? l : min), pool[0]);
    if (input.unitPrice == null) {
      verdict = "NEEDS_REVIEW";
    } else {
      const tolerance = parseFloat(await getSetting("tolerance_pct")) / 100 || 0.1;
      if (input.unitPrice <= best.price) {
        verdict = "BETTER_THAN_ONLINE";
      } else if (input.unitPrice <= best.price * (1 + tolerance)) {
        verdict = "GOOD_PRICE";
      } else {
        verdict = "BETTER_PRICE_AVAILABLE";
        saving = Math.round((input.unitPrice - best.price) * input.quantity * 100) / 100;
      }
    }
  }

  const now = new Date().toISOString();
  await supabase.from("price_listings").delete().eq("purchase_id", purchaseId);

  if (classified.length > 0) {
    const { error: insErr } = await supabase.from("price_listings").insert(
      classified.map((l) => ({
        purchase_id: purchaseId,
        source: l.source,
        title: l.title,
        price: l.price,
        url: l.url,
        match_type: l.matchType,
        match_score: l.matchScore,
        fetched_at: now,
      }))
    );
    if (insErr) throw insErr;
  }

  const { error: updErr } = await supabase
    .from("purchases")
    .update({
      verdict,
      verdict_basis: basis,
      best_online_price: best?.price ?? null,
      best_online_title: best?.title ?? null,
      best_online_source: best?.source ?? null,
      best_online_url: best?.url ?? null,
      potential_saving: saving,
      checked_at: now,
      updated_at: now,
    })
    .eq("id", purchaseId);
  if (updErr) throw updErr;

  await logAudit(
    userId,
    "PRICE_CHECK",
    "purchase",
    String(purchaseId),
    `Verdict: ${verdict} (${classified.length} listings, best ${best ? `₹${best.price} from ${best.source}` : "n/a"})`
  );

  return { verdict, verdictBasis: basis, bestPrice: best?.price ?? null, listings: classified };
}