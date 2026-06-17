import { DataTable, EmptyState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { fetchAuditLog } from "@/lib/queries";

const ACTION_STYLES: Record<string, string> = {
  LOGIN: "text-slate-500",
  LOGOUT: "text-slate-500",
  PURCHASE_CREATED: "text-sky-700",
  PRICE_CHECK: "text-violet-700",
  PURCHASE_APPROVED: "text-emerald-700",
  PURCHASE_REJECTED: "text-red-700",
  EXCEL_IMPORT: "text-sky-700",
};

export default async function AuditPage() {
  await requireAdmin();
  const rows = await fetchAuditLog();

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Audit Log"
        description="Every login, entry, price check, decision and configuration change is recorded (latest 500 shown)."
      />

      <DataTable>
        <thead>
          <tr>
            <th>When</th>
            <th>User</th>
            <th>Action</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap text-slate-500">{formatDate(r.created_at)}</td>
              <td className="font-medium text-slate-700">{r.user_name ?? "—"}</td>
              <td className={`whitespace-nowrap font-semibold ${ACTION_STYLES[r.action] ?? "text-slate-700"}`}>
                {r.action.replaceAll("_", " ")}
              </td>
              <td className="text-slate-600">{r.detail}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={4}><EmptyState message="No activity yet." /></td></tr>
          )}
        </tbody>
      </DataTable>
    </div>
  );
}