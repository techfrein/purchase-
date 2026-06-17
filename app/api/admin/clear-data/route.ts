import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { getSupabase } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const CONFIRM_PHRASE = "DELETE ALL";

/**
 * Owner-only: permanently delete every purchase request and its scraped price
 * listings. Users, sessions, settings and the reference catalog are kept.
 * Irreversible — requires an exact typed confirmation phrase.
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Only the owner can clear all data." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { confirm?: string };
  if ((body.confirm ?? "").trim() !== CONFIRM_PHRASE) {
    return NextResponse.json(
      { error: `Type "${CONFIRM_PHRASE}" to confirm.` },
      { status: 400 }
    );
  }

  const supabase = getSupabase();

  // How many we're about to remove, for the audit record.
  const { count } = await supabase.from("purchases").select("*", { count: "exact", head: true });

  // Delete listings first, then purchases (FK cascade would handle listings,
  // but being explicit avoids relying on the cascade and clears orphans too).
  // `.neq("id", -1)` matches every row (no id is -1) — Supabase requires a
  // filter on delete to avoid accidental unfiltered deletes.
  const delListings = await supabase.from("price_listings").delete().neq("id", -1);
  if (delListings.error) throw delListings.error;

  const delPurchases = await supabase.from("purchases").delete().neq("id", -1);
  if (delPurchases.error) throw delPurchases.error;

  await logAudit(
    user.id,
    "DATA_CLEARED",
    "purchase",
    "",
    `${user.username} cleared all purchase data (${count ?? 0} request(s) deleted)`
  );

  return NextResponse.json({ ok: true, deleted: count ?? 0 });
}
