import { NextResponse } from "next/server";
import { apiUser, isAdminLike } from "@/lib/auth";
import { getSupabase } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { fetchPurchaseById } from "@/lib/queries";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminLike(user.role)) {
    return NextResponse.json({ error: "Only administrators can approve or reject purchases." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { decision?: string; note?: string };
  if (body.decision !== "APPROVED" && body.decision !== "REJECTED") {
    return NextResponse.json({ error: "Decision must be APPROVED or REJECTED." }, { status: 400 });
  }

  const purchase = await fetchPurchaseById(Number(id), user);
  if (!purchase) return NextResponse.json({ error: "Purchase not found." }, { status: 404 });

  const supabase = getSupabase();
  if (purchase.status !== "PENDING_REVIEW") {
    return NextResponse.json({ error: "This purchase has already been decided." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("purchases")
    .update({
      status: body.decision,
      decided_by: user.id,
      decided_at: now,
      decision_note: (body.note ?? "").trim(),
      updated_at: now,
    })
    .eq("id", Number(purchase.id));
  if (error) throw error;

  await logAudit(
    user.id,
    body.decision === "APPROVED" ? "PURCHASE_APPROVED" : "PURCHASE_REJECTED",
    "purchase",
    String(purchase.id),
    `${purchase.ref_no}${body.note ? ` — ${body.note.trim()}` : ""}`
  );
  return NextResponse.json({ ok: true });
}