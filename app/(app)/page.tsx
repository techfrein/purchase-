import Link from "next/link";
import { StatusBadge, VerdictBadge } from "@/components/badges";
import { BarTrend, DonutGauge } from "@/components/charts";
import {
  IconAlert,
  IconCheck,
  IconCurrency,
  IconPlus,
  IconReceipt,
  IconTrending,
} from "@/components/icons";
import VinkuraAnalyser from "@/components/VinkuraAnalyser";
import { Button, Card, CardHeader, EmptyState, StatCard } from "@/components/ui";
import { analysePurchase } from "@/lib/analyser";
import { isAdminLike, requireUser } from "@/lib/auth";
import { getSetting } from "@/lib/db";
import { formatDate, inr } from "@/lib/format";
import { dashboardCounts, fetchPurchases } from "@/lib/queries";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default async function DashboardPage() {
  const user = await requireUser();

  // Independent reads run concurrently rather than as sequential round-trips.
  const [hospitalName, counts, flagged, recent] = await Promise.all([
    getSetting("hospital_name"),
    dashboardCounts(user),
    fetchPurchases({
      viewer: user,
      limit: 5,
      filters: { verdict: "BETTER_PRICE_AVAILABLE", status: "PENDING_REVIEW" },
      order: { column: "potential_saving", ascending: false },
    }),
    fetchPurchases({ viewer: user, limit: 40 }),
  ]);

  // Weekly activity, derived from the rows we already have (no extra query).
  const week = WEEKDAYS.map((label) => ({ label, value: 0 }));
  for (const p of recent) {
    const d = new Date(String(p.created_at));
    if (!isNaN(d.getTime())) week[d.getDay()].value += 1;
  }

  const decided = counts.approved + counts.flagged;
  const approvalRate = decided > 0 ? (counts.approved / decided) * 100 : 0;
  const recentTop = recent.slice(0, 7);

  // Vinkura insight for the highest-impact flagged purchase (admins/owner only).
  const topFlagged = flagged[0];
  const topInsight =
    isAdminLike(user.role) && topFlagged
      ? analysePurchase({
          unitPrice: topFlagged.unit_price != null ? Number(topFlagged.unit_price) : null,
          quantity: Number(topFlagged.quantity),
          bestOnlinePrice:
            topFlagged.best_online_price != null ? Number(topFlagged.best_online_price) : null,
          bestOnlineSource: topFlagged.best_online_source as string | null,
          potentialSaving:
            topFlagged.potential_saving != null ? Number(topFlagged.potential_saving) : null,
          verdict: String(topFlagged.verdict),
        })
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor purchase requests, verify prices, and track savings across {hospitalName}.
          </p>
        </div>
        <Button href="/purchases/new">
          <IconPlus className="h-4 w-4" />
          New Request
        </Button>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Purchases"
          value={String(counts.total)}
          icon={<IconReceipt className="h-5 w-5" />}
          featured
          href="/purchases"
          caption="All requests on record"
        />
        <StatCard
          label="Pending Review"
          value={String(counts.pending ?? 0)}
          icon={<IconAlert className="h-5 w-5" />}
          accent="amber"
          href="/purchases?status=PENDING_REVIEW"
        />
        <StatCard
          label="Approved"
          value={String(counts.approved ?? 0)}
          icon={<IconCheck className="h-5 w-5" />}
          accent="green"
          href="/purchases?status=APPROVED"
        />
        <StatCard
          label="Flagged Overpriced"
          value={String(counts.flagged ?? 0)}
          icon={<IconTrending className="h-5 w-5" />}
          accent="red"
          href="/purchases?verdict=BETTER_PRICE_AVAILABLE"
        />
      </div>

      {/* Vinkura insight for the highest-impact flagged purchase */}
      {topInsight && topFlagged && (
        <Link href={`/purchases/${topFlagged.id}`} className="block transition hover:opacity-95">
          <VinkuraAnalyser insight={topInsight} />
        </Link>
      )}

      {/* Analytics + gauge + value */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Purchase Activity"
            subtitle="New requests entered this week"
            action={
              <Link href="/reports" className="text-sm font-semibold text-primary hover:underline">
                Reports →
              </Link>
            }
          />
          <div className="px-5 pb-5">
            <BarTrend data={week} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Approval Rate" subtitle="Approved vs. flagged" />
          <div className="px-5 pb-5">
            <DonutGauge value={approvalRate} label="Approved" sublabel={`${counts.approved} of ${decided || 0}`} />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="grid grid-cols-2 gap-4 p-5 lg:col-span-1">
          <ValueTile label="Total Value" value={inr(counts.spend)} tone="ink" />
          <ValueTile label="Potential Savings" value={inr(counts.savings)} tone="green" />
        </Card>

        {/* Flagged */}
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader
            title="Flagged Purchases"
            subtitle="Better prices found online — awaiting review"
            icon={<IconAlert className="h-5 w-5" />}
          />
          {flagged.length === 0 ? (
            <EmptyState message="Nothing flagged right now. Good news." icon={<IconCheck className="h-5 w-5" />} />
          ) : (
            <div className="divide-y divide-[#f2f5f3]">
              {flagged.map((p) => (
                <Link
                  key={p.id}
                  href={`/purchases/${p.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-[#f7faf8]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">{String(p.product_name)}</div>
                    <div className="truncate text-xs text-slate-400">
                      {String(p.ref_no)} · {String(p.vendor_name) || "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900">
                      {inr(p.unit_price as number | null)} × {Number(p.quantity)}
                    </div>
                    <div className="text-xs font-bold text-red-500">
                      Save {inr(p.potential_saving as number | null)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent */}
      <Card className="overflow-hidden">
        <CardHeader
          title="Recent Purchases"
          action={
            <Link href="/purchases" className="text-sm font-semibold text-primary hover:underline">
              View all →
            </Link>
          }
        />
        {recentTop.length === 0 ? (
          <EmptyState
            message='No purchases recorded yet. Add one with "New Request" or import an Excel sheet.'
            icon={<IconReceipt className="h-5 w-5" />}
          />
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
                {recentTop.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/purchases/${p.id}`} className="font-semibold text-primary hover:underline">
                        {String(p.ref_no)}
                      </Link>
                      <div className="max-w-65 truncate text-slate-500">{String(p.product_name)}</div>
                    </td>
                    <td className="text-slate-600">{p.created_by_name}</td>
                    <td className="text-right font-semibold text-slate-900">
                      {p.unit_price != null ? inr(Number(p.unit_price) * Number(p.quantity)) : "—"}
                    </td>
                    <td><VerdictBadge verdict={String(p.verdict)} /></td>
                    <td><StatusBadge status={String(p.status)} /></td>
                    <td className="text-slate-400">{formatDate(String(p.created_at))}</td>
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

function ValueTile({ label, value, tone }: { label: string; value: string; tone: "ink" | "green" }) {
  return (
    <div className={`soft p-4 ${tone === "green" ? "bg-primary-light" : ""}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
        <IconCurrency className="h-5 w-5" />
      </div>
      <div className={`mt-3 text-xl font-bold ${tone === "green" ? "text-emerald-800" : "text-slate-900"}`}>
        {value}
      </div>
      <div className="mt-1 text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}
