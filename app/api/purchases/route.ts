import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { fetchCategories } from "@/lib/categories";
import { fetchPurchases } from "@/lib/queries";
import { createPurchase, sanitizePurchaseBody, validatePurchasePayload } from "@/lib/purchases";

export async function GET(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const rows = await fetchPurchases({
    viewer: user,
    limit: 500,
    filters: {
      status: url.searchParams.get("status") ?? undefined,
      verdict: url.searchParams.get("verdict") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
    },
  });
  return NextResponse.json({ purchases: rows });
}

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const body = sanitizePurchaseBody(raw, user.role);
  const error = validatePurchasePayload(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const categories = await fetchCategories();
  const category = String(body.category ?? "").trim();
  if (!categories.some((c) => c.toLowerCase() === category.toLowerCase())) {
    return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
  }

  const id = await createPurchase(
    {
      productName: String(body.productName),
      category: String(body.category),
      brand: String(body.brand ?? ""),
      model: String(body.model ?? ""),
      specs: String(body.specs ?? ""),
      quantity: Number(body.quantity),
      unit: String(body.unit ?? "unit"),
      unitPrice:
        body.unitPrice != null && String(body.unitPrice).trim() !== "" ? Number(body.unitPrice) : null,
      vendorName: String(body.vendorName ?? ""),
      vendorContact: String(body.vendorContact ?? ""),
      invoiceNo: String(body.invoiceNo ?? ""),
      invoiceDate: String(body.invoiceDate ?? ""),
      notes: String(body.notes ?? ""),
      source: "FORM",
    },
    user.id
  );

  // Legacy path — no automatic Gemini or serper price check for old form entries
  return NextResponse.json({ id }, { status: 201 });
}