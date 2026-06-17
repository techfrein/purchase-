import { AlertBanner, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getSetting, getSupabase, isSerperConfigured } from "@/lib/db";
import { fetchCategories } from "@/lib/categories";
import CategoryManager from "./CategoryManager";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  await requireAdmin();
  const [serperConfigured, serperRow, hospitalName, tolerancePct, scrapeEnabled, catalogEnabled, categories] =
    await Promise.all([
      isSerperConfigured(),
      getSupabase().from("settings").select("value").eq("key", "serper_key").maybeSingle(),
      getSetting("hospital_name"),
      getSetting("tolerance_pct"),
      getSetting("scrape_enabled"),
      getSetting("catalog_enabled"),
      fetchCategories(),
    ]);
  const settings = {
    hospital_name: hospitalName,
    tolerance_pct: tolerancePct,
    serper_key: serperRow.data?.value ?? "",
    scrape_enabled: scrapeEnabled,
    catalog_enabled: catalogEnabled,
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Settings"
        description="Price verification thresholds and data sources."
      />
      {!serperConfigured && (
        <div className="mb-6">
          <AlertBanner variant="warning">
            Online price checks are unreliable without a Serper.dev API key. Amazon and Flipkart
            scraping often returns no results. Add a key below or set{" "}
            <code className="rounded bg-amber-100/80 px-1">SERPER_API_KEY</code> in{" "}
            <code className="rounded bg-amber-100/80 px-1">.env.local</code> and restart the app.
          </AlertBanner>
        </div>
      )}
      <div className="mb-6">
        <CategoryManager initial={categories} />
      </div>
      <SettingsForm initial={settings} serperConfigured={serperConfigured} />
    </div>
  );
}