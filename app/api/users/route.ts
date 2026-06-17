import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { apiUser, isAdminLike } from "@/lib/auth";
import { getSupabase } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const VALID_ROLES = ["OWNER", "ADMIN", "STAFF", "PURCHASE"];

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminLike(user.role)) return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    username?: string;
    name?: string;
    password?: string;
    role?: string;
  };
  const username = (body.username ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim();
  const password = body.password ?? "";
  const role = VALID_ROLES.includes(body.role ?? "") ? (body.role as string) : "PURCHASE";

  if ((role === "OWNER" || role === "ADMIN") && user.role !== "OWNER") {
    return NextResponse.json(
      { error: "Only the owner can create owner or administrator accounts." },
      { status: 403 }
    );
  }

  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3–30 characters (letters, digits, dot, dash, underscore)." },
      { status: 400 }
    );
  }
  if (!name) return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: exists } = await supabase.from("users").select("id").eq("username", username).maybeSingle();
  if (exists) return NextResponse.json({ error: "Username is already taken." }, { status: 409 });

  const { data: created, error } = await supabase
    .from("users")
    .insert({
      username,
      password_hash: bcrypt.hashSync(password, 10),
      name,
      role,
    })
    .select("id")
    .single();

  if (error) throw error;
  await logAudit(user.id, "USER_CREATED", "user", String(created.id), `${username} (${role})`);
  return NextResponse.json({ id: created.id }, { status: 201 });
}