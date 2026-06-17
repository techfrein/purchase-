import type { ClassifiedListing, Listing, ProductInput } from "./types";

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "with", "for", "of", "in", "on", "new", "latest",
]);

// Listings for add-ons (covers, cartridges, mounts…) often contain the exact
// brand + model of the main product and would otherwise classify as
// SAME_PRODUCT at a fraction of the real price.
const ACCESSORY_WORDS = [
  "cover", "case", "pouch", "sleeve", "bag", "skin", "sticker", "guard", "protector",
  "cartridge", "toner", "ink", "refill", "ribbon", "drum",
  "stand", "mount", "bracket", "holder", "tray", "trolley",
  "remote", "adapter", "charger", "cable", "wire", "battery", "strap", "belt",
  "spare", "compatible", "replacement", "accessory", "accessories", "tempered",
];

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

/** Extracts spec-like tokens: "55 inch", "8gb", "1.5 ton", "5l", "2mp" etc. */
export function specTokens(text: string): string[] {
  const normalized = text.toLowerCase().replace(/(\d)\s+(inch|in|cm|gb|tb|mah|mp|hz|w|kw|ton|l|litre|liter|va|para|function|channel)\b/g, "$1$2");
  const matches = normalized.match(/\d+(?:\.\d+)?(?:inch|in|cm|gb|tb|mah|mp|hz|kw|ton|litre|liter|l|va|w|para|function|channel)\b/g);
  return matches ? [...new Set(matches)] : [];
}

function overlapRatio(needles: string[], haystack: Set<string>): number {
  if (needles.length === 0) return 0;
  let hits = 0;
  for (const n of needles) if (haystack.has(n)) hits++;
  return hits / needles.length;
}

/**
 * Classifies a listing against the purchased product:
 *  - SAME_PRODUCT: brand + model both appear, or near-total name overlap
 *  - SIMILAR: same brand and substantial name overlap
 *  - SAME_SPEC: key specifications match (e.g. another 55" 4K TV)
 *  - ALTERNATIVE: same category of product, different make
 * Returns null when the listing is too unrelated to be useful.
 */
export function classifyListing(input: ProductInput, listing: Listing): ClassifiedListing | null {
  const titleTokens = new Set(tokenize(listing.title));
  const titleRaw = listing.title.toLowerCase();

  // Discard accessory listings — unless the purchased item itself is that
  // accessory (e.g. buying toner: "toner" appears in the input name).
  const inputAll = new Set(tokenize(`${input.productName} ${input.specs} ${input.category}`));
  if (ACCESSORY_WORDS.some((w) => titleTokens.has(w) && !inputAll.has(w))) return null;

  const nameTokens = tokenize(input.productName);
  const brandTokens = tokenize(input.brand);
  const modelTokens = tokenize(input.model);
  const categoryTokens = tokenize(input.category);
  const inputSpecs = [...new Set([...specTokens(input.specs), ...specTokens(input.productName)])];

  const nameOverlap = overlapRatio(nameTokens, titleTokens);
  const brandMatch =
    brandTokens.length > 0 &&
    (brandTokens.every((t) => titleTokens.has(t)) || titleRaw.includes(input.brand.toLowerCase().trim()));
  const modelMatch =
    modelTokens.length > 0 &&
    (titleRaw.includes(input.model.toLowerCase().trim()) ||
      overlapRatio(modelTokens, titleTokens) >= 0.8);
  const listingSpecs = specTokens(listing.title);
  const specHits = inputSpecs.filter((s) => listingSpecs.includes(s)).length;

  // Name overlap excluding the brand word, so two unrelated products from the
  // same brand (e.g. an iPhone and a MacBook, both "Apple") don't look related.
  const brandSet = new Set(brandTokens);
  const nonBrandName = nameTokens.filter((t) => !brandSet.has(t));
  const productOverlap = overlapRatio(nonBrandName, titleTokens);

  // A real category signal: the listing names the product category itself
  // (e.g. "smartphone", "television"). Brand sharing alone is NOT a category.
  const categoryInTitle = categoryTokens.some((t) => titleTokens.has(t));

  if (brandMatch && modelMatch) {
    return { ...listing, matchType: "SAME_PRODUCT", matchScore: round(0.9 + nameOverlap * 0.1) };
  }
  if (nameOverlap >= 0.8 || (brandMatch && productOverlap >= 0.5)) {
    return { ...listing, matchType: "SAME_PRODUCT", matchScore: round(0.75 + nameOverlap * 0.2) };
  }
  if (brandMatch && productOverlap >= 0.3) {
    return { ...listing, matchType: "SIMILAR", matchScore: round(0.5 + productOverlap * 0.3) };
  }
  if (inputSpecs.length > 0 && specHits >= Math.min(2, inputSpecs.length) && (categoryInTitle || productOverlap >= 0.25)) {
    return { ...listing, matchType: "SAME_SPEC", matchScore: round(0.4 + (specHits / inputSpecs.length) * 0.3) };
  }
  // An alternative is a *different make of the same kind of product*: it must
  // share the product category AND have real (non-brand) name overlap.
  if (categoryInTitle && productOverlap >= 0.2) {
    return { ...listing, matchType: "ALTERNATIVE", matchScore: round(0.2 + productOverlap * 0.3) };
  }
  return null;
}

function round(n: number): number {
  return Math.round(Math.min(1, n) * 100) / 100;
}
