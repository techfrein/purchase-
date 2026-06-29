import { NextResponse } from "next/server";
import { apiUser, isAdminLike } from "@/lib/auth";
import { adminActOnRequest, ownerApproveRequest, fetchPurchaseRequestById } from "@/lib/requests";
import { getSupabase } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const reqId = Number(id);
  const body = (await req.json().catch(() => ({}))) as any;

  const action = String(body.action || "").toUpperCase(); // ADMIN_APPROVE, ADMIN_REJECT, OWNER_APPROVE

  const supabase = getSupabase();
  const pr = await fetchPurchaseRequestById(reqId, user);
  if (!pr) return NextResponse.json({ error: "Request not found or no access." }, { status: 404 });

  try {
    if (action === "ADMIN_APPROVE" || action === "ADMIN_REJECT") {
      if (!isAdminLike(user.role)) {
        return NextResponse.json({ error: "Admin only." }, { status: 403 });
      }
      if (pr.status !== "PENDING_ADMIN") {
        return NextResponse.json({ error: "Request not pending admin review." }, { status: 409 });
      }
      await adminActOnRequest({
        requestId: reqId,
        action: action === "ADMIN_APPROVE" ? "APPROVE" : "REJECT",
        note: body.note,
        recommendations: body.recommendations,
        adminId: user.id,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "OWNER_APPROVE") {
      if (user.role !== "OWNER") return NextResponse.json({ error: "Owner only." }, { status: 403 });
      if (!body.chosenOption || !body.chosenOption.title) {
        return NextResponse.json({ error: "Chosen option is required." }, { status: 400 });
      }
      if (!body.purchaserId) {
        return NextResponse.json({ error: "Choose who will purchase / acquire the item." }, { status: 400 });
      }

      const recipientIds: number[] = Array.isArray(body.recipientIds) ? body.recipientIds : [];
      // Ensure original requester is included if they want visibility?
      const ticketId = await ownerApproveRequest({
        requestId: reqId,
        chosenOption: body.chosenOption,
        note: body.note,
        purchaserId: Number(body.purchaserId),
        recipientIds,
        ownerId: user.id,
      });
      return NextResponse.json({ ok: true, ticketId });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Action failed" }, { status: 400 });
  }
}
