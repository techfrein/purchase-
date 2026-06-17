import Link from "next/link";
import { StatusBadge, VerdictBadge } from "@/components/badges";
import { IconPlus } from "@/components/icons";
import {
  Button,
  DataTable,
  EmptyState,
  FilterBar,
  FilterField,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { isAdminLike, requireUser } from "@/lib/auth";
import { unitLabel } from "@/lib/categories";
import { formatDate, inr, STATUS_LABELS, VERDICT_LABELS } from "@/lib/format";
import { fetchPurchases } from "@/lib/queries";
import RowActions from "./RowActions";

type SearchParams = Promise<{ status?: string; verdict?: string; q?: string }>;

export default async function PurchasesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const { status = "", verdict = "", q = "" } = await searchParams;

  const filters: { status?: string; verdict?: string; q?: string } = {};
  if (status && STATUS_LABELS[status]) filters.status = status;
  if (verdict && VERDICT_LABELS[verdict]) filters.verdict = verdict;
  if (q) filters.q = q;

  const rows = await fetchPurchases({ viewer: user, limit: 500, filters });

  const canDecide = isAdminLike(user.role); // OWNER + ADMIN
  const canDelete = user.role === "OWNER";
  const showActions = canDecide || canDelete;

  return (
    <div>
      <PageHeader
        title="Purchases"
        description={`${rows.length} record(s) in the system`}
        action={
          <Button href="/purchases/new">
            <IconPlus className="h-4 w-4" />
            New Request
          </Button>
        }
      />

      <form method="GET">
        <FilterBar>
          <FilterField label="Search">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Product, ref no or vendor…"
              className={`${inputClass} !mt-0 sm:w-56`}
            />
          </FilterField>
          <FilterField label="Status">
            <select name="status" defaultValue={status} className={`${inputClass} !mt-0`}>
              <option value="">All</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Price Verdict">
            <select name="verdict" defaultValue={verdict} className={`${inputClass} !mt-0`}>
              <option value="">All</option>
              {Object.entries(VERDICT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </FilterField>
          <div className="flex items-center gap-2">
            <button type="submit" className="btn btn-dark flex-1 sm:flex-none">Filter</button>
            <Link href="/purchases" className="px-2 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">
              Reset
            </Link>
          </div>
        </FilterBar>
      </form>

      <DataTable>
        {rows.length === 0 ? (
          <tbody>
            <tr><td colSpan={showActions ? 11 : 10}><EmptyState message="No purchases match these filters." /></td></tr>
          </tbody>
        ) : (
          <>
            <thead>
              <tr>
                <th>Ref No</th>
                <th>Product</th>
                <th>Category</th>
                <th>Vendor</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Unit Price</th>
                <th className="text-right">Total</th>
                <th>Verdict</th>
                <th>Status</th>
                <th>Entered</th>
                {showActions && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/purchases/${p.id}`} className="font-medium text-emerald-700 hover:underline">
                      {String(p.ref_no)}
                    </Link>
                  </td>
                  <td className="max-w-60 truncate text-slate-700">{String(p.product_name)}</td>
                  <td className="text-slate-600">{String(p.category)}</td>
                  <td className="text-slate-600">{String(p.vendor_name) || "—"}</td>
                  <td className="text-right text-slate-700">{Number(p.quantity)} {unitLabel(String(p.unit ?? "unit"))}</td>
                  <td className="text-right text-slate-700">{inr(p.unit_price as number | null)}</td>
                  <td className="text-right font-semibold text-slate-900">
                    {p.unit_price != null ? inr(Number(p.unit_price) * Number(p.quantity)) : "—"}
                  </td>
                  <td><VerdictBadge verdict={String(p.verdict)} /></td>
                  <td><StatusBadge status={String(p.status)} /></td>
                  <td className="text-slate-500">
                    <div>{formatDate(String(p.created_at))}</div>
                    <div className="text-xs">{p.created_by_name}</div>
                  </td>
                  {showActions && (
                    <td className="text-right">
                      <RowActions
                        purchaseId={Number(p.id)}
                        refNo={String(p.ref_no)}
                        status={String(p.status)}
                        canDecide={canDecide}
                        canDelete={canDelete}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </>
        )}
      </DataTable>
    </div>
  );
}