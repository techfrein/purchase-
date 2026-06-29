import { getSetting } from "./db";
import { fetchPage, isScrapingConfigured, scrapeAllowed } from "./scraping";

export type GeminiOption = {
  title: string;
  source: string;
  price: number;
  url: string | null;
  image?: string | null;
  description?: string;
};

// ---------------------------------------------------------------------------
// Keys. Pricing comes from Serper (serper.dev), images are chosen by Gemini
// from the real image URLs Serper returns. Both keys can come from an env var
// or the admin "settings" table (env wins for serper to match getSetting()).
// ---------------------------------------------------------------------------

async function getSerperKey(): Promise<string> {
  // getSetting already falls back to process.env.SERPER_API_KEY for this key.
  return (await getSetting("serper_key")).trim();
}

async function getGeminiKey(): Promise<string> {
  const fromEnv = (process.env.GEMINI_KEY || process.env.GEMINI_API_KEY || "").trim();
  if (fromEnv) return fromEnv;
  return (await getSetting("gemini_key")).trim();
}

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// ---------------------------------------------------------------------------
// PRODUCT DETECTION — what is being bought, and which sources fit.
// ---------------------------------------------------------------------------

export type ProductKind = {
  /** Best guess of the product category, e.g. "Examination Gloves". */
  category: string;
  /** Brand if identifiable, else "". */
  brand: string;
  /** Model / variant if identifiable, else "". */
  model: string;
  /** A tightened query for shopping/scraper searches. */
  searchQuery: string;
  /** Bulk / B2B / wholesale purchase → route to wholesale sites. */
  isWholesale: boolean;
  /** Medical / surgical / hospital good → favour medical B2B suppliers. */
  isMedical: boolean;
  /** Fresh produce / mandi commodity → use eNAM wholesale rates. */
  isProduce: boolean;
};

/**
 * Classify the free-text heading into a structured ProductKind via Gemini, so
 * the rest of the pipeline can route to the right price sources. Falls back to
 * keyword heuristics when no Gemini key is set or the call fails.
 */
async function detectProduct(heading: string, quantity: number, unit: string): Promise<ProductKind> {
  const key = await getGeminiKey();
  if (key) {
    const viaGemini = await geminiClassify(key, heading, quantity, unit);
    if (viaGemini) return viaGemini;
  }
  return heuristicClassify(heading);
}

async function geminiClassify(
  key: string,
  heading: string,
  quantity: number,
  unit: string
): Promise<ProductKind | null> {
  const prompt = `Classify this procurement request for a hospital/institution in India.

Request: "${heading}"
Quantity: ${quantity} ${unit}

Return ONLY a JSON object with these keys:
{
  "category": "concise product category",
  "brand": "brand or empty string",
  "model": "model/variant or empty string",
  "searchQuery": "a clean search query to find this exact product to buy",
  "isWholesale": boolean,   // true if this is a bulk/B2B/wholesale purchase (large quantity, raw materials, disposables, supplies)
  "isMedical": boolean,     // true if it is a medical/surgical/hospital/lab good
  "isProduce": boolean      // true if it is fresh vegetables/fruit/grain/spice priced at mandi
}`;

  const text = await geminiJson(key, prompt);
  if (!text) return null;
  try {
    const o = JSON.parse(text) as Partial<ProductKind>;
    return {
      category: String(o.category ?? "").trim() || heading,
      brand: String(o.brand ?? "").trim(),
      model: String(o.model ?? "").trim(),
      searchQuery: String(o.searchQuery ?? "").trim() || heading,
      isWholesale: !!o.isWholesale,
      isMedical: !!o.isMedical,
      isProduce: !!o.isProduce,
    };
  } catch {
    return null;
  }
}

/** Keyword fallback when Gemini is unavailable. */
function heuristicClassify(heading: string): ProductKind {
  const h = heading.toLowerCase();
  const isProduceHit = PRODUCE_HINTS.test(heading);
  const isMedical =
    /medical|surgical|hospital|clinic|lab|diagnostic|syringe|glove|mask|catheter|stethoscope|ecg|monitor|defibrillator|bandage|gauze|suture|scalpel|forceps|ppe|sanitizer|disposable|implant|cannula|iv |saline/i.test(
      h
    );
  const isWholesale =
    isMedical ||
    /wholesale|bulk|carton|case of|box of|pack of|\bqty\b|\bb2b\b|supplier|distributor|raw material|disposable|consumable/i.test(
      h
    );
  return {
    category: heading,
    brand: "",
    model: "",
    searchQuery: heading,
    isWholesale,
    isMedical,
    isProduce: isProduceHit,
  };
}

// ---------------------------------------------------------------------------
// Public entry point — used by /api/purchase-requests/options.
// ---------------------------------------------------------------------------

/**
 * Smart Analyser — a short procurement summary over the fetched options:
 * a recommended pick (by index), the headline reason, and 2–4 bullet insights
 * comparing price spread / value. Returns null on any failure so the UI can
 * simply hide the panel. Phrased generically (no "AI"/"Gemini" wording).
 */
export type SmartAnalysis = {
  recommendedIndex: number;
  recommendation: string;
  insights: string[];
};

