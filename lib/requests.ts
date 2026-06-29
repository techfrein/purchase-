import { getSupabase, nextRefNo } from "./db";
import { logAudit } from "./audit";
import type { SessionUser } from "./auth";

export type SelectedOption = {
  title: string;
  source: string;
  price: number;
  url?: string | null;
  selection_reason?: string;
};

export type RequestStatus = "PENDING_ADMIN" | "PENDING_OWNER" | "APPROVED" | "REJECTED";

export type PurchaseRequest = {
  id: number;
  ref_no: string;
  requested_by: number;
  requested_by_name?: string;
  product_heading: string;
  quantity: number;
  unit: string;
  reason: string;
  selected_options: SelectedOption[];
  status: RequestStatus;
  admin_note: string;
  admin_recommendations: any[];
  admin_decided_by?: number | null;
  admin_decided_at?: string | null;
  owner_note: string;
  owner_chosen_option?: SelectedOption | null;
  owner_decided_by?: number | null;
  owner_decided_at?: string | null;
  created_at: string;
};

export type PurchaseTicket = {
  id: number;
  ref_no: string;
  request_id?: number | null;
  product_title: string;
  source: string;
  unit_price: number;
  quantity: number;
  unit: string;
  chosen_url?: string | null;
  requested_by?: number | null;
  requested_reason?: string | null;
  approved_by?: number | null;
  approved_at?: string | null;
  purchaser_id?: number | null;
  recipient_ids?: number[];
  notes?: string;
  created_at: string;
};

export async function createPurchaseRequest(data: {
  productHeading: string;
  quantity: number;
  unit: string;
  reason: string;
  selectedOptions: SelectedOption[];
  userId: number;
}): Promise<number> {
  const refNo = await nextRefNo("PRQ");
  const supabase = getSupabase();

  const { data: row, error } = await supabase
    .from("purchase_requests")
    .insert({
      ref_no: refNo,
      requested_by: data.userId,
      product_heading: data.productHeading.trim(),
      quantity: Math.max(0.001, Math.round(data.quantity * 1000) / 1000),
      unit: data.unit,
      reason: data.reason.trim(),
      selected_options: data.selectedOptions,
      status: "PENDING_ADMIN",
    })
    .select("id")
    .single();

  if (error) throw error;
  const id = row.id as number;

  await logAudit(
    data.userId,
    "REQUEST_CREATED",
    "purchase_request",
    String(id),
    `${refNo}: ${data.productHeading} (qty ${data.quantity} ${data.unit})`
  );
  return id;
}

export async function fetchPurchaseRequests(viewer: SessionUser, status?: string) {
  const supabase = getSupabase();
  let q = supabase.from("purchase_requests").select("*").order("created_at", { ascending: false });

  if (viewer.role === "STAFF" || viewer.role === "PURCHASE") {
    q = q.eq("requested_by", viewer.id);
  } else if (viewer.role === "ADMIN") {
    // Admins see pending admin + all decided recent
    if (status === "PENDING_ADMIN") q = q.eq("status", "PENDING_ADMIN");
    else q = q.in("status", ["PENDING_ADMIN", "PENDING_OWNER", "APPROVED", "REJECTED"]);
  } else if (viewer.role === "OWNER") {
    if (status === "PENDING_OWNER") q = q.eq("status", "PENDING_OWNER");
  }

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as any[];
  const ids = [...new Set(rows.map((r) => r.requested_by))];
  const { data: users } = await supabase.from("users").select("id, name").in("id", ids.length ? ids : [-1]);
  const nameMap: Record<number, string> = Object.fromEntries((users ?? []).map((u: any) => [u.id, u.name]));

  return rows.map((r) => ({
    ...r,
    requested_by_name: nameMap[r.requested_by] ?? "—",
    selected_options: (r.selected_options ?? []) as SelectedOption[],
    admin_recommendations: (r.admin_recommendations ?? []) as any[],
  })) as PurchaseRequest[];
}

export async function fetchPurchaseRequestById(id: number, viewer: SessionUser) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("purchase_requests").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  // Permission: owner/admin see all, others only own
  if (viewer.role !== "OWNER" && viewer.role !== "ADMIN" && data.requested_by !== viewer.id) {
    return null;
  }

  const { data: u } = await supabase.from("users").select("name").eq("id", data.requested_by).maybeSingle();

  return {
    ...data,
    requested_by_name: u?.name ?? "—",
    selected_options: (data.selected_options ?? []) as SelectedOption[],
    admin_recommendations: (data.admin_recommendations ?? []) as any[],
  } as PurchaseRequest;
}

