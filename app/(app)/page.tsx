import Link from "next/link";
import {
  IconCheck,
  IconReceipt,
} from "@/components/icons";
import { Button, Card, StatCard } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { inr, formatDate } from "@/lib/format";
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
    .slice(0, 8);

  return (
    <div className="space-y-8">
      {/* Hero banner - vibrant and inviting */}
      <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 via-primary to-indigo-600 text-white p-9 md:p-12 relative">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_0.5px,transparent_1px)] bg-[length:4px_4px] opacity-10"></div>
        <div className="relative max-w-lg">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/20 text-xs font-semibold tracking-widest mb-4">
            🏥 VARUN ARJUN MEDICAL COLLEGE
          </div>
          <h1 className="text-5xl md:text-[52px] leading-[1.05] font-bold tracking-[-2.2px]">Smart purchasing<br />starts here.</h1>
          <p className="mt-4 text-lg text-white/90 max-w-md">
            Discover trusted suppliers and get the best prices with real-time market data.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/purchases/new" className="bg-white text-primary hover:bg-white/95 px-8 font-semibold">
              New Request
            </Button>
            <Button href="/vegetables" className="bg-white/15 hover:bg-white/25 text-white border border-white/30 px-6">
              🥕 Vegetables (eNAM)
            </Button>
          </div>
        </div>
      </div>

      {/* Categories grid - colorful and inviting */}
      <div>
        <div className="px-1 flex justify-between mb-3 items-end">
          <div className="font-semibold text-xl tracking-tight">Quick Categories</div>
          <Link href="/purchases/new" className="text-sm text-primary font-medium">Browse all →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { name: "Vegetables", icon: "🥕", color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200", href: "/vegetables" },
            { name: "Medical Equipment", icon: "🩺", color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
            { name: "Laptops & IT", icon: "💻", color: "bg-violet-100 text-violet-700 hover:bg-violet-200" },
            { name: "Furniture", icon: "🪑", color: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
            { name: "Printers & Office", icon: "🖨️", color: "bg-slate-100 text-slate-700 hover:bg-slate-200" },
            { name: "Networking", icon: "🌐", color: "bg-cyan-100 text-cyan-700 hover:bg-cyan-200" },
          ].map((cat, i) => (
            <Link 
              key={i} 
              href={cat.href || "/purchases/new"} 
              className={`group rounded-3xl p-5 flex flex-col items-start gap-3 border border-transparent shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${cat.color}`}
            >
              <div className="text-3xl">{cat.icon}</div>
              <div className="font-semibold text-base">{cat.name}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Vegetables Spotlight - extra colorful callout */}
      <Link href="/vegetables" className="rounded-3xl bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 p-6 text-white flex items-center gap-4 hover:brightness-105 transition-all">
        <div className="text-5xl">🥕</div>
        <div className="flex-1">
          <div className="uppercase text-xs tracking-[1.5px] font-semibold opacity-90">DEDICATED SECTION</div>
          <div className="font-bold text-2xl leading-none mt-1">Vegetables via eNAM</div>
          <div className="text-sm mt-1 opacity-90">Official wholesale mandi prices • Accurate unit pricing</div>
        </div>
        <div className="text-2xl opacity-80">→</div>
      </Link>

      {/* Quick Stats - vibrant cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          label="Total Requests" 
          value={String(newCounts.requestsTotal)} 
          icon={<IconReceipt />} 
          accent="violet" 
          href="/purchases" 
        />
        <StatCard 
          label="Pending Admin" 
          value={String(newCounts.pendingAdmin)} 
          icon={<IconCheck />} 
          accent="amber" 
          href="/purchases" 
        />
        <StatCard 
          label="Pending Owner" 
          value={String(newCounts.pendingOwner)} 
          icon={<IconCheck />} 
          accent="blue" 
          href="/purchases" 
        />
        <StatCard 
          label="Approved Tickets" 
          value={String(newCounts.tickets)}
          icon={<IconCheck />}
          accent="green"
          href="/purchases?view=tickets"
        />
      </div>

      {/* Quick Actions - colorful buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/purchases/new" className="rounded-3xl bg-gradient-to-br from-blue-500 to-primary text-white p-5 flex flex-col justify-between hover:scale-[1.01] transition">
          <div className="text-2xl">➕</div>
          <div>
            <div className="font-semibold">New Purchase Request</div>
            <div className="text-xs opacity-80">General items & equipment</div>
          </div>
        </Link>
        <Link href="/vegetables" className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5 flex flex-col justify-between hover:scale-[1.01] transition">
          <div className="text-2xl">🥕</div>
          <div>
            <div className="font-semibold">Vegetables (eNAM)</div>
            <div className="text-xs opacity-80">Official mandi rates</div>
          </div>
        </Link>
        <Link href="/import" className="rounded-3xl bg-white border hover:border-primary p-5 flex flex-col justify-between transition">
          <div className="text-2xl text-primary">📊</div>
          <div>
            <div className="font-semibold text-slate-900">Bulk Import</div>
            <div className="text-xs text-slate-500">Upload Excel sheet</div>
          </div>
        </Link>
        <Link href="/reports" className="rounded-3xl bg-white border hover:border-primary p-5 flex flex-col justify-between transition">
          <div className="text-2xl text-primary">📈</div>
          <div>
            <div className="font-semibold text-slate-900">View Reports</div>
            <div className="text-xs text-slate-500">Spending & analysis</div>
          </div>
        </Link>
      </div>

      {/* Recent activity - colorful cards */}
      <div>
        <div className="px-1 flex justify-between mb-3 items-end">
          <div className="font-semibold text-xl tracking-tight">Recent Activity</div>
          <Link href="/purchases" className="text-sm text-primary font-medium">See all →</Link>
        </div>

        {recent.length === 0 ? (
          <div className="p-8 text-sm text-slate-500 bg-white rounded-3xl border text-center">No activity yet. Start by creating a new request.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recent.slice(0, 6).map((item: any, index) => {
              const isTicket = !!item.product_title;
              const colors = [
                "bg-blue-50 border-blue-100 text-blue-700",
                "bg-emerald-50 border-emerald-100 text-emerald-700",
                "bg-violet-50 border-violet-100 text-violet-700",
                "bg-amber-50 border-amber-100 text-amber-700",
                "bg-cyan-50 border-cyan-100 text-cyan-700",
                "bg-rose-50 border-rose-100 text-rose-700",
              ];
              const color = colors[index % colors.length];
              
              return (
                <Link
                  href={isTicket ? `/purchases/${item.id}?type=ticket` : `/purchases/${item.id}?type=request`}
                  key={`${isTicket ? "ticket" : "request"}-${item.id}`}
                  className={`group p-4 rounded-3xl border flex flex-col justify-between hover:shadow-md transition-all ${color}`}
                >
                  <div>
                    <div className="font-semibold text-base line-clamp-2 group-hover:underline">
                      {isTicket ? item.product_title : item.product_heading}
                    </div>
                    <div className="text-[11px] opacity-70 mt-1">{item.ref_no}</div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="font-medium">
                      {isTicket ? inr(item.unit_price) : item.status}
                    </span>
                    <span className="opacity-70">{formatDate(item.created_at)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


