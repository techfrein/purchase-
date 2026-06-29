import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft } from "@/components/icons";
import { Card } from "@/components/ui";
import { isAdminLike, requireUser } from "@/lib/auth";
import { unitLabel } from "@/lib/categories";
import { formatDate, inr } from "@/lib/format";
import { fetchPurchaseRequestById, fetchPurchaseTickets } from "@/lib/requests";
import RequestReviewPanel from "./RequestReviewPanel";
import TicketPanel from "./TicketPanel";

export default async function PurchaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ type?: string }>;
}) {
  const user = await requireUser();
  const { id: idStr } = await params;
  const sp = searchParams ? await searchParams : {};
  const id = Number(idStr);

  let request: any = null;
  let ticket: any = null;

  if (sp.type === "request" || !sp.type) {
    request = await fetchPurchaseRequestById(id, user);
  }
  if (!request && (sp.type === "ticket" || !sp.type)) {
    const allTickets = await fetchPurchaseTickets(user);
    ticket = allTickets.find((t: any) => Number(t.id) === id);
  }

  if (!request && !ticket) {
    request = await fetchPurchaseRequestById(id, user);
  }

  if (!request && !ticket) {
    // Old data has been removed. Only new requests + tickets exist.
    notFound();
  }

  return (
    <div className="max-w-5xl">
      <Link href="/purchases" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
        <IconArrowLeft className="h-4 w-4" /> Back to requests
      </Link>

      {request && <RequestView request={request} user={user} />}
      {ticket && <TicketView ticket={ticket} user={user} />}
    </div>
  );
}

function RequestView({ request, user }: { request: any; user: any }) {
  const isOwner = user.role === "OWNER";
  const isAdmin = isAdminLike(user.role);
  const opts = request.selected_options || [];
  const adminRecs = request.admin_recommendations || [];

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="uppercase text-xs tracking-[1.5px] font-semibold text-primary">PURCHASE REQUEST</div>
          <div className="text-4xl font-bold tracking-tighter mt-1">{request.ref_no}</div>
        </div>
        <span className={`mt-1 px-4 py-1 rounded-full text-sm font-semibold ${
          request.status === "PENDING_ADMIN" ? "bg-amber-100 text-amber-700" :
          request.status === "PENDING_OWNER" ? "bg-blue-100 text-blue-700" :
          request.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
        }`}>{request.status.replace("_", " ")}</span>
      </div>

      {/* Main info card like product header */}
      <div className="card p-7">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-semibold tracking-tight">{request.product_heading}</div>
            <div className="mt-1 text-sm text-slate-500">Requested by <span className="font-medium text-slate-700">{request.requested_by_name}</span> · {formatDate(request.created_at)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500">Quantity</div>
            <div className="text-2xl font-semibold">{request.quantity} {unitLabel(request.unit)}</div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t">
          <div className="text-xs uppercase font-semibold tracking-widest text-slate-400 mb-1">Reason</div>
          <p className="text-slate-700 text-[15px] leading-relaxed">{request.reason || "—"}</p>
        </div>
      </div>

      {/* Selected options - styled like product variants / options */}
      <div className="mt-8">
        <div className="font-semibold text-xl tracking-tight mb-3 px-1">Selected options</div>
        <div className="grid gap-4 sm:grid-cols-2">
          {opts.length === 0 && <div className="text-sm text-slate-500">No options.</div>}
          {opts.map((o: any, idx: number) => (
            <div key={idx} className="border rounded-3xl p-5 bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <div className="uppercase text-[10px] tracking-widest text-primary font-semibold">{o.source}</div>
                  <div className="font-semibold text-[15px] mt-1 leading-tight pr-2">{o.title}</div>
                </div>
                <div className="font-semibold text-xl tabular-nums">{inr(o.price)}</div>
              </div>

              {o.url && <a href={o.url} target="_blank" className="text-xs mt-1 inline-block text-primary hover:underline">View source →</a>}

              {o.selection_reason && (
                <div className="mt-4 pt-4 border-t text-sm text-slate-600">“{o.selection_reason}”</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {adminRecs.length > 0 && (
        <div className="mt-6 text-sm text-slate-600">Admin notes: {JSON.stringify(adminRecs)}</div>
      )}

      {/* Actions */}
      {(isAdmin || isOwner) && request.status !== "APPROVED" && request.status !== "REJECTED" && (
        <div className="mt-8">
          <RequestReviewPanel requestId={request.id} currentStatus={request.status} isOwner={isOwner} isAdmin={isAdmin} />
        </div>
      )}

      {request.status === "APPROVED" && request.owner_chosen_option && (
        <div className="mt-8 p-6 rounded-3xl bg-emerald-50 border border-emerald-200">
          <div className="uppercase text-xs tracking-widest font-semibold text-emerald-600">OWNER APPROVED</div>
          <div className="mt-1 text-2xl font-semibold">{request.owner_chosen_option.title}</div>
          <div className="text-xl mt-1">{inr(request.owner_chosen_option.price)} — {request.owner_chosen_option.source}</div>
          {request.owner_note && <div className="mt-3 text-sm text-emerald-700">“{request.owner_note}”</div>}
          <Link href="/purchases?view=tickets" className="mt-4 inline-block text-sm text-primary font-medium">View the ticket →</Link>
        </div>
      )}
    </div>
  );
}

function TicketView({ ticket, user }: { ticket: any; user: any }) {
  return (
    <div className="mt-4">
      <TicketPanel ticket={ticket} viewerRole={user.role} viewerId={user.id} />
    </div>
  );
}