export async function adminActOnRequest(params: {
  requestId: number;
  action: "APPROVE" | "REJECT";
  note?: string;
  recommendations?: any[];
  adminId: number;
}) {
  const supabase = getSupabase();
  const { data: req } = await supabase.from("purchase_requests").select("*").eq("id", params.requestId).maybeSingle();
  if (!req) throw new Error("Request not found");
  if (req.status !== "PENDING_ADMIN") throw new Error("Request not awaiting admin");

  const newStatus = params.action === "APPROVE" ? "PENDING_OWNER" : "REJECTED";
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("purchase_requests")
    .update({
      status: newStatus,
      admin_note: (params.note ?? "").trim(),
      admin_recommendations: params.recommendations ?? req.admin_recommendations ?? [],
      admin_decided_by: params.adminId,
      admin_decided_at: now,
      updated_at: now,
    })
    .eq("id", params.requestId);

  if (error) throw error;

  await logAudit(
    params.adminId,
    params.action === "APPROVE" ? "REQUEST_ADMIN_APPROVED" : "REQUEST_REJECTED",
    "purchase_request",
    String(params.requestId),
    `${req.ref_no} ${params.note ? "— " + params.note : ""}`
  );
}

export async function ownerApproveRequest(params: {
  requestId: number;
  chosenOption: SelectedOption;
  note?: string;
  purchaserId: number;
  recipientIds: number[];
  ownerId: number;
}): Promise<number> {
  const supabase = getSupabase();
  const { data: req } = await supabase.from("purchase_requests").select("*").eq("id", params.requestId).maybeSingle();
  if (!req) throw new Error("Not found");
  if (req.status !== "PENDING_OWNER" && req.status !== "PENDING_ADMIN") {
    // allow owner direct if needed
  }

  const now = new Date().toISOString();

  // Update request
  await supabase
    .from("purchase_requests")
    .update({
      status: "APPROVED",
      owner_note: (params.note ?? "").trim(),
      owner_chosen_option: params.chosenOption,
      owner_decided_by: params.ownerId,
      owner_decided_at: now,
      updated_at: now,
    })
    .eq("id", params.requestId);

  // Create ticket
  const ticketRef = await nextRefNo("TKT");
  // Always ensure visibility for original requester + purchaser + admin-like
  const baseRecips = [req.requested_by, params.purchaserId].filter(Boolean);
  const finalRecipients = Array.from(new Set([...(params.recipientIds || []), ...baseRecips]));

  const { data: ticketRow, error: tErr } = await supabase
    .from("purchase_tickets")
    .insert({
      ref_no: ticketRef,
      request_id: params.requestId,
      product_title: params.chosenOption.title,
      source: params.chosenOption.source,
      unit_price: params.chosenOption.price,
      quantity: Number(req.quantity),
      unit: req.unit,
      chosen_url: params.chosenOption.url ?? null,
      requested_by: req.requested_by,
      requested_reason: req.reason,
      approved_by: params.ownerId,
      approved_at: now,
      purchaser_id: params.purchaserId,
      recipient_ids: finalRecipients,
      notes: (params.note ?? "").trim(),
    })
    .select("id")
    .single();

  if (tErr) throw tErr;

  await logAudit(
    params.ownerId,
    "REQUEST_OWNER_APPROVED",
    "purchase_ticket",
    String(ticketRow.id),
    `${ticketRef} — ${params.chosenOption.title} @ ₹${params.chosenOption.price} | purchaser:${params.purchaserId}`
  );

  return ticketRow.id as number;
}

export async function fetchPurchaseTickets(viewer: SessionUser) {
  const supabase = getSupabase();
  let q = supabase.from("purchase_tickets").select("*").order("created_at", { ascending: false });

  if (viewer.role === "STAFF" || viewer.role === "PURCHASE") {
    q = q.eq("requested_by", viewer.id);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PurchaseTicket[];
}

export async function fetchUsersForSelect() {
  const { data, error } = await getSupabase().from("users").select("id, name, role, username").eq("active", true);
  if (error) throw error;
  return (data ?? []).map((u: any) => ({ id: u.id, name: u.name, role: u.role, username: u.username }));
}

export async function newFlowDashboardCounts(viewer: SessionUser) {
  const supabase = getSupabase();

  // Simple counts focused on new flow
  const [reqRes, ticketRes] = await Promise.all([
    supabase.from("purchase_requests").select("id, status, created_at", { count: "exact", head: false }),
    supabase.from("purchase_tickets").select("id, created_at", { count: "exact", head: false }),
  ]);

  const reqs = reqRes.data ?? [];
  const pendingAdmin = reqs.filter((r: any) => r.status === "PENDING_ADMIN").length;
  const pendingOwner = reqs.filter((r: any) => r.status === "PENDING_OWNER").length;
  const approved = reqs.filter((r: any) => r.status === "APPROVED").length;

  return {
    requestsTotal: reqRes.count ?? reqs.length,
    pendingAdmin,
    pendingOwner,
    approvedRequests: approved,
    tickets: ticketRes.count ?? 0,
  };
}
