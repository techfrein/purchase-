import { ActivityList, ActivityRow, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { fetchAuditLog } from "@/lib/queries";

export default async function AuditPage() {
  await requireAdmin();
  const rows = await fetchAuditLog();

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Audit Log"
        description="Every login, entry, price check, decision and configuration change (latest 500)."
      />

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-[var(--line)] bg-white p-10 text-center text-base text-slate-500">
          No activity yet.
        </div>
      ) : (
        <ActivityList>
          {rows.map((r) => (
            <ActivityRow
              key={r.id}
              icon="·"
              title={r.action.replaceAll("_", " ")}
              subtitle={r.detail || (r.user_name ?? "—")}
              meta={formatDate(r.created_at)}
            />
          ))}
        </ActivityList>
      )}
    </div>
  );
}