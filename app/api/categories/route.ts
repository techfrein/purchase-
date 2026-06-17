import { NextResponse } from "next/server";
import { apiUser, isAdminLike } from "@/lib/auth";
import { addCategory, fetchCategories } from "@/lib/categories";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const categories = await fetchCategories();
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminLike(user.role)) {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Category name is required." }, { status: 400 });

  try {
    const categories = await addCategory(name);
    await logAudit(user.id, "CATEGORY_ADDED", "category", "", name);
    return NextResponse.json({ categories }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not add category." },
      { status: 400 }
    );
  }
}