export async function analyseOptions(
  heading: string,
  quantity: number,
  unit: string,
  options: Array<{ title: string; source: string; price: number }>
): Promise<SmartAnalysis | null> {
  if (!options.length) return null;
  const key = await getGeminiKey();
  if (!key) return null;

  const list = options
    .map((o, i) => `${i}: ${o.title} — ₹${o.price}/${unit} (${o.source})`)
    .join("\n");

  const prompt = `You are a procurement analyst. A buyer needs "${heading}" — ${quantity} ${unit}.
Here are the available options (index: title — price per ${unit} — source):
${list}

Pick the single best value-for-money option and explain briefly. Respond as JSON:
{
  "recommendedIndex": <number, the index of the best option>,
  "recommendation": "<one sentence on why it's the best pick>",
  "insights": ["<2 to 4 short bullet insights on price spread, value, or trade-offs>"]
}`;

  const raw = await geminiJson(key, prompt);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<SmartAnalysis>;
    let idx = Number(o.recommendedIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) idx = 0;
    const insights = Array.isArray(o.insights)
      ? o.insights.map((s) => String(s)).filter(Boolean).slice(0, 4)
      : [];
    return {
      recommendedIndex: idx,
      recommendation: String(o.recommendation ?? "").trim() || "Best balance of price and source reliability.",
      insights,
    };
  } catch {
    return null;
  }
}

/**
 * Feature/spec comparison across the chosen options. Gemini reads each listing's
 * title + description and returns a normalised attribute matrix: a shared set of
 * spec names plus each option's value for every spec ("—" when not stated). This
 * powers a feature-by-feature compare table rather than price-only.
 */
export type SpecComparison = {
  /** Ordered list of attribute/spec names that span the compared options. */
  attributes: string[];
  /** One record per option (same order as input), attribute → value string. */
  values: Array<Record<string, string>>;
  /** Optional one-line takeaway on how the options differ. */
  verdict?: string;
};

export async function compareOptions(
  heading: string,
  options: Array<{ title: string; source: string; price: number; description?: string }>
): Promise<SpecComparison | null> {
  if (options.length < 2) return null;
  const key = await getGeminiKey();
  if (!key) return null;

  const list = options
    .map((o, i) => `${i}: ${o.title}${o.description ? ` — ${o.description}` : ""} (₹${o.price}, ${o.source})`)
    .join("\n");

  const prompt = `You are comparing procurement options for "${heading}". For each option below, extract the key technical features and specifications a buyer would compare (e.g. material, size/capacity, pack quantity, grade/standard, sterility, brand, warranty, certifications, power, dimensions — whatever is relevant to THIS product type).

Options (index: title — description (price, source)):
${list}

Return ONLY JSON:
{
  "attributes": ["<8 to 14 spec names relevant to this product, most important first>"],
  "values": [ { "<attribute>": "<value for option 0, or '—' if not stated>", ... }, { ...option 1... } ],
  "verdict": "<one sentence on the key differences / which is most capable>"
}
Rules: "values" MUST have exactly ${options.length} objects, in the same order as the options. Every object MUST contain every attribute key. Keep values short (a few words). Infer reasonable values from the title when obvious; use "—" only when truly unknown.`;

  const raw = await geminiJson(key, prompt, { maxOutputTokens: 2048 });
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<SpecComparison>;
    const attributes = Array.isArray(o.attributes)
      ? o.attributes.map((a) => String(a)).filter(Boolean).slice(0, 16)
      : [];
    let values = Array.isArray(o.values) ? o.values.map((v) => (v && typeof v === "object" ? v : {})) : [];
    if (attributes.length === 0 || values.length !== options.length) return null;
    // Ensure every option has every attribute key (fill gaps with "—").
    values = values.map((v) => {
      const row: Record<string, string> = {};
      for (const a of attributes) row[a] = String((v as Record<string, unknown>)[a] ?? "—").trim() || "—";
      return row;
    });
    return { attributes, values, verdict: String(o.verdict ?? "").trim() || undefined };
  } catch {
    return null;
  }
}

