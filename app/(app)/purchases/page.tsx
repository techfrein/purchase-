import Link from "next/link";
import { IconPlus } from "@/components/icons";
import { ActivityList, ActivityRow, Button, PageHeader, TabBar, TabLink, toneAt } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate, inr } from "@/lib/format";
import { fetchPurchaseRequests, fetchPurchaseTickets } from "@/lib/requests";

type SearchParams = Promise<{ view?: string; status?: string }>;

export default async function PurchaseRequestsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const view = sp.view === "tickets" ? "tickets" : "requests";

  const reqRows = await fetchPurchaseRequests(user, sp.status);
  const tickets = await fetchPurchaseTickets(user);

  return (
    <div>
      <PageHeader
        title="Requests"
        description="Staff submit options → Admin reviews → Owner approves"
        action={
          <Button href="/purchases/new">
            <IconPlus className="h-4 w-4" />
            New Request
          </Button>
        }
      />

      <TabBar>
        <TabLink href="/purchases" active={view === "requests"}>
          Active Requests
        </TabLink>
        <TabLink href="/purchases?view=tickets" active={view === "tickets"}>
          Approved Tickets
        </TabLink>
      </TabBar>

      {view === "tickets" ? (
        <TicketsList tickets={tickets} />
      ) : (
        <RequestsList rows={reqRows} />
      )}
    </div>
  );
}

function RequestsList({ rows }: { rows: any[] }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-3xl border border-[var(--line)] bg-white p-10 text-center text-base text-slate-500">
        Nothing here yet.{" "}
        <Link href="/purchases/new" className="font-semibold text-primary hover:underline">
          Create a request
        </Link>
      </div>
    );
  }

  return (
    <ActivityList>
      {rows.map((r, i) => (
        <ActivityRow
          key={r.id}
          href={`/purchases/${r.id}?type=request`}
          icon="📝"
          tone={toneAt(i)}
          title={r.product_heading}
          subtitle={r.ref_no}
          meta={formatDate(r.created_at)}
        />
      ))}
    </ActivityList>
  );
}

function TicketsList({ tickets }: { tickets: any[] }) {
  if (!tickets || tickets.length === 0) {
    return (
      <div className="rounded-3xl border border-[var(--line)] bg-white p-10 text-center text-base text-slate-500">
        No approved tickets yet.
      </div>
    );
  }

  return (
    <ActivityList>
      {tickets.map((t, i) => (
        <ActivityRow
          key={t.id}
          href={`/purchases/${t.id}?type=ticket`}
          icon="🎫"
          tone={toneAt(i + 2)}
          title={t.product_title}
          subtitle={`${t.ref_no} · ${inr(t.unit_price)}`}
          meta={formatDate(t.approved_at)}
        />
      ))}
    </ActivityList>
  );
}