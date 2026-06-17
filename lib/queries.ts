import { getSupabase } from "./db";

export async function userNameMap(ids: number[]): Promise<Record<number, string>> {
  if (ids.length === 0) return {};
  const unique = [...new Set(ids)];
  const { data, error } = await getSupabase().from("users").select("id, name").in("id", unique);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((u) => [u.id, u.name]));
}

export type PurchaseRow = Record<string, unknown> & {
  id: number;
  created_by: number;
  created_by_name?: string;
  decided_by_name?: string;
};

type PurchaseFilters = {
  status?: string;
  verdict?: string;
  q?: string;
  from?: string;
  to?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyPurchaseFilters(q: any, f?: PurchaseFilters) {
  if (f?.status) q = q.eq("status", f.status);
  if (f?.verdict) q = q.eq("verdict", f.verdict);
  if (f?.from) q = q.gte("created_at", `${f.from}T00:00:00.000Z`);
  if (f?.to) q = q.lte("created_at", `${f.to}T23:59:59.999Z`);
  if (f?.q) {
    const term = `%${f.q}%`;
    q = q.or(`product_name.ilike.${term},ref_no.ilike.${term},vendor_name.ilike.${term}`);
  }
  return q;
}

export async function fetchPurchases(opts: {
  limit?: number;
  filters?: PurchaseFilters;
  order?: { column: string; ascending?: boolean };
}): Promise<PurchaseRow[]> {
  let q = getSupabase().from("purchases").select("*");
  q = applyPurchaseFilters(q, opts.filters);
  q = q.order(opts.order?.column ?? "id", { ascending: opts.order?.ascending ?? false });
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as PurchaseRow[];
  const names = await userNameMap(rows.map((r) => r.created_by));
  return rows.map((r) => ({ ...r, created_by_name: names[r.created_by] ?? "—" }));
}

export async function fetchPurchaseById(id: number) {
  const { data, error } = await getSupabase().from("purchases").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const names = await userNameMap(
    [data.created_by, data.decided_by].filter((x): x is number => x != null)
  );
  return {
    ...data,
    created_by_name: names[data.created_by] ?? "—",
    decided_by_name: data.decided_by != null ? (names[data.decided_by] ?? "—") : null,
  };
}

export async function fetchPriceListings(purchaseId: number) {
  const { data, error } = await getSupabase()
    .from("price_listings")
    .select("*")
    .eq("purchase_id", purchaseId)
    .order("price", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function dashboardCounts() {
  const { data, error } = await getSupabase()
    .from("purchases")
    .select("status, verdict, unit_price, quantity, potential_saving");
  if (error) throw error;
  const rows = data ?? [];
  let spend = 0;
  let savings = 0;
  let pending = 0;
  let approved = 0;
  let flagged = 0;
  for (const r of rows) {
    const up = r.unit_price != null ? Number(r.unit_price) : 0;
    const qty = Number(r.quantity) || 0;
    spend += up * qty;
    if (r.status === "PENDING_REVIEW") pending++;
    if (r.status === "APPROVED") approved++;
    if (r.verdict === "BETTER_PRICE_AVAILABLE") flagged++;
    if (r.status !== "REJECTED" && r.potential_saving != null) {
      savings += Number(r.potential_saving);
    }
  }
  return { total: rows.length, pending, approved, flagged, spend, savings };
}

export async function pendingApprovalsCount() {
  const { count, error } = await getSupabase()
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("approval_status", "PENDING");
  if (error) throw error;
  return count ?? 0;
}

export async function fetchUsers() {
  const { data, error } = await getSupabase()
    .from("users")
    .select("id, username, name, role, active, created_at")
    .order("id");
  if (error) throw error;
  return data ?? [];
}

export async function fetchReferencePrices() {
  const { data, error } = await getSupabase()
    .from("reference_prices")
    .select("*")
    .order("category")
    .order("product_name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchAuditLog(limit = 500) {
  const { data, error } = await getSupabase()
    .from("audit_log")
    .select("id, action, entity, entity_id, detail, created_at, user_id")
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = data ?? [];
  const names = await userNameMap(
    rows.map((r) => r.user_id).filter((x): x is number => x != null)
  );
  const users = await getSupabase()
    .from("users")
    .select("id, username")
    .in("id", rows.map((r) => r.user_id).filter((x): x is number => x != null));
  if (users.error) throw users.error;
  const usernameMap = Object.fromEntries((users.data ?? []).map((u) => [u.id, u.username]));
  return rows.map((r) => ({
    ...r,
    user_name: r.user_id != null ? (names[r.user_id] ?? null) : null,
    username: r.user_id != null ? (usernameMap[r.user_id] ?? null) : null,
  }));
}

export async function fetchPendingUsers() {
  const { data, error } = await getSupabase()
    .from("users")
    .select("id, username, name, role, created_at")
    .eq("approval_status", "PENDING")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function fetchDecidedUsers(limit = 50) {
  const { data, error } = await getSupabase()
    .from("users")
    .select("id, username, name, role, created_at, approval_status, decided_at, decided_by")
    .in("approval_status", ["APPROVED", "REJECTED"])
    .not("decided_at", "is", null)
    .order("decided_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = data ?? [];
  const names = await userNameMap(
    rows.map((r) => r.decided_by).filter((x): x is number => x != null)
  );
  return rows.map((r) => ({
    ...r,
    decided_by_name: r.decided_by != null ? (names[r.decided_by] ?? null) : null,
  }));
}

type ReportPurchase = {
  category: string;
  vendor_name: string;
  unit_price: number | null;
  quantity: number;
  verdict: string;
  potential_saving: number | null;
};

export async function fetchPurchasesForReport(filters?: PurchaseFilters) {
  let q = getSupabase().from("purchases").select("category, vendor_name, unit_price, quantity, verdict, potential_saving");
  q = applyPurchaseFilters(q, filters);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ReportPurchase[];
}

export function aggregateReport(rows: ReportPurchase[]) {
  let total = 0;
  let value = 0;
  let flagged = 0;
  let savings = 0;
  const byCategory = new Map<string, { cnt: number; value: number; flagged: number }>();
  const byVendor = new Map<string, { cnt: number; value: number; flagged: number }>();

  for (const r of rows) {
    total++;
    const up = r.unit_price != null ? Number(r.unit_price) : 0;
    const qty = Number(r.quantity) || 0;
    const lineValue = up * qty;
    value += lineValue;
    const isFlagged = r.verdict === "BETTER_PRICE_AVAILABLE";
    if (isFlagged) {
      flagged++;
      savings += Number(r.potential_saving) || 0;
    }

    const cat = r.category || "Other";
    const catEntry = byCategory.get(cat) ?? { cnt: 0, value: 0, flagged: 0 };
    catEntry.cnt++;
    catEntry.value += lineValue;
    if (isFlagged) catEntry.flagged++;
    byCategory.set(cat, catEntry);

    const vendor = (r.vendor_name ?? "").trim();
    if (vendor) {
      const venEntry = byVendor.get(vendor) ?? { cnt: 0, value: 0, flagged: 0 };
      venEntry.cnt++;
      venEntry.value += lineValue;
      if (isFlagged) venEntry.flagged++;
      byVendor.set(vendor, venEntry);
    }
  }

  const byCategoryArr = [...byCategory.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.value - a.value);

  const byVendorArr = [...byVendor.entries()]
    .map(([vendor_name, v]) => ({ vendor_name, ...v }))
    .sort((a, b) => b.flagged - a.flagged || b.value - a.value)
    .slice(0, 15);

  return { summary: { total, value, flagged, savings }, byCategory: byCategoryArr, byVendor: byVendorArr };
}

export type ExportPurchaseRow = PurchaseRow & {
  ref_no: string;
  product_name: string;
  category: string;
  brand: string;
  model: string;
  quantity: number;
  unit_price: number | null;
  vendor_name: string;
  invoice_no: string;
  invoice_date: string;
  verdict: string;
  best_online_price: number | null;
  best_online_source: string | null;
  potential_saving: number | null;
  status: string;
  created_at: string;
  decision_note: string;
  decided_by?: number | null;
};

export async function fetchPurchasesForExport(filters?: PurchaseFilters): Promise<ExportPurchaseRow[]> {
  let q = getSupabase().from("purchases").select("*");
  q = applyPurchaseFilters(q, filters);
  q = q.order("id", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as ExportPurchaseRow[];
  const userIds = [
    ...rows.map((r) => r.created_by),
    ...rows.map((r) => r.decided_by).filter((x): x is number => x != null),
  ];
  const names = await userNameMap(userIds);
  return rows.map((r) => ({
    ...r,
    created_by_name: names[r.created_by] ?? "—",
    decided_by_name: r.decided_by != null ? (names[r.decided_by] ?? "") : "",
  }));
}