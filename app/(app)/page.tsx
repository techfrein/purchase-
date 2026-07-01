import Link from "next/link";
import { ActivityList, ActivityRow } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { fetchPurchaseRequests, fetchPurchaseTickets, newFlowDashboardCounts } from "@/lib/requests";

export default async function DashboardPage() {
  const user = await requireUser();

  const [newCounts, recentRequests, recentTickets] = await Promise.all([
    newFlowDashboardCounts(user),
    fetchPurchaseRequests(user),
    fetchPurchaseTickets(user),
  ]);

  const recent = [...recentRequests, ...recentTickets]
    .sort((a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime())
    .slice(0, 6);

  const firstName = user.name.split(" ")[0] || user.name;

  // The three big actions the owner cares about. Minimal white cards — the
  // animation is the focal point; a single accent colour ties each one together.
  const actions = [
    {
      title: "Search Best Price",
      desc: "Find any product at the lowest market price",
      emoji: "🔍",
      anim: "/purchase-animation.svg",
      href: "/purchases/new",
      accent: "accent-teal",
      stage: "stage-teal",
      badge: "badge-teal",
      count: null as number | null,
      countLabel: "",
    },
    {
      title: "Verify Purchase Request",
      desc: "Check requests waiting for your review",
      emoji: "📋",
      anim: "/verify-purchases.svg",
      href: "/purchases",
      accent: "accent-honey",
      stage: "stage-honey",
      badge: "badge-honey",
      count: newCounts.pendingOwner,
      countLabel: "waiting",
    },
    {
      title: "Approve Purchase Request",
      desc: "Give the final go-ahead and create a ticket",
      emoji: "✅",
      anim: "/smart-analyser.svg",
      href: "/purchases?status=PENDING_OWNER",
      accent: "accent-sage",
      stage: "stage-sage",
      badge: "badge-sage",
      count: newCounts.pendingOwner,
      countLabel: "to approve",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Friendly greeting */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
          Hello, {firstName} 👋
        </h1>
        <p className="mt-2 text-lg text-[var(--stone-600)]">What would you like to do today?</p>
      </div>

      {/* THREE BIG BOXES — minimal cards, animation is the focal point */}
      <div className="grid gap-5 md:grid-cols-3">
        {actions.map((a) => (
          <Link
            key={a.title}
            href={a.href}
            className="card-lift group flex flex-col overflow-hidden rounded-3xl border border-[var(--line)] bg-white"
          >
            {/* Animation stage — fills the full width, the hero of the card */}
            <div className={`relative flex h-44 items-center justify-center ${a.stage}`}>
              <img
                src={a.anim}
                alt=""
                aria-hidden="true"
                className="h-36 w-auto max-w-[80%] object-contain transition-transform duration-300 group-hover:scale-105"
              />
              {a.count != null && a.count > 0 && (
                <span className={`absolute right-3 top-3 rounded-lg border border-[var(--line)] px-3 py-1 text-sm font-bold ${a.badge}`}>
                  {a.count} {a.countLabel}
                </span>
              )}
            </div>

            {/* Text — quiet, minimal, below the animation */}
            <div className="flex flex-1 flex-col p-6">
              <div className="text-xl font-bold tracking-tight text-slate-900">{a.title}</div>
              <p className="mt-1 text-sm text-slate-500">{a.desc}</p>
              <div className={`mt-4 inline-flex items-center gap-1.5 text-sm font-semibold ${a.accent}`}>
                Open
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent activity — simple list, no clutter */}
      <div>
        <div className="mb-3 flex items-end justify-between px-1">
          <div className="text-xl font-bold tracking-tight text-slate-900">Recent Activity</div>
          <Link href="/purchases" className="text-base font-semibold text-primary hover:underline">
            See all →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-3xl border border-[var(--line)] bg-white p-10 text-center text-base text-slate-500">
            Nothing here yet. Tap a box above to get started.
          </div>
        ) : (
          <ActivityList>
            {recent.map((item: any) => {
              const isTicket = !!item.product_title;
              return (
                <ActivityRow
                  key={`${isTicket ? "ticket" : "request"}-${item.id}`}
                  href={isTicket ? `/purchases/${item.id}?type=ticket` : `/purchases/${item.id}?type=request`}
                  icon={isTicket ? "🎫" : "📝"}
                  tone={isTicket ? "amber" : "blue"}
                  title={isTicket ? item.product_title : item.product_heading}
                  subtitle={item.ref_no}
                  meta={formatDate(item.created_at)}
                />
              );
            })}
          </ActivityList>
        )}
      </div>
    </div>
  );
}
