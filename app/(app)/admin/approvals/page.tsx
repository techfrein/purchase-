import { ActivityList, ActivityRow, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { fetchDecidedUsers, fetchPendingUsers } from "@/lib/queries";
import ApprovalActions from "./ApprovalActions";

export default async function ApprovalsPage() {
  await requireAdmin();

  const [pending, decided] = await Promise.all([fetchPendingUsers(), fetchDecidedUsers()]);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Account Approvals"
        description="New users cannot log in until approved."
      />

      <div className="mb-3 px-1 text-xl font-bold tracking-tight text-slate-900">
        Pending ({pending.length})
      </div>

      {pending.length === 0 ? (
        <div className="rounded-3xl border border-[var(--line)] bg-white p-10 text-center text-base text-slate-500">
          No pending accounts.
        </div>
      ) : (
        <ActivityList>
          {pending.map((u) => (
            <ActivityRow
              key={u.id}
              icon={u.name.charAt(0)}
              title={u.name}
              subtitle={u.username}
              meta={formatDate(u.created_at)}
              trailing={<ApprovalActions userId={u.id} />}
            />
          ))}
        </ActivityList>
      )}

      {decided.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 px-1 text-xl font-bold tracking-tight text-slate-900">
            Recently decided
          </div>
          <ActivityList>
            {decided.slice(0, 5).map((u) => (
              <ActivityRow
                key={u.id}
                icon={u.approval_status === "APPROVED" ? "✓" : "✕"}
                title={u.name}
                subtitle={u.username}
                meta={u.approval_status}
              />
            ))}
          </ActivityList>
        </div>
      )}
    </div>
  );
}