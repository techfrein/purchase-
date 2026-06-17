import { NextResponse } from "next/server";
import { apiUser, isAdminLike } from "@/lib/auth";
import { getSupabase } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminLike(user.role)) return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const productName = String(body.productName ?? "").trim();
  const category = String(body.category ?? "").trim() || "Other";
  const price = Number(body.price);
  if (!productName) return NextResponse.json({ error: "Product name is required." }, { status: 400 });
  if (!isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Price must be a positive number." }, { status: 400 });
  }

  const { data: created, error } = await getSupabase()
    .from("reference_prices")
    .insert({
      product_name: productName,
      category,
      brand: String(body.brand ?? "").trim(),
      model: String(body.model ?? "").trim(),
      price,
      source: String(body.source ?? "").trim() || "Internal Catalog",
      url: String(body.url ?? "").trim() || null,
    })
    .select("id")
    .single();

  if (error) throw error;
  await logAudit(user.id, "CATALOG_ADDED", "reference_price", String(created.id), `${productName} @ ₹${price}`);
  return NextResponse.json({ id: created.id }, { status: 201 });
}