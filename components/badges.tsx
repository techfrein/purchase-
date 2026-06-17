import { MATCH_LABELS, ROLE_LABELS, STATUS_LABELS, VERDICT_LABELS } from "@/lib/format";

const DOT = "before:mr-1.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-current before:content-['']";

const VERDICT_STYLES: Record<string, string> = {
  UNCHECKED: "bg-slate-100 text-slate-500",
  BETTER_PRICE_AVAILABLE: "bg-red-50 text-red-600",
  GOOD_PRICE: "bg-emerald-50 text-emerald-600",
  BETTER_THAN_ONLINE: "bg-sky-50 text-sky-600",
  NEEDS_REVIEW: "bg-amber-50 text-amber-600",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING_REVIEW: "bg-amber-50 text-amber-600",
  APPROVED: "bg-emerald-50 text-emerald-600",
  REJECTED: "bg-red-50 text-red-600",
};

const MATCH_STYLES: Record<string, string> = {
  SAME_PRODUCT: "bg-sky-50 text-sky-600",
  SIMILAR: "bg-violet-50 text-violet-600",
  SAME_SPEC: "bg-blue-50 text-blue-600",
  ALTERNATIVE: "bg-slate-100 text-slate-500",
};

function Badge({ label, style, dot = true }: { label: string; style: string; dot?: boolean }) {
  return <span className={`chip ${dot ? DOT : ""} ${style}`}>{label}</span>;
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
  OWNER: "bg-amber-50 text-amber-700",
  ADMIN: "bg-indigo-50 text-indigo-600",
  STAFF: "bg-sky-50 text-sky-600",
  PURCHASE: "bg-blue-50 text-blue-600",
};

export function RoleBadge({ role }: { role: string }) {
  return (
    <Badge
      label={ROLE_LABELS[role] ?? role}
      style={ROLE_STYLES[role] ?? "bg-slate-100 text-slate-500"}
      dot={false}
    />
  );
}