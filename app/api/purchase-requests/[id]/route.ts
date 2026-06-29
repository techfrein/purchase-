import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { fetchPurchaseRequestById } from "@/lib/requests";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const r = await fetchPurchaseRequestById(Number(id), user);
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ request: r });
}
