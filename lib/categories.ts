import { getSetting, getSupabase, setSetting } from "./db";

export const DEFAULT_PURCHASE_CATEGORIES = [
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
  if (stored) return stored;

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