import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft } from "@/components/icons";
import { ActivityList, ActivityRow } from "@/components/ui";
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
      <div className="mt-4">
        <ActivityList>
          <ActivityRow
            icon="📝"
            title={request.product_heading}
            subtitle={`${request.ref_no} · ${request.status.replace("_", " ")}`}
            meta={formatDate(request.created_at)}
          />
          <ActivityRow
            icon="📦"
            title={`${request.quantity} ${unitLabel(request.unit)}`}
            subtitle={`Requested by ${request.requested_by_name}`}
          />
          <ActivityRow
            icon="💬"
            title={request.reason || "No reason provided"}
            subtitle="Request reason"
          />
        </ActivityList>
      </div>

      <div className="mt-8">
        <div className="mb-3 px-1 text-xl font-bold tracking-tight text-slate-900">Selected options</div>
        {opts.length === 0 ? (
          <div className="rounded-3xl border border-[var(--line)] bg-white p-10 text-center text-base text-slate-500">No options.</div>
        ) : (
          <ActivityList>
            {opts.map((o: any, idx: number) => (
              <ActivityRow
                key={idx}
                href={o.url || undefined}
                icon="🛒"
                title={o.title}
                subtitle={o.source}
                meta={inr(o.price)}
              />
            ))}
          </ActivityList>
        )}
      </div>

      {adminRecs.length > 0 && (
        <div className="mt-6 text-sm text-slate-600">Admin notes: {JSON.stringify(adminRecs)}</div>
      )}

      {(isAdmin || isOwner) && request.status !== "APPROVED" && request.status !== "REJECTED" && (
        <div className="mt-8">
          <RequestReviewPanel requestId={request.id} currentStatus={request.status} isOwner={isOwner} isAdmin={isAdmin} />
        </div>
      )}

      {request.status === "APPROVED" && request.owner_chosen_option && (
        <div className="mt-8">
          <div className="mb-3 px-1 text-xl font-bold tracking-tight text-slate-900">Owner approved</div>
          <ActivityList>
            <ActivityRow
              icon="✅"
              title={request.owner_chosen_option.title}
              subtitle={request.owner_chosen_option.source}
              meta={inr(request.owner_chosen_option.price)}
            />
            {request.owner_note && (
              <ActivityRow icon="💬" title={request.owner_note} subtitle="Owner note" />
            )}
            <ActivityRow
              href="/purchases?view=tickets"
              icon="🎫"
              title="View the ticket"
              subtitle="Approved purchase ticket"
            />
          </ActivityList>
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