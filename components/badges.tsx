import { MATCH_LABELS, ROLE_LABELS, STATUS_LABELS, VERDICT_LABELS } from "@/lib/format";

const VERDICT_STYLES: Record<string, string> = {
  UNCHECKED: "bg-slate-100 text-slate-600 border-slate-200",
  BETTER_PRICE_AVAILABLE: "bg-red-50 text-red-700 border-red-200",
  GOOD_PRICE: "bg-green-50 text-green-700 border-green-200",
  BETTER_THAN_ONLINE: "bg-sky-50 text-sky-700 border-sky-200",
  NEEDS_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-green-50 text-green-700 border-green-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

const MATCH_STYLES: Record<string, string> = {
  SAME_PRODUCT: "bg-sky-50 text-sky-700 border-sky-200",
  SIMILAR: "bg-violet-50 text-violet-700 border-violet-200",
  SAME_SPEC: "bg-blue-50 text-blue-700 border-blue-200",
  ALTERNATIVE: "bg-slate-100 text-slate-600 border-slate-200",
};

function Badge({ label, style }: { label: string; style: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}

export function VerdictBadge({ verdict }: { verdict: string }) {
  return (
    <Badge
      label={VERDICT_LABELS[verdict] ?? verdict}
      style={VERDICT_STYLES[verdict] ?? VERDICT_STYLES.UNCHECKED}
    />
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      label={STATUS_LABELS[status] ?? status}
      style={STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600 border-slate-200"}
    />
  );
}

export function MatchBadge({ matchType }: { matchType: string }) {
  return (
    <Badge
      label={MATCH_LABELS[matchType] ?? matchType}
      style={MATCH_STYLES[matchType] ?? MATCH_STYLES.ALTERNATIVE}
    />
  );
}

const ROLE_STYLES: Record<string, string> = {
  OWNER: "bg-amber-50 text-amber-800 border-amber-200",
  ADMIN: "bg-indigo-50 text-indigo-700 border-indigo-200",
  STAFF: "bg-sky-50 text-sky-700 border-sky-200",
  PURCHASE: "bg-blue-50 text-blue-700 border-blue-200",
};

export function RoleBadge({ role }: { role: string }) {
  return (
    <Badge
      label={ROLE_LABELS[role] ?? role}
      style={ROLE_STYLES[role] ?? "bg-slate-100 text-slate-600 border-slate-200"}
    />
  );
}