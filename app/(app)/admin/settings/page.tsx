import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getSetting, getSupabase } from "@/lib/db";
import { fetchCategories } from "@/lib/categories";
import CategoryManager from "./CategoryManager";
import DangerZone from "./DangerZone";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const user = await requireAdmin();
  const isOwner = user.role === "OWNER";
  const [geminiRow, serperRow, hospitalName, tolerancePct, catalogEnabled, categories] =
    await Promise.all([
      getSupabase().from("settings").select("value").eq("key", "gemini_key").maybeSingle(),
      getSupabase().from("settings").select("value").eq("key", "serper_key").maybeSingle(),
      getSetting("hospital_name"),
      getSetting("tolerance_pct"),
      getSetting("catalog_enabled"),
      fetchCategories(),
    ]);
  const settings = {
    hospital_name: hospitalName,
    tolerance_pct: tolerancePct,
    serper_key: serperRow.data?.value ?? "",
    gemini_key: geminiRow.data?.value ?? "",
    catalog_enabled: catalogEnabled,
    scrape_enabled: "0",
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Settings"
        description="Gemini key for product research + categories."
      />
      <div className="mb-6">
        <CategoryManager initial={categories} />
      </div>
      <SettingsForm initial={settings} serperConfigured={false} />
      {isOwner && <DangerZone />}
    </div>
  );
}