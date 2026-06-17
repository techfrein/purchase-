import { NextResponse } from "next/server";
import { apiUser, isAdminLike } from "@/lib/auth";
import { getSupabase } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await apiUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminLike(admin.role)) return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const { id } = await params;
  const targetId = Number(id);
  const body = (await req.json().catch(() => ({}))) as { decision?: string };
  if (body.decision !== "APPROVED" && body.decision !== "REJECTED") {
    return NextResponse.json({ error: "Decision must be APPROVED or REJECTED." }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: target, error: fetchErr } = await supabase
    .from("users")
    .select("id, username, approval_status")
    .eq("id", targetId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!target) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (target.approval_status !== "PENDING") {
    return NextResponse.json({ error: "This account has already been decided." }, { status: 409 });
  }

  const { error } = await supabase
    .from("users")
    .update({
      approval_status: body.decision,
      decided_by: admin.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", targetId);
  if (error) throw error;

  await logAudit(
    admin.id,
    body.decision === "APPROVED" ? "ACCOUNT_APPROVED" : "ACCOUNT_REJECTED",
    "user",
    String(targetId),
    target.username
  );
  return NextResponse.json({ ok: true });
}