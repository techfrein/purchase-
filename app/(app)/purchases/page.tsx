import Link from "next/link";
import { IconPlus } from "@/components/icons";
import { Button, PageHeader } from "@/components/ui";
import { requireUser, isAdminLike } from "@/lib/auth";
import { formatDate, inr } from "@/lib/format";
import { unitLabel } from "@/lib/categories";
import { fetchPurchaseRequests, fetchPurchaseTickets } from "@/lib/requests";

type SearchParams = Promise<{ view?: string; status?: string }>;

export default async function PurchaseRequestsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const view = (sp.view === "tickets") ? "tickets" : "requests";

  const reqRows = await fetchPurchaseRequests(user, sp.status);
  const tickets = await fetchPurchaseTickets(user);

  const canAdmin = isAdminLike(user.role);
  const isOwner = user.role === "OWNER";

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Requests</h1>
          <p className="text-sm text-slate-500 mt-1">Staff &amp; Purchase submit options → Admin → Owner approves with purchaser &amp; PDF</p>
        </div>
        <Button href="/purchases/new">
          <IconPlus className="h-4 w-4" />
          New Request
        </Button>
      </div>

      <div className="flex gap-2 mb-6 text-sm">
        <Link href="/purchases" className={`px-4 py-1.5 rounded-full border transition ${view === "requests" ? "bg-primary text-white border-primary" : "border-slate-200 hover:bg-slate-50"}`}>Active Requests</Link>
        <Link href="/purchases?view=tickets" className={`px-4 py-1.5 rounded-full border transition ${view === "tickets" ? "bg-primary text-white border-primary" : "border-slate-200 hover:bg-slate-50"}`}>Approved Tickets</Link>
      </div>

      {view === "tickets" ? (
        <TicketsList tickets={tickets} />
      ) : (
        <RequestsList rows={reqRows} canAdmin={canAdmin} isOwner={isOwner} />
      )}
    </div>
  );
}

function RequestsList({ rows, canAdmin, isOwner }: { rows: any[]; canAdmin: boolean; isOwner: boolean }) {
  if (!rows || rows.length === 0) {
    return <div className="card p-10 text-center text-slate-500 rounded-3xl">No requests yet.</div>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {rows.map((r) => {
        const opts = r.selected_options || [];
        const statusColor = r.status === "PENDING_ADMIN" ? "bg-amber-100 text-amber-700" :
                            r.status === "PENDING_OWNER" ? "bg-blue-100 text-blue-700" :
                            r.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700";

        return (
          <Link key={r.id} href={`/purchases/${r.id}?type=request`} className="card p-5 hover:border-primary/40 transition block">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-lg tracking-tight">{r.ref_no}</div>
                <div className="text-sm text-slate-600 mt-0.5 line-clamp-2">{r.product_heading}</div>
              </div>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${statusColor}`}>{r.status.replace("_", " ")}</span>
            </div>

            <div className="mt-4 flex items-center gap-4 text-sm">
              <div>{r.quantity} {unitLabel(r.unit)}</div>
              <div className="text-xs text-slate-500">• {opts.length} options selected</div>
              <div className="text-xs text-slate-500 ml-auto">by {r.requested_by_name}</div>
            </div>

            <div className="mt-3 text-xs text-slate-400">{formatDate(r.created_at)}</div>

            {(canAdmin || isOwner) && r.status !== "APPROVED" && r.status !== "REJECTED" && (
              <div className="mt-4">
                <span className="inline-block text-xs px-3 py-1 rounded-full bg-primary text-white font-medium">Review →</span>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function TicketsList({ tickets }: { tickets: any[] }) {
  if (!tickets || tickets.length === 0) return <div className="card p-10 text-center text-slate-500 rounded-3xl">No approved tickets yet.</div>;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {tickets.map((t) => (
        <Link key={t.id} href={`/purchases/${t.id}?type=ticket`} className="card p-5 hover:border-primary/40 transition block">
          <div className="font-semibold text-lg tracking-tight">{t.ref_no}</div>
          <div className="mt-1 text-sm text-slate-700 line-clamp-1">{t.product_title} <span className="text-xs text-slate-400">({t.source})</span></div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">{inr(t.unit_price)}</span>
            <span className="text-sm text-slate-500">× {t.quantity} {t.unit}</span>
          </div>

          <div className="mt-4 text-xs text-slate-500 flex justify-between">
            <span>Approved {formatDate(t.approved_at)}</span>
            <span>Purchaser: #{t.purchaser_id}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
