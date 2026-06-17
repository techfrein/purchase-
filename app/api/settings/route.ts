import { NextResponse } from "next/server";
import { apiUser, isAdminLike } from "@/lib/auth";
import { setSetting } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const EDITABLE = [
  "tolerance_pct",
  "serper_key",
  "scrape_enabled",
  "catalog_enabled",
  "hospital_name",
];

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminLike(user.role)) return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const changed: string[] = [];
  for (const key of EDITABLE) {
    if (key in body) {
      let value = String(body[key]);
      if (key === "tolerance_pct") {
        const n = parseFloat(value);
        if (!isFinite(n) || n < 0 || n > 100) {
          return NextResponse.json({ error: "Tolerance must be between 0 and 100." }, { status: 400 });
        }
        value = String(n);
      }
      await setSetting(key, value);
      changed.push(key);
    }
  }
  if (changed.length > 0) {
    await logAudit(user.id, "SETTINGS_UPDATED", "settings", "", `Changed: ${changed.join(", ")}`);
  }
  return NextResponse.json({ ok: true });
}