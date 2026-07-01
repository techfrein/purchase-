import { ActivityList, ActivityRow, Card, CardHeader, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { fetchUsers } from "@/lib/queries";
import UserManager from "./UserManager";

export default async function UsersPage() {
  const admin = await requireAdmin();
  const users = await fetchUsers();

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Users"
        description="Manage staff and purchase-department accounts."
      />

      {users.length === 0 ? (
        <div className="rounded-3xl border border-[var(--line)] bg-white p-10 text-center text-base text-slate-500">
          No users yet.
        </div>
      ) : (
        <ActivityList>
          {users.map((u) => (
            <ActivityRow
              key={u.id}
              icon={u.name.charAt(0)}
              title={u.name}
              subtitle={`${u.username} · ${u.role}${u.active ? "" : " · off"}`}
              meta={formatDate(u.created_at)}
              trailing={
                <UserManager
                  mode="row"
                  userId={u.id}
                  active={!!u.active}
                  isSelf={u.id === admin.id}
                  targetRole={u.role}
                  viewerRole={admin.role}
                />
              }
            />
          ))}
        </ActivityList>
      )}

      <Card className="mt-8 overflow-hidden">
        <CardHeader title="Add User" />
        <div className="p-5">
          <UserManager mode="create" viewerRole={admin.role} />
        </div>
      </Card>
    </div>
  );
}