import { NextResponse } from "next/server";
import { apiUser, isAdminLike } from "@/lib/auth";
import { createPurchaseRequest, fetchPurchaseRequests, fetchPurchaseRequestById } from "@/lib/requests";
import { getSupabase } from "@/lib/db";

export async function GET(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;

  const rows = await fetchPurchaseRequests(user, status);
  return NextResponse.json({ requests: rows });
}

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as any;

  const heading = String(body.productHeading || "").trim();
  const qty = Number(body.quantity);
  const unit = String(body.unit || "unit");
  const reason = String(body.reason || "").trim();
  const selected = Array.isArray(body.selectedOptions) ? body.selectedOptions : [];

  if (!heading) return NextResponse.json({ error: "Product heading required." }, { status: 400 });
  if (!reason) return NextResponse.json({ error: "Reason is required." }, { status: 400 });
  if (selected.length === 0) return NextResponse.json({ error: "Select at least one option." }, { status: 400 });
  if (!isFinite(qty) || qty <= 0) return NextResponse.json({ error: "Quantity must be > 0." }, { status: 400 });

  const id = await createPurchaseRequest({
    productHeading: heading,
    quantity: qty,
    unit,
    reason,
    selectedOptions: selected,
    userId: user.id,
  });

  return NextResponse.json({ id }, { status: 201 });
}