export async function getProductOptions(
  heading: string,
  quantity: number,
  unit: string
): Promise<GeminiOption[]> {
  // 0. DETECT what this is so we route to the right price sources.
  const kind = await detectProduct(heading, quantity, unit);
  console.log(
    `[Product Search] "${heading}" → category="${kind.category}" wholesale=${kind.isWholesale} medical=${kind.isMedical} produce=${kind.isProduce}`
  );

  // 1. PRICING. Always query broad Shopping. For produce add eNAM mandi rates;
  //    for wholesale/medical add B2B supplier listings (Serper site-scoped +
  //    best-effort scrapers).
  const [serperOptions, mandiOptions, b2bOptions] = await Promise.all([
    serperPriceOptions(kind.searchQuery),
    kind.isProduce ? enamOptions(heading, unit) : Promise.resolve<GeminiOption[]>([]),
    kind.isWholesale ? wholesaleOptions(kind) : Promise.resolve<GeminiOption[]>([]),
  ]);

  let options = dedupeListings([...mandiOptions, ...b2bOptions, ...serperOptions]);

  // In one Gemini pass: drop listings that aren't the requested product (e.g.
  // "handwash" surfacing a soap dispenser) AND normalise each whole-pack price
  // into a per-requested-unit price (e.g. a "5 ltr" pack at ₹500 → ₹100/litre)
  // using Gemini's extracted pack size, with the title regex as fallback. Mandi
  // options carry no pack size and pass through unchanged.
  options = await filterAndSize(heading, kind, unit, options);

  // Sort cheapest (per requested unit) first, cap to 18 so stores stay visible.
  options = options.sort((a, b) => a.price - b.price).slice(0, 18);

  // Fallback when every live source is empty (no key / blocked / offline).
  if (options.length === 0) {
    options = kind.isProduce
      ? enamMock(heading, unit)
      : retailMock(heading, unit);
  }

  // 2. IMAGES via Gemini — picks the best real image URL for each option from
  //    candidates Serper provides. Uses the cleaned search query for relevance.
  //    Skips cleanly if no Gemini key.
  options = await attachImages(kind.searchQuery, options);

  // 3. Transparency: annotate with the median market price.
  if (options.length > 0) {
    const prices = options.map((o) => o.price).sort((a, b) => a - b);
    const median = prices[Math.floor(prices.length / 2)];
    options.forEach((o) => {
      o.description = `${o.description ?? ""} | Median market: ₹${median}`.trim();
    });
  }

  return options;
}

// ---------------------------------------------------------------------------
// PRICING — Serper.dev
// ---------------------------------------------------------------------------

type SerperShoppingItem = {
  title?: string;
  source?: string;
  price?: string;
  priceValue?: number;
  link?: string;
  imageUrl?: string;
  rating?: number;
  ratingCount?: number;
  delivery?: string;
};

