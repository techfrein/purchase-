import { MATCH_LABELS, ROLE_LABELS, STATUS_LABELS, VERDICT_LABELS } from "@/lib/format";

const VERDICT_STYLES: Record<string, string> = {
  UNCHECKED: "chip-neutral",
  BETTER_PRICE_AVAILABLE: "chip-brick",
  GOOD_PRICE: "chip-sage",
  BETTER_THAN_ONLINE: "chip-mist",
  NEEDS_REVIEW: "chip-honey",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING_REVIEW: "chip-honey",
  APPROVED: "chip-sage",
  REJECTED: "chip-brick",
};

const MATCH_STYLES: Record<string, string> = {
  SAME_PRODUCT: "chip-mist",
  SIMILAR: "chip-plum",
  SAME_SPEC: "chip-teal",
  ALTERNATIVE: "chip-neutral",
};

function Badge({ label, style }: { label: string; style: string }) {
  return <span className={`chip ${style}`}>{label}</span>;
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
      style={STATUS_STYLES[status] ?? "chip-neutral"}
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
  OWNER: "chip-honey",
  ADMIN: "chip-plum",
  STAFF: "chip-mist",
  PURCHASE: "chip-teal",
};

export function RoleBadge({ role }: { role: string }) {
  return (
    <Badge
      label={ROLE_LABELS[role] ?? role}
      style={ROLE_STYLES[role] ?? "chip-neutral"}
    />
  );
}