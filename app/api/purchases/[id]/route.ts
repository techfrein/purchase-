import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { getSupabase } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { fetchPurchaseById } from "@/lib/queries";

/** Delete a purchase — Owner only. Cascades to its price listings. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Only the owner can delete purchases." }, { status: 403 });
  }

  const { id } = await params;
  const purchase = await fetchPurchaseById(Number(id), user);
  if (!purchase) return NextResponse.json({ error: "Purchase not found." }, { status: 404 });

  const { error } = await getSupabase().from("purchases").delete().eq("id", Number(purchase.id));
  if (error) throw error;

  await logAudit(user.id, "PURCHASE_DELETED", "purchase", String(purchase.id), String(purchase.ref_no));
  return NextResponse.json({ ok: true });
}
