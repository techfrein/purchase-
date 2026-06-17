import { NextResponse } from "next/server";
import { apiUser, isAdminLike } from "@/lib/auth";
import { getSupabase } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminLike(user.role)) return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const { id } = await params;
  const supabase = getSupabase();
  const { data: row, error: fetchErr } = await supabase
    .from("reference_prices")
    .select("product_name")
    .eq("id", Number(id))
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!row) return NextResponse.json({ error: "Entry not found." }, { status: 404 });

  const { error } = await supabase.from("reference_prices").delete().eq("id", Number(id));
  if (error) throw error;
  await logAudit(user.id, "CATALOG_DELETED", "reference_price", id, row.product_name);
  return NextResponse.json({ ok: true });
}