import { Card, CardHeader, DataTable, EmptyState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { formatDate, inr } from "@/lib/format";
import { fetchReferencePrices } from "@/lib/queries";
import CatalogManager from "./CatalogManager";

export default async function CatalogPage() {
  await requireAdmin();
  const rows = await fetchReferencePrices();

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Reference Price Catalog"
        description={`Benchmark prices used when online stores are unreachable. Keep these updated with verified market rates (${rows.length} entries).`}
      />

      <Card className="mb-6 overflow-hidden">
        <CardHeader title="Add Reference Price" />
        <div className="p-5">
          <CatalogManager mode="create" />
        </div>
      </Card>

      <DataTable>
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Brand / Model</th>
            <th className="text-right">Price</th>
            <th>Updated</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="max-w-72 truncate font-medium text-slate-700">{r.product_name}</td>
              <td className="text-slate-600">{r.category}</td>
              <td className="text-slate-600">
                {[r.brand, r.model].filter(Boolean).join(" / ") || "—"}
              </td>
              <td className="text-right font-semibold text-slate-900">{inr(Number(r.price))}</td>
              <td className="text-slate-500">{formatDate(r.updated_at)}</td>
              <td className="text-right">
                <CatalogManager mode="delete" entryId={r.id} />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={6}><EmptyState message="Catalog is empty." /></td></tr>
          )}
        </tbody>
      </DataTable>
    </div>
  );
}