function parsePrice(text: string): number | null {
  const m = text.replace(/[,\s]/g, "").match(/(?:₹|rs\.?|inr)?(\d+(?:\.\d{1,2})?)/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

/** A short title key for collapsing the same product seen across queries. */
function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
}

/**
 * Multi-query Shopping returns the same listing many times. Collapse by
 * store + normalized title, keeping the cheapest price for each — so each
 * (store, product) appears once at its real lowest price.
 */
function dedupeListings(options: GeminiOption[]): GeminiOption[] {
  const best = new Map<string, GeminiOption>();
  for (const o of options) {
    const key = `${o.source.toLowerCase()}|${titleKey(o.title)}`;
    const prev = best.get(key);
    if (!prev) {
      best.set(key, o);
    } else if (o.price < prev.price) {
      // Keep the cheaper one but don't lose an image we already found.
      best.set(key, { ...o, image: o.image ?? prev.image });
    } else if (!prev.image && o.image) {
      prev.image = o.image;
    }
  }
  return [...best.values()];
}

async function serperPost<T>(
  key: string,
  endpoint: "shopping" | "search" | "images",
  q: string
): Promise<T | null> {
  try {
    const res = await fetch(`https://google.serper.dev/${endpoint}`, {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q, gl: "in", hl: "en", num: 20 }),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[Serper] ${endpoint} HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.warn(`[Serper] ${endpoint} failed`, e);
    return null;
  }
}

// Major Indian retailers to scope Shopping queries to, broadening the store
// directory beyond whatever Google surfaces for the bare query. Each becomes a
// `site:` Shopping search so we pull that retailer's own listing + price.
const RETAILER_SITES = [
  "amazon.in",
  "flipkart.com",
  "croma.com",
  "reliancedigital.in",
  "vijaysales.com",
  "indiamart.com",
];

/**
 * Build the set of Shopping queries that widen store coverage for a heading.
 * Each Serper call costs one credit, so the number of site-scoped retailers is
 * capped by SERPER_SITE_QUERIES (default: all of RETAILER_SITES). Set it to 0
 * to query only the broad Google Shopping aggregate (2 credits/search).
 */
function buildShoppingQueries(heading: string): string[] {
  const base = heading.replace(/\s+/g, " ").trim();
  const queries = [base, `${base} buy online india`];

  const limitRaw = Number(process.env.SERPER_SITE_QUERIES);
  const siteLimit = Number.isFinite(limitRaw) ? limitRaw : RETAILER_SITES.length;
  for (const site of RETAILER_SITES.slice(0, Math.max(0, siteLimit))) {
    queries.push(`${base} site:${site}`);
  }
  return queries;
}

// ---------------------------------------------------------------------------
// PACK-SIZE NORMALISATION
//
// A listing price is for the whole pack ("Cooking Oil 5 Litre — ₹500"), but the
// app treats option.price as the price for ONE of the requested unit and then
// multiplies by quantity. Without this step a 5 L pack would be billed as
// ₹500/L instead of ₹100/L. We parse the pack size from the title, convert it
// into the requested unit, and divide the listing price by it so option.price
// is a true per-requested-unit price.
// ---------------------------------------------------------------------------

// Conversion of every supported unit to a base within its measurement family.
// Mass → grams, Volume → millilitres, Count → pieces. Cross-family conversion
// is intentionally impossible (you can't turn litres into pieces).
type UnitFamily = "mass" | "volume" | "count";
const UNIT_INFO: Record<string, { family: UnitFamily; base: number }> = {
  // mass (base = gram)
  g: { family: "mass", base: 1 },
  gram: { family: "mass", base: 1 },
  kg: { family: "mass", base: 1000 },
  quintal: { family: "mass", base: 100_000 },
  qtl: { family: "mass", base: 100_000 },
  tonne: { family: "mass", base: 1_000_000 },
  ton: { family: "mass", base: 1_000_000 },
  // volume (base = millilitre)
  ml: { family: "volume", base: 1 },
  l: { family: "volume", base: 1000 },
  ltr: { family: "volume", base: 1000 },
  ltrs: { family: "volume", base: 1000 },
  lt: { family: "volume", base: 1000 },
  litre: { family: "volume", base: 1000 },
  litres: { family: "volume", base: 1000 },
  liter: { family: "volume", base: 1000 },
  liters: { family: "volume", base: 1000 },
  // count (base = piece)
  unit: { family: "count", base: 1 },
  units: { family: "count", base: 1 },
  pc: { family: "count", base: 1 },
  pcs: { family: "count", base: 1 },
  piece: { family: "count", base: 1 },
  pieces: { family: "count", base: 1 },
  nos: { family: "count", base: 1 },
  no: { family: "count", base: 1 },
  dozen: { family: "count", base: 12 },
};

// Map any unit token Gemini or a title might use onto a canonical UNIT_INFO key.
function resolveUnit(token: string): { family: UnitFamily; base: number } | undefined {
  const t = token.toLowerCase().replace(/\.$/, "").trim();
  return UNIT_INFO[t] ?? UNIT_INFO[t.replace(/s$/, "")];
}

/**
 * Parse a pack size out of a listing title, expressed in the requested unit.
 * Returns the number of requested-units the pack contains, or null when the
 * title carries no compatible size (in which case we leave the price untouched).
 *
 * Handles: "5 litre", "500 ml", "25 kg", "1.5kg", "Pack of 50", "Box of 100",
 * "100 pcs", "12 x 1 L" (→ 12 L). Cross-family sizes (e.g. a litre size when the
 * user asked for "box") are ignored so we never mis-divide.
 */
function packSizeInRequestedUnit(title: string, requestedUnit: string): number | null {
  const target = UNIT_INFO[requestedUnit.toLowerCase()];
  if (!target) return null;
  const t = title.toLowerCase();

  const UNIT_RE = "kg|kgs|g|gm|gms|gram|grams|ml|l|lt|ltr|ltrs|litre|litres|liter|liters|pcs?|pieces?|units?|nos?|dozen";

  // "12 x 1 l", "6 x 500ml", "2 x 25 kg" — multiplier packs.
  const multi = t.match(new RegExp(`(\\d+)\\s*[x×]\\s*(\\d+(?:\\.\\d+)?)\\s*(${UNIT_RE})\\b`));
  if (multi) {
    const count = parseFloat(multi[1]);
    const each = parseFloat(multi[2]);
    const u = resolveUnit(multi[3]);
    if (u && u.family === target.family && count > 0 && each > 0) {
      return (count * each * u.base) / target.base;
    }
  }

  // "pack of 50", "box of 100", "set of 12" — count packs (only meaningful for
  // count-family requests like unit/box/packet/dozen).
  const ofN = t.match(/(?:pack|box|set|case|carton|combo)\s*of\s*(\d+)/);
  if (ofN && target.family === "count") {
    const n = parseFloat(ofN[1]);
    if (n > 0) return n / target.base;
  }

  // Plain "<number> <unit>" e.g. "5 litre", "(5 ltr)", "500 ml", "25kg", "100 pcs".
  // Take the LAST such match in the title — pack sizes usually trail brand/model
  // numbers ("Dell 16 ... 5 litre").
  const re = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${UNIT_RE})\\b`, "g");
  let m: RegExpExecArray | null;
  let last: { size: number; base: number; family: UnitFamily } | null = null;
  while ((m = re.exec(t)) !== null) {
    const u = resolveUnit(m[2]);
    if (u) last = { size: parseFloat(m[1]), base: u.base, family: u.family };
  }
  if (last && last.family === target.family && last.size > 0) {
    return (last.size * last.base) / target.base;
  }

  return null;
}

/**
 * Convert a whole-pack listing price into a per-requested-unit price. Leaves the
 * price unchanged when no compatible pack size is found, and refuses absurd
 * results (a mis-parsed size producing a near-zero or wild price).
 */
function normalizeListingPrice(opt: GeminiOption, requestedUnit: string): GeminiOption {
  const packSize = packSizeInRequestedUnit(opt.title, requestedUnit);
  if (!packSize || packSize <= 0) return opt;

  const perUnit = opt.price / packSize;
  // Guardrail: ignore if the division yields something implausible.
  if (!isFinite(perUnit) || perUnit < 0.01) return opt;
  // Don't bother adjusting for a "pack of 1" / size 1 — no real change.
  if (Math.abs(packSize - 1) < 1e-6) return opt;

  const perUnitRounded = Math.round(perUnit * 100) / 100;
  return {
    ...opt,
    price: perUnitRounded,
    description: `${opt.description ?? ""} • pack ${trimNum(packSize)} ${requestedUnit} @ ${formatINR(opt.price)} → ${formatINR(perUnitRounded)}/${requestedUnit}`.trim(),
  };
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

function formatINR(n: number): string {
  return `₹${trimNum(n)}`;
}

function shoppingItemToOption(r: SerperShoppingItem): GeminiOption | null {
  const price = r.priceValue ?? (r.price ? parsePrice(r.price) : null);
  if (!r.title || !price) return null;
  // Sanity: real product prices in INR. Drops stray "₹0", per-gram fragments,
  // and absurd outliers that occasionally slip through aggregation.
  if (price < 1 || price > 5_000_000) return null;

  const store = r.source?.trim() || "Google Shopping";
  const bits = [`Live price from ${store}`];
  if (typeof r.rating === "number") {
    bits.push(`${r.rating.toFixed(1)}★${r.ratingCount ? ` (${r.ratingCount})` : ""}`);
  }
  if (r.delivery) bits.push(r.delivery);

  return {
    title: r.title.replace(/\s+/g, " ").trim().slice(0, 140),
    source: store,
    price,
    url: r.link ?? null,
    // Serper shopping items already carry a real product image.
    image: r.imageUrl ?? null,
    description: bits.join(" • "),
  };
}

/**
 * Live shopping prices from Serper across a broad store directory. Fires several
 * Shopping queries (bare, buy-intent, and per-major-retailer site scopes) in
 * parallel and merges them. Prices come only from real Shopping listings —
 * never parsed out of free-text snippets — so they stay accurate.
 */
async function serperPriceOptions(heading: string): Promise<GeminiOption[]> {
  const key = await getSerperKey();
  if (!key) {
    console.warn("[Serper] No API key configured — skipping live pricing.");
    return [];
  }

  const queries = buildShoppingQueries(heading);
  const settled = await Promise.allSettled(
    queries.map((q) => serperPost<{ shopping?: SerperShoppingItem[] }>(key, "shopping", q))
  );

  const out: GeminiOption[] = [];
  for (const s of settled) {
    if (s.status !== "fulfilled" || !s.value?.shopping) continue;
    for (const r of s.value.shopping) {
      const opt = shoppingItemToOption(r);
      if (opt) out.push(opt);
    }
  }

  console.log(`[Serper] ${queries.length} queries → ${out.length} priced listings`);
  return out;
}

// ---------------------------------------------------------------------------
// WHOLESALE / B2B — bulk hospital-goods suppliers.
//
// These sites are scrape-hostile and often hide prices behind "Get Quote", so
// the reliable path is Serper site-scoped search (Google has already rendered
// and indexed their listings). Best-effort cheerio scrapers run alongside and
// fill in whenever a plain fetch happens to return parseable HTML — they never
// block the flow and degrade silently to [].
// ---------------------------------------------------------------------------

const B2B_SITES = [
  "indiamart.com",
  "tradeindia.com",
  "99wholesale.com",
  "industrybuying.com",
  "exportersindia.com",
];

// Extra suppliers worth scoping when the item is specifically medical.
const MEDICAL_B2B_SITES = ["smarmedical.com", "medikabazaar.com", "surgicalshoppe.in"];

/** Only accept an explicitly ₹/Rs/INR-marked amount — never a bare number. */
function parseRupeePrice(text: string): number | null {
  const m = text.match(/(?:₹|rs\.?|inr)\s?(\d[\d,]*(?:\.\d{1,2})?)/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function hostLabel(url: string | null): string {
  if (!url) return "B2B Supplier";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "B2B Supplier";
  }
}

async function wholesaleOptions(kind: ProductKind): Promise<GeminiOption[]> {
  const sites = kind.isMedical ? [...B2B_SITES, ...MEDICAL_B2B_SITES] : B2B_SITES;
  const [viaSerper, viaScrape] = await Promise.all([
    serperB2BSearch(kind.searchQuery, sites),
    scrapeB2B(kind.searchQuery),
  ]);
  const all = [...viaSerper, ...viaScrape];
  console.log(`[B2B] ${all.length} wholesale listings (${viaSerper.length} serper, ${viaScrape.length} scraped)`);
  return all;
}

/**
 * Serper organic search scoped to the B2B sites. B2B listings live in regular
 * search results (not Shopping), so we read the title/snippet and only keep an
 * explicitly rupee-marked price — many B2B pages quote no number ("Ask Price")
 * and are correctly skipped.
 */
async function serperB2BSearch(query: string, sites: string[]): Promise<GeminiOption[]> {
  const key = await getSerperKey();
  if (!key) return [];

  const q = `${query} wholesale price (${sites.map((s) => `site:${s}`).join(" OR ")})`;
  const data = await serperPost<{
    organic?: Array<{ title?: string; link?: string; snippet?: string }>;
  }>(key, "search", q);

  const out: GeminiOption[] = [];
  for (const r of data?.organic ?? []) {
    if (!r.title) continue;
    const price = parseRupeePrice(`${r.title} ${r.snippet ?? ""}`);
    if (!price || price < 1 || price > 5_000_000) continue;
    const store = hostLabel(r.link ?? null);
    out.push({
      title: r.title.replace(/\s+/g, " ").trim().slice(0, 140),
      source: store,
      price,
      url: r.link ?? null,
      image: null,
      description: `Wholesale/B2B listing from ${store}`,
    });
  }
  return out;
}

/**
 * Direct scrapers for B2B sites we are PERMITTED to read (ToS allowlist in
 * lib/scraping.ts). Pages are fetched through the managed scraping API
 * (JS-rendered + proxied) rather than a raw fetch, so they work reliably in
 * production. Sites not on the allowlist (e.g. IndiaMART) are intentionally
 * not scraped — their listings come from Serper's index instead. Each scraper
 * degrades to [] on any issue and never blocks the flow.
 */
async function scrapeB2B(query: string): Promise<GeminiOption[]> {
  // Only attempt direct scraping when a managed provider is configured;
  // otherwise rely entirely on Serper (raw fetch is unreliable for these sites).
  if (!(await isScrapingConfigured())) return [];

  const scrapers: Array<{ host: string; fn: (q: string) => Promise<GeminiOption[]> }> = [
    { host: "industrybuying.com", fn: scrapeIndustryBuying },
  ];

  const allowed = scrapers.filter((s) => scrapeAllowed(s.host));
  const settled = await Promise.allSettled(allowed.map((s) => s.fn(query)));
  return settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
}

async function scrapeIndustryBuying(query: string): Promise<GeminiOption[]> {
  const html = await fetchPage(
    `https://www.industrybuying.com/search/?q=${encodeURIComponent(query)}`,
    { renderJs: true }
  );
  if (!html) return [];
  try {
    const { load } = await import("cheerio");
    const $ = load(html);
    const out: GeminiOption[] = [];
    $(".prodboxcont, .product-box, .prod_main").each((_, el) => {
      if (out.length >= 8) return;
      const card = $(el);
      const title = card.find(".prodboxname, .product-name, h2, h3").first().text().trim();
      const price = parseRupeePrice(card.find(".prodboxprice, .price").first().text());
      const href = card.find("a").first().attr("href");
      if (title && price) {
        out.push({
          title: title.replace(/\s+/g, " ").slice(0, 140),
          source: "industrybuying.com",
          price,
          url: href ? new URL(href, "https://www.industrybuying.com").toString() : null,
          image: card.find("img").first().attr("src") ?? null,
          description: "B2B wholesale (IndustryBuying)",
        });
      }
    });
    return out;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// IMAGES — Gemini picks the best real image URL per option.
// ---------------------------------------------------------------------------

/**
 * Gathers real candidate image URLs from Serper's image search for the heading,
 * then asks Gemini to assign the single most relevant real URL to each option.
 * Options that already have an image (Serper shopping) keep theirs.
 */
async function attachImages(heading: string, options: GeminiOption[]): Promise<GeminiOption[]> {
  const needImages = options.filter((o) => !o.image);
  if (needImages.length === 0) return options;

  const serperKey = await getSerperKey();
  const geminiKey = await getGeminiKey();

  // Candidate real image URLs from Serper image search.
  let candidates: string[] = [];
  if (serperKey) {
    const imgs = await serperPost<{
      images?: Array<{ imageUrl?: string; title?: string }>;
    }>(serperKey, "images", heading);
    candidates = (imgs?.images ?? [])
      .map((i) => i.imageUrl)
      .filter((u): u is string => !!u && /^https?:\/\//.test(u))
      .slice(0, 12);
  }

  if (candidates.length === 0) {
    // No real candidates available — leave images null (UI shows a placeholder).
    return options;
  }

  // Without Gemini, just hand the first relevant real image to each option.
  if (!geminiKey) {
    needImages.forEach((o, i) => {
      o.image = candidates[i % candidates.length];
    });
    return options;
  }

  const chosen = await geminiPickImages(
    geminiKey,
    heading,
    needImages.map((o) => o.title),
    candidates
  );

  needImages.forEach((o, i) => {
    const url = chosen[i];
    // Only accept URLs that were in our real candidate list (no hallucinations).
    o.image = url && candidates.includes(url) ? url : candidates[i % candidates.length];
  });

  return options;
}

/**
 * Ask Gemini to map each product title to the index of the best-matching real
 * image URL. Returns one chosen URL per title (or null). Gemini only selects
 * from the candidate list — it never invents a URL.
 */
async function geminiPickImages(
  key: string,
  heading: string,
  titles: string[],
  candidates: string[]
): Promise<(string | null)[]> {
  const prompt = `You are matching product photos to listings for "${heading}".

Candidate image URLs (index: url):
${candidates.map((u, i) => `${i}: ${u}`).join("\n")}

Products that need an image (index: title):
${titles.map((t, i) => `${i}: ${t}`).join("\n")}

For each product, choose the index of the candidate image that best shows that exact product. Reply with ONLY a JSON array of integers (the chosen candidate index for each product, in order). If none fit a product, use -1. Example: [2,0,-1,5]`;

  const text = await geminiJson(key, prompt);
  if (!text) return titles.map(() => null);
  try {
    const arr = JSON.parse(text) as number[];
    return titles.map((_, i) => {
      const idx = arr[i];
      return Number.isInteger(idx) && idx >= 0 && idx < candidates.length
        ? candidates[idx]
        : null;
    });
  } catch {
    return titles.map(() => null);
  }
}

/**
 * Single place that calls Gemini's generateContent in JSON mode and returns the
 * model's text (stripped of any code fences). Returns null on any failure so
 * callers can fall back gracefully.
 */
async function geminiJson(
  key: string,
  prompt: string,
  opts: { maxOutputTokens?: number; timeoutMs?: number } = {}
): Promise<string | null> {
  const { maxOutputTokens = 1024, timeoutMs = 20000 } = opts;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
          "User-Agent": UA,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            maxOutputTokens,
            // Disable "thinking": these are structured extraction/ranking tasks.
            // Thinking burned the output-token budget and intermittently left an
            // empty response (the missing AI-summary bug), besides being slower
            // and costlier. Budget 0 makes responses fast, cheap and reliable.
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      }
    );
    if (!res.ok) {
      console.warn(`[Gemini] HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    };
    const cand = json.candidates?.[0];
    if (cand?.finishReason && cand.finishReason !== "STOP") {
      console.warn(`[Gemini] finishReason=${cand.finishReason}`);
    }
    const text = cand?.content?.parts?.[0]?.text;
    return text ? text.replace(/```json|```/g, "").trim() : null;
  } catch (e) {
    console.warn("[Gemini] request failed", e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// RELEVANCE FILTER — drop listings that aren't actually the requested product.
//
// Serper returns whatever Google Shopping matched, which includes accessories
// and adjacent products (search "handwash" → soap DISPENSERS, refill stands,
// fragrance oils). Gemini judges each listing and keeps only the ones that are
// genuinely the product the user wants. Fails open (keeps everything) when no
// Gemini key or the call fails, so we never show an empty page by accident.
// ---------------------------------------------------------------------------

/**
 * In ONE Gemini call, both (a) drop listings that aren't the requested product
 * and (b) extract each kept listing's pack size + unit, so a "(5 ltr)" pack is
 * priced per litre instead of being charged as the per-litre price. This is far
 * more robust than title regex for the endless ways sizes are written (ltr,
 * ltrs, x500ml, "set of 12", "5L can"…). Falls back to the regex parser per
 * item when Gemini omits a size, and fails open (keeps everything, regex-only)
 * when there's no key or the call fails.
 */
async function filterAndSize(
  heading: string,
  kind: ProductKind,
  unit: string,
  options: GeminiOption[]
): Promise<GeminiOption[]> {
  if (options.length === 0) return options;

  const regexOnly = () => options.map((o) => normalizeListingPrice(o, unit));

  const key = await getGeminiKey();
  if (!key) return regexOnly();

  const prompt = `A user is procuring: "${heading}" (category: ${kind.category}). They measure quantity in "${unit}".

Below are product listings found online. Some are the actual product; others are accessories, dispensers, refills, spare parts, or merely RELATED products the user does NOT want.

Listings (index: title):
${options.map((o, i) => `${i}: ${o.title}`).join("\n")}

Return ONLY a JSON array. Include an object for each listing to KEEP (a genuine "${kind.category}" the user would actually buy — exclude accessories, dispensers, holders, spare parts, related-but-different products). For each kept listing also extract its total pack size from the title:
[{"i": <index>, "size": <number>, "unit": "<unit token e.g. ml, litre, kg, g, piece, dozen>"}]
Rules: "size" is the TOTAL contents of the pack (for "12 x 500ml" size=6000 unit="ml"; for "5 ltr" size=5 unit="litre"; for "Box of 100" size=100 unit="piece"). If a listing has no clear pack size, omit "size"/"unit" for it but still include {"i": <index>}. If unsure whether to keep one, keep it.`;

  const text = await geminiJson(key, prompt);
  if (!text) return regexOnly();

  try {
    const parsed = JSON.parse(text) as Array<{ i?: number; size?: number; unit?: string }>;
    if (!Array.isArray(parsed) || parsed.length === 0) return regexOnly();

    const out: GeminiOption[] = [];
    for (const r of parsed) {
      const idx = r.i;
      if (!Number.isInteger(idx) || idx! < 0 || idx! >= options.length) continue;
      const opt = options[idx!];

      // Prefer Gemini's size; fall back to the title regex when it gave none.
      if (typeof r.size === "number" && r.size > 0 && r.unit) {
        out.push(applyPackSize(opt, r.size, r.unit, unit));
      } else {
        out.push(normalizeListingPrice(opt, unit));
      }
    }

    if (out.length === 0) return regexOnly();
    console.log(`[Gemini] filter+size: kept ${out.length}/${options.length}`);
    return out;
  } catch {
    return regexOnly();
  }
}

/**
 * Apply a Gemini-extracted pack size to convert a whole-pack price into a
 * per-requested-unit price. Only converts within the same measurement family;
 * otherwise leaves the price as-is.
 */
function applyPackSize(
  opt: GeminiOption,
  size: number,
  packUnit: string,
  requestedUnit: string
): GeminiOption {
  const target = UNIT_INFO[requestedUnit.toLowerCase()];
  const pack = resolveUnit(packUnit);
  if (!target || !pack || pack.family !== target.family) return opt;

  const packInRequested = (size * pack.base) / target.base;
  if (!(packInRequested > 0) || Math.abs(packInRequested - 1) < 1e-6) return opt;

  const perUnit = opt.price / packInRequested;
  if (!isFinite(perUnit) || perUnit < 0.01) return opt;

  const perUnitRounded = Math.round(perUnit * 100) / 100;
  return {
    ...opt,
    price: perUnitRounded,
    description: `${opt.description ?? ""} • pack ${trimNum(packInRequested)} ${requestedUnit} @ ${formatINR(opt.price)} → ${formatINR(perUnitRounded)}/${requestedUnit}`.trim(),
  };
}

// ---------------------------------------------------------------------------
// PRODUCE — eNAM wholesale mandi pricing (correct benchmark for vegetables).
// ---------------------------------------------------------------------------

const PRODUCE_HINTS =
  /vegetable|fruit|onion|potato|tomato|cabbage|carrot|spinach|methi|coriander|garlic|ginger|chilli|chili|brinjal|okra|bhindi|cauliflower|pulse|grain|spice|mandi|aloo|pyaz|tamatar|gobhi|palak|lauki|matar|grocery/i;

// Known eNAM commodity names, including the multi-word ones whose first token
// alone ("Lady", "Green", "Sweet"...) would not match the mandi data.
const KNOWN_COMMODITIES = [
  "Lady Finger", "Green Chilli", "Sweet Potato", "Bitter Gourd", "Bottle Gourd",
  "French Beans", "Cluster Beans", "Bell Pepper",
];

function extractCommodity(heading: string): string {
  const h = heading.toLowerCase();
  const multi = KNOWN_COMMODITIES.find((c) => h.includes(c.toLowerCase()));
  if (multi) return multi;
  const word = h.split(/[, ]+/).filter(Boolean)[0] || "Vegetable";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

async function enamOptions(heading: string, unit: string): Promise<GeminiOption[]> {
  const commodity = extractCommodity(heading);
  try {
    const prices = await fetchENAMPrices(commodity);
    if (prices.length === 0) return [];
    const avgQuintal = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
    const perKg = Math.round(avgQuintal / 100);
    const normalized = normalizePriceToUnit(perKg, "kg", unit);
    return [
      {
        title: `${commodity} (Wholesale Mandi)`,
        source: "eNAM Mandi",
        price: normalized,
        url: "https://enam.gov.in/web/dashboard/trade-data",
        image: null,
        description: `Official eNAM mandi price • avg ₹${avgQuintal}/quintal → per ${unit}`,
      },
    ];
  } catch (e) {
    console.warn("[eNAM] fetch failed", e);
    return [];
  }
}

async function fetchENAMPrices(commodity: string): Promise<number[]> {
  const today = new Date();
  const fromDate = new Date(today.getTime() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const toDate = today.toISOString().slice(0, 10);

  const res = await fetch("https://enam.gov.in/web/Ajax_ctrl/trade_data_list", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
    body: new URLSearchParams({
      language: "en",
      stateName: "Uttar Pradesh",
      apmcName: "Shahjahanpur",
      commodityName: commodity,
      fromDate,
      toDate,
    }).toString(),
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = (await res.json().catch(() => null)) as {
    data?: Array<{ modal_price?: string | number; min_price?: string | number }>;
  } | null;
  const prices: number[] = [];
  for (const r of json?.data ?? []) {
    const p = parseFloat(String(r.modal_price ?? r.min_price ?? 0));
    if (p > 0) prices.push(p);
  }
  return prices;
}

function normalizePriceToUnit(sourcePrice: number, sourceUnit: string, targetUnit: string): number {
  const toKg: Record<string, number> = {
    kg: 1,
    g: 0.001,
    quintal: 100,
    qtl: 100,
    tonne: 1000,
  };
  const src = toKg[sourceUnit.toLowerCase()] ?? 1;
  const tgt = toKg[targetUnit.toLowerCase()] ?? 1;
  return Math.round((sourcePrice / src) * tgt);
}

// ---------------------------------------------------------------------------
// FALLBACKS — only used when every live source is empty.
// ---------------------------------------------------------------------------

function enamMock(heading: string, unit: string): GeminiOption[] {
  const commodity = extractCommodity(heading);
  const basePrices: Record<string, number> = {
    Onion: 25, Potato: 15, Tomato: 30, Carrot: 40, Cabbage: 20,
    Cauliflower: 35, Brinjal: 45, Okra: 60, Spinach: 25,
    Garlic: 120, Ginger: 80, Chilli: 50,
  };
  const base = basePrices[commodity] ?? 30;
  return [
    {
      title: `${commodity} (Wholesale Mandi)`,
      source: "eNAM Mandi",
      price: normalizePriceToUnit(base, "kg", unit),
      url: "https://enam.gov.in/web/dashboard/trade-data",
      image: null,
      description: `Estimated mandi rate (live eNAM data unavailable) • per ${unit}`,
    },
  ];
}

function retailMock(heading: string, unit: string): GeminiOption[] {
  const base = heading.split(",")[0].trim() || "Product";
  const p = 8000 + (base.length % 7) * 1200;
  return [
    {
      title: `${base} — Standard`,
      source: "Estimate",
      price: Math.round(p),
      url: `https://www.google.com/search?q=${encodeURIComponent(heading + " price india")}&tbm=shop`,
      image: null,
      description: `No live listings found — rough estimate. Verify before approval. Unit: ${unit}`,
    },
  ];
}
