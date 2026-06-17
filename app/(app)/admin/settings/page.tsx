import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/db";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  await requireAdmin();
  const settings = {
    hospital_name: await getSetting("hospital_name"),
    tolerance_pct: await getSetting("tolerance_pct"),
    serper_key: await getSetting("serper_key"),
    scrape_enabled: await getSetting("scrape_enabled"),
    catalog_enabled: await getSetting("catalog_enabled"),
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Settings"
        description="Price verification thresholds and data sources."
      />
      <SettingsForm initial={settings} />
    </div>
  );
}