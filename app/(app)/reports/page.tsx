import { DonutGauge } from "@/components/charts";
import { IconDownload } from "@/components/icons";
import {
  ActivityList,
  ActivityRow,
  Card,
  CardHeader,
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
        <div>
          <div className="mb-3 px-1 text-xl font-bold tracking-tight text-slate-900">By Category</div>
          {byCategory.length === 0 ? (
            <div className="rounded-3xl border border-[var(--line)] bg-white p-10 text-center text-base text-slate-500">No data</div>
          ) : (
            <ActivityList>
              {byCategory.map((c) => (
                <ActivityRow
                  key={c.category}
                  icon="#"
                  title={c.category}
                  subtitle={`${c.cnt} item(s)${c.flagged > 0 ? ` · ${c.flagged} flagged` : ""}`}
                  meta={inr(c.value)}
                />
              ))}
            </ActivityList>
          )}
        </div>

        <div>
          <div className="mb-3 px-1 text-xl font-bold tracking-tight text-slate-900">By Vendor</div>
          {byVendor.length === 0 ? (
            <div className="rounded-3xl border border-[var(--line)] bg-white p-10 text-center text-base text-slate-500">No vendor data</div>
          ) : (
            <ActivityList>
              {byVendor.map((v) => (
                <ActivityRow
                  key={v.vendor_name}
                  icon="🏪"
                  title={v.vendor_name}
                  subtitle={`${v.cnt} item(s)${v.flagged > 0 ? ` · ${v.flagged} flagged` : ""}`}
                  meta={inr(v.value)}
                />
              ))}
            </ActivityList>
          )}
        </div>
      </div>
    </div>
  );
}