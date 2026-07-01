import { getSetting, getSupabase, setSetting } from "./db";

export const DEFAULT_PURCHASE_CATEGORIES = [
  "Vegetable",
  "Fruit",
  "Television",
  "Laptop",
  "Desktop Computer",
  "Smartphone",
  "Tablet",
  "Monitor",
  "Printer",
  "Medical Equipment",
  "Hospital Furniture",
  "Air Conditioner",
  "Refrigerator",
  "Washing Machine",
  "Water Purifier",
  "UPS",
  "Networking",
  "Security",
  "Accessories",
  "Other",
];

/** Units of measure a purchase quantity can be expressed in. */
export const PURCHASE_UNITS = [
  { value: "unit", label: "Units (pcs)" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "g", label: "Grams (g)" },
  { value: "litre", label: "Litres (L)" },
  { value: "ml", label: "Millilitres (ml)" },
  { value: "metre", label: "Metres (m)" },
  { value: "cm", label: "Centimetres (cm)" },
  { value: "dozen", label: "Dozen" },
  { value: "quintal", label: "Quintal" },
  { value: "box", label: "Box" },
  { value: "packet", label: "Packet" },
];

const UNIT_VALUES = new Set(PURCHASE_UNITS.map((u) => u.value));

export function normalizeUnit(value: unknown): string {
  const v = String(value ?? "").trim().toLowerCase();
  return UNIT_VALUES.has(v) ? v : "unit";
}

/**
 * Guess the natural unit of measure from a free-text product name, so the
 * new-request form can auto-select it as the user types. This is a pure keyword
 * heuristic (no network, no LLM) — it runs on every keystroke, and the user can
 * always override the result, so it deliberately avoids any API cost.
 */
export function inferUnit(name: string): string {
  const h = name.toLowerCase();
  if (/\b(oil|milk|water|juice|paint|diesel|petrol|fuel|sanitizer|phenyl|disinfectant|syrup|detergent|bleach|liquid)\b/.test(h))
    return "litre";
  if (/\b(vegetable|fruit|onion|potato|tomato|cabbage|carrot|spinach|rice|wheat|flour|atta|sugar|salt|dal|pulse|grain|spice|cement|sand|powder)\b/.test(h))
    return "kg";
  if (/\b(cable|wire|rope|cloth|fabric|pipe|hose|tube)\b/.test(h)) return "metre";
  if (/\b(glove|mask|syringe|bandage|carton)\b/.test(h)) return "box";
  return "unit";
}

/** Short suffix for display, e.g. "5 kg", "2 L", "3 pcs". */
export function unitLabel(value: string): string {
  switch (value) {
    case "kg": return "kg";
    case "g": return "g";
    case "litre": return "L";
    case "ml": return "ml";
    case "metre": return "m";
    case "cm": return "cm";
    case "dozen": return "dozen";
    case "quintal": return "qtl";
    case "box": return "box";
    case "packet": return "pkt";
    default: return "pcs";
  }
}

const SETTINGS_KEY = "purchase_categories";

function parseCategories(raw: string): string[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const names = parsed.map((c) => String(c).trim()).filter(Boolean);
    return names.length > 0 ? names : null;
  } catch {
    return null;
  }
}

export async function fetchCategories(): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from("settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();
  if (error) throw error;
  const stored = data?.value ? parseCategories(data.value) : null;

  if (stored) {
    // Merge in any newly-shipped default categories (e.g. Vegetable, Fruit)
    // that aren't in the stored list yet, without disturbing custom ones or
    // their order. Persist only when something actually changed.
    const lower = new Set(stored.map((c) => c.toLowerCase()));
    const missing = DEFAULT_PURCHASE_CATEGORIES.filter((c) => !lower.has(c.toLowerCase()));
    if (missing.length === 0) return stored;
    const merged = [...missing, ...stored];
    await setSetting(SETTINGS_KEY, JSON.stringify(merged));
    return merged;
  }

  await setSetting(SETTINGS_KEY, JSON.stringify(DEFAULT_PURCHASE_CATEGORIES));
  return [...DEFAULT_PURCHASE_CATEGORIES];
}

export async function addCategory(name: string): Promise<string[]> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required.");
  if (trimmed.length > 80) throw new Error("Category name is too long.");

  const categories = await fetchCategories();
  if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
    return categories;
  }

  const next = [...categories, trimmed].sort((a, b) => a.localeCompare(b));
  await setSetting(SETTINGS_KEY, JSON.stringify(next));
  return next;
}