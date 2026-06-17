import Link from "next/link";
import { StatusBadge, VerdictBadge } from "@/components/badges";
import {
  IconAlert,
  IconCheck,
  IconCurrency,
  IconPlus,
  IconReceipt,
  IconTrending,
} from "@/components/icons";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  StatCard,
} from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getSetting } from "@/lib/db";
import { formatDate, inr } from "@/lib/format";
import { dashboardCounts, fetchPurchases } from "@/lib/queries";

export default async function DashboardPage() {
  await requireUser();
  const hospitalName = await getSetting("hospital_name");
  const counts = await dashboardCounts();

  const flagged = await fetchPurchases({
    limit: 5,
    filters: { verdict: "BETTER_PRICE_AVAILABLE", status: "PENDING_REVIEW" },
    order: { column: "potential_saving", ascending: false },
  });

  const recent = await fetchPurchases({ limit: 8 });

  return (
    <div>
      <div className="mb-6 rounded-xl border border-sky-100 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Welcome to</p>
            <h1 className="mt-0.5 text-xl font-semibold text-slate-800 sm:text-2xl">{hospitalName}</h1>
            <p className="mt-2 max-w-lg text-sm text-slate-600">
              Monitor purchase requests, verify prices, and track savings across departments.
            </p>
          </div>
          <Button href="/purchases/new">
            <IconPlus className="h-4 w-4" />
            New Request
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Purchases" value={String(counts.total)} icon={<IconReceipt className="h-5 w-5" />} accent="slate" />
        <StatCard label="Pending Review" value={String(counts.pending ?? 0)} icon={<IconAlert className="h-5 w-5" />} accent="amber" />
        <StatCard label="Approved" value={String(counts.approved ?? 0)} icon={<IconCheck className="h-5 w-5" />} accent="green" />
        <StatCard label="Flagged Overpriced" value={String(counts.flagged ?? 0)} icon={<IconTrending className="h-5 w-5" />} accent="red" />
        <StatCard label="Total Value" value={inr(counts.spend)} icon={<IconCurrency className="h-5 w-5" />} accent="blue" />
        <StatCard label="Potential Savings" value={inr(counts.savings)} icon={<IconCurrency className="h-5 w-5" />} accent="violet" />
      </div>

      {flagged.length > 0 && (
        <Card className="mt-8 overflow-hidden border-red-200">
          <div className="flex items-center gap-3 border-b border-red-100 bg-red-50 px-5 py-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <IconAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-red-800">Flagged purchases awaiting review</h2>
              <p className="text-xs text-red-600/80">Better prices found online for these items</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table-modern w-full min-w-[32rem] text-sm">
              <tbody>
                {flagged.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3.5">
                      <Link href={`/purchases/${p.id}`} className="font-semibold text-sky-700 hover:underline">
                        {String(p.ref_no)}
                      </Link>
                      <div className="mt-0.5 text-slate-600">{String(p.product_name)}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{String(p.vendor_name) || "—"}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="font-medium text-slate-900">
                        {inr(p.unit_price as number | null)} × {Number(p.quantity)}
                      </div>
                      <div className="text-xs font-semibold text-red-600">
                        Save {inr(p.potential_saving as number | null)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card className="mt-8 overflow-hidden">
        <CardHeader
          title="Recent Purchases"
          action={
            <Link href="/purchases" className="text-sm font-semibold text-sky-700 hover:underline">
              View all →
            </Link>
          }
        />
        {recent.length === 0 ? (
          <EmptyState message='No purchases recorded yet. Add one with "New Request" or import an Excel sheet.' />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-modern w-full min-w-[40rem] text-sm">
              <thead>
                <tr>
                  <th>Ref / Product</th>
                  <th>Entered By</th>
                  <th className="text-right">Amount</th>
                  <th>Verdict</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/purchases/${p.id}`} className="font-semibold text-teal-700 hover:underline">
                        {String(p.ref_no)}
                      </Link>
                      <div className="max-w-65 truncate text-slate-500">{String(p.product_name)}</div>
                    </td>
                    <td className="text-slate-600">{p.created_by_name}</td>
                    <td className="text-right font-medium text-slate-900">
                      {p.unit_price != null ? inr(Number(p.unit_price) * Number(p.quantity)) : "—"}
                    </td>
                    <td><VerdictBadge verdict={String(p.verdict)} /></td>
                    <td><StatusBadge status={String(p.status)} /></td>
                    <td className="text-slate-500">{formatDate(String(p.created_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}