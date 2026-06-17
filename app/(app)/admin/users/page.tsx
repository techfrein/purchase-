import { RoleBadge } from "@/components/badges";
import { Card, CardHeader, DataTable, PageHeader } from "@/components/ui";
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
        description="Manage staff and purchase-department accounts. Only the owner can create or change administrator and owner accounts."
      />

      <DataTable>
        <thead>
          <tr>
            <th>Name</th>
            <th>Username</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td className="font-semibold text-slate-900">{u.name}</td>
              <td className="text-slate-600">{u.username}</td>
              <td><RoleBadge role={u.role} /></td>
              <td>
                <span className={`text-sm font-medium ${u.active ? "text-emerald-600" : "text-slate-400"}`}>
                  {u.active ? "Active" : "Deactivated"}
                </span>
              </td>
              <td className="text-slate-500">{formatDate(u.created_at)}</td>
              <td className="text-right">
                <UserManager
                  mode="row"
                  userId={u.id}
                  active={!!u.active}
                  isSelf={u.id === admin.id}
                  targetRole={u.role}
                  viewerRole={admin.role}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      <Card className="mt-8 overflow-hidden">
        <CardHeader title="Add User" />
        <div className="p-5">
          <UserManager mode="create" viewerRole={admin.role} />
        </div>
      </Card>
    </div>
  );
}