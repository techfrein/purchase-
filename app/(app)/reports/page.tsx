import { DonutGauge } from "@/components/charts";
import { IconDownload } from "@/components/icons";
import {
  Card,
  CardHeader,
  EmptyState,
  FilterBar,
  FilterField,
  PageHeader,
  StatCard,
  inputClass,
} from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { inr, STATUS_LABELS, VERDICT_LABELS } from "@/lib/format";
import { aggregateReport, fetchPurchasesForReport } from "@/lib/queries";

type SearchParams = Promise<{ status?: string; verdict?: string; from?: string; to?: string }>;

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const { status = "", verdict = "", from = "", to = "" } = await searchParams;

  const filters: { status?: string; verdict?: string; from?: string; to?: string } = {};
  if (status && STATUS_LABELS[status]) filters.status = status;
  if (verdict && VERDICT_LABELS[verdict]) filters.verdict = verdict;
  if (from) filters.from = from;
  if (to) filters.to = to;

  const rows = await fetchPurchasesForReport(user, filters);
  const { summary, byCategory, byVendor } = aggregateReport(rows);

  const exportQuery = new URLSearchParams(
    Object.entries({ status, verdict, from, to }).filter(([, v]) => v)
  ).toString();

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Spending analysis and price flagging summary"
        action={
          <a href={`/api/reports/export${exportQuery ? "?" + exportQuery : ""}`} className="btn btn-dark">
            <IconDownload className="h-4 w-4" />
            Export to Excel
          </a>
        }
      />

      <form method="GET">
        <FilterBar>
          <FilterField label="From">
            <input type="date" name="from" defaultValue={from} className={`${inputClass} !mt-0`} />
          </FilterField>
          <FilterField label="To">
            <input type="date" name="to" defaultValue={to} className={`${inputClass} !mt-0`} />
          </FilterField>
          <FilterField label="Status">
            <select name="status" defaultValue={status} className={`${inputClass} !mt-0`}>
              <option value="">All</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Verdict">
            <select name="verdict" defaultValue={verdict} className={`${inputClass} !mt-0`}>
              <option value="">All</option>
              {Object.entries(VERDICT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </FilterField>
          <button type="submit" className="btn btn-dark">Apply</button>
        </FilterBar>
      </form>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <StatCard label="Purchases" value={String(summary.total)} icon={<span className="text-lg font-bold">#</span>} accent="slate" />
          <StatCard label="Total Value" value={inr(summary.value)} icon={<span className="text-lg font-bold">₹</span>} accent="blue" />
          <StatCard label="Flagged Overpriced" value={String(summary.flagged ?? 0)} icon={<span className="text-lg font-bold">!</span>} accent="red" />
          <StatCard label="Potential Savings" value={inr(summary.savings)} icon={<span className="text-lg font-bold">↓</span>} accent="green" />
        </div>
        <Card>
          <CardHeader title="Flag Rate" subtitle="Overpriced share" />
          <div className="px-5 pb-5">
            <DonutGauge
              value={summary.total > 0 ? (summary.flagged / summary.total) * 100 : 0}
              label="Flagged"
              sublabel={`${summary.flagged} of ${summary.total}`}
            />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title="By Category" />
          <div className="overflow-x-auto">
            <table className="table-modern w-full text-sm">
              <tbody>
                {byCategory.map((c) => (
                  <tr key={c.category}>
                    <td className="font-medium text-slate-700">{c.category}</td>
                    <td className="text-right text-slate-500">{c.cnt} item(s)</td>
                    <td className="text-right font-semibold text-slate-900">{inr(c.value)}</td>
                    <td className="text-right">
                      {c.flagged > 0 ? (
                        <span className="text-xs font-semibold text-red-600">{c.flagged} flagged</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {byCategory.length === 0 && (
                  <tr><td colSpan={4}><EmptyState message="No data" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="By Vendor" subtitle="Most flagged first" />
          <div className="overflow-x-auto">
            <table className="table-modern w-full text-sm">
              <tbody>
                {byVendor.map((v) => (
                  <tr key={v.vendor_name}>
                    <td className="font-medium text-slate-700">{v.vendor_name}</td>
                    <td className="text-right text-slate-500">{v.cnt} item(s)</td>
                    <td className="text-right font-semibold text-slate-900">{inr(v.value)}</td>
                    <td className="text-right">
                      {v.flagged > 0 ? (
                        <span className="text-xs font-semibold text-red-600">{v.flagged} flagged</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {byVendor.length === 0 && (
                  <tr><td colSpan={4}><EmptyState message="No vendor data" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}