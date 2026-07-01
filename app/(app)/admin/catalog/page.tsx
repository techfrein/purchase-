import { ActivityList, ActivityRow, Card, CardHeader, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { fetchCategories } from "@/lib/categories";
import { formatDate, inr } from "@/lib/format";
import { fetchReferencePrices } from "@/lib/queries";
import CatalogManager from "./CatalogManager";

export default async function CatalogPage() {
  await requireAdmin();
  const [rows, categories] = await Promise.all([fetchReferencePrices(), fetchCategories()]);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Reference Price Catalog"
        description={`Benchmark prices when online stores are unreachable (${rows.length} entries).`}
      />

      <Card className="mb-6 overflow-hidden">
        <CardHeader title="Add Reference Price" />
        <div className="p-5">
          <CatalogManager mode="create" categories={categories} />
        </div>
      </Card>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-[var(--line)] bg-white p-10 text-center text-base text-slate-500">
          Catalog is empty.
        </div>
      ) : (
        <ActivityList>
          {rows.map((r) => (
            <ActivityRow
              key={r.id}
              icon="₹"
              title={r.product_name}
              subtitle={[r.category, r.brand, r.model].filter(Boolean).join(" · ") || "—"}
              meta={formatDate(r.updated_at)}
              trailing={
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold text-slate-900">{inr(Number(r.price))}</span>
                  <CatalogManager mode="delete" entryId={r.id} />
                </div>
              }
            />
          ))}
        </ActivityList>
      )}
    </div>
  );
}