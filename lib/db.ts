import { cache } from "react";
import { getSupabase } from "./supabase";

export const DEFAULT_SETTINGS: Record<string, string> = {
  tolerance_pct: "10",
  serper_key: "9fa3a931b65a84103e525d2f4de6bd0b3a84c36f",
  scrape_enabled: "1",
  catalog_enabled: "1",
  hospital_name: "Varun Arjun Medical College",
};

// Deduped per request — getSetting("hospital_name") is read by both the app
// layout and the dashboard page on a single render.
export const getSetting = cache(async function getSetting(key: string): Promise<string> {
  const { data, error } = await getSupabase().from("settings").select("value").eq("key", key).maybeSingle();
  if (error) throw error;
  const stored = data?.value?.trim() ?? "";
  if (key === "serper_key") {
    if (stored) return stored;
    return process.env.SERPER_API_KEY?.trim() || DEFAULT_SETTINGS.serper_key;
  }
  return stored || (DEFAULT_SETTINGS[key] ?? "");
});

export async function isSerperConfigured(): Promise<boolean> {
  return (await getSetting("serper_key")).trim().length > 0;
}

export async function setSetting(key: string, value: string) {
  const { error } = await getSupabase().from("settings").upsert({ key, value });
  if (error) throw error;
}

/** Monthly sequential ref like PUR-202606-0001 */
export async function nextRefNo(): Promise<string> {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `PUR-${ym}-`;
  const { data, error } = await getSupabase()
    .from("purchases")
    .select("ref_no")
    .like("ref_no", `${prefix}%`)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const seq = data?.ref_no ? parseInt(data.ref_no.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export { getSupabase };