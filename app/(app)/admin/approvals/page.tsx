import { RoleBadge } from "@/components/badges";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { fetchDecidedUsers, fetchPendingUsers } from "@/lib/queries";
import ApprovalActions from "./ApprovalActions";

export default async function ApprovalsPage() {
  await requireAdmin();

  const pending = await fetchPendingUsers();
  const decided = await fetchDecidedUsers();

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Account Approvals"
        description="People who signed up are listed here. They cannot log in until you approve them."
      />

      <Card className="overflow-hidden">
        <CardHeader title={`Pending (${pending.length})`} />
        {pending.length === 0 ? (
          <EmptyState message="No accounts are awaiting approval." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-modern w-full min-w-[40rem] text-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Requested Role</th>
                  <th>Requested</th>
                  <th className="text-right">Decision</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((u) => (
                  <tr key={u.id}>
                    <td className="font-semibold text-slate-900">{u.name}</td>
                    <td className="text-slate-600">{u.username}</td>
                    <td><RoleBadge role={u.role} /></td>
                    <td className="text-slate-500">{formatDate(u.created_at)}</td>
                    <td className="text-right">
                      <ApprovalActions userId={u.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {decided.length > 0 && (
        <Card className="mt-8 overflow-hidden">
          <CardHeader title="Recently Decided" />
          <div className="overflow-x-auto">
            <table className="table-modern w-full min-w-[40rem] text-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Decision</th>
                  <th>Decided</th>
                </tr>
              </thead>
              <tbody>
                {decided.map((u) => (
                  <tr key={u.id}>
                    <td className="font-semibold text-slate-900">{u.name}</td>
                    <td className="text-slate-600">{u.username}</td>
                    <td><RoleBadge role={u.role} /></td>
                    <td>
                      <span className={`font-semibold ${u.approval_status === "APPROVED" ? "text-emerald-600" : "text-red-600"}`}>
                        {u.approval_status === "APPROVED" ? "Approved" : "Rejected"}
                      </span>
                    </td>
                    <td className="text-slate-500">
                      <div>{formatDate(u.decided_at)}</div>
                      {u.decided_by_name && <div className="text-xs">by {u.decided_by_name}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}