import { RoleBadge } from "@/components/badges";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { fetchDecidedUsers, fetchPendingUsers } from "@/lib/queries";
import ApprovalActions from "./ApprovalActions";

export default async function ApprovalsPage() {
  await requireAdmin();

  const [pending, decided] = await Promise.all([fetchPendingUsers(), fetchDecidedUsers()]);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Account Approvals</h1>
        <p className="text-sm text-slate-500 mt-1">New users cannot log in until approved.</p>
      </div>

      <div className="card p-6">
        <div className="font-semibold mb-4">Pending ({pending.length})</div>
        {pending.length === 0 ? (
          <div className="text-sm text-slate-500 py-4">No pending accounts.</div>
        ) : (
          <div className="space-y-3">
            {pending.map((u) => (
              <div key={u.id} className="flex items-center justify-between border-b pb-3 last:border-none">
                <div>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-slate-500">{u.username} · requested {formatDate(u.created_at)}</div>
                </div>
                <div><ApprovalActions userId={u.id} /></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {decided.length > 0 && (
        <div className="mt-8">
          <div className="font-semibold mb-3">Recently decided</div>
          <div className="space-y-2 text-sm">
            {decided.slice(0,5).map((u) => (
              <div key={u.id} className="flex justify-between bg-white border rounded-2xl px-4 py-2.5">
                <div>{u.name} <span className="text-slate-400">({u.username})</span></div>
                <div className={u.approval_status === "APPROVED" ? "text-emerald-600" : "text-red-600"}>{u.approval_status}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}