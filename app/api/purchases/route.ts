import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { fetchPurchases } from "@/lib/queries";
import { createPurchase, sanitizePurchaseBody, validatePurchasePayload } from "@/lib/purchases";
import { runPriceCheck } from "@/lib/pricecheck/engine";

export async function GET(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const rows = await fetchPurchases({
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

  const id = await createPurchase(
    {
      productName: String(body.productName),
      category: String(body.category),
      brand: String(body.brand ?? ""),
      model: String(body.model ?? ""),
      specs: String(body.specs ?? ""),
      quantity: Number(body.quantity),
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

  try {
    await runPriceCheck(id, user.id);
  } catch {
    // Purchase stays UNCHECKED; re-check from detail page.
  }
  return NextResponse.json({ id }, { status: 201 });
}