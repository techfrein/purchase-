export function inr(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") || iso.includes(" ") ? iso.replace(" ", "T") + "Z" : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const VERDICT_LABELS: Record<string, string> = {
  UNCHECKED: "Not Checked",
  BETTER_PRICE_AVAILABLE: "Better Price Available",
  GOOD_PRICE: "Good Price",
  BETTER_THAN_ONLINE: "Better Than Online",
  NEEDS_REVIEW: "Needs Manual Review",
};

export const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Administrator",
  STAFF: "Staff",
  PURCHASE: "Purchase Department",
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const MATCH_LABELS: Record<string, string> = {
  SAME_PRODUCT: "Same Product",
  SIMILAR: "Similar Product",
  SAME_SPEC: "Same Specification",
  ALTERNATIVE: "Alternative",
};

export { DEFAULT_PURCHASE_CATEGORIES as CATEGORIES } from "./categories";
