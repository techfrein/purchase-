import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { apiUser, isAdminLike } from "@/lib/auth";
import { getSupabase } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const VALID_ROLES = ["OWNER", "ADMIN", "STAFF", "PURCHASE"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminLike(user.role)) return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const { id } = await params;
  const targetId = Number(id);
  const supabase = getSupabase();

  const { data: target, error: fetchErr } = await supabase
    .from("users")
    .select("id, username, role, active")
    .eq("id", targetId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const isOwner = user.role === "OWNER";
  const targetIsPrivileged = target.role === "OWNER" || target.role === "ADMIN";

  if (targetIsPrivileged && !isOwner && target.id !== user.id) {
    return NextResponse.json(
      { error: "Only the owner can manage owner or administrator accounts." },
      { status: 403 }
    );
  }

  const countOwners = async () => {
    const { count, error } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "OWNER")
      .eq("active", true);
    if (error) throw error;
    return count ?? 0;
  };

  const body = (await req.json().catch(() => ({}))) as {
    active?: boolean;
    password?: string;
    role?: string;
  };

  if (typeof body.active === "boolean") {
    if (target.id === user.id && !body.active) {
      return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 });
    }
    if (!body.active && target.role === "OWNER" && (await countOwners()) <= 1) {
      return NextResponse.json({ error: "Cannot deactivate the only owner." }, { status: 400 });
    }
    const { error } = await supabase.from("users").update({ active: body.active }).eq("id", targetId);
    if (error) throw error;
    if (!body.active) await supabase.from("sessions").delete().eq("user_id", targetId);
    await logAudit(user.id, body.active ? "USER_ACTIVATED" : "USER_DEACTIVATED", "user", String(targetId), target.username);
  }

  if (body.password) {
    if (body.password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }
    const { error } = await supabase
      .from("users")
      .update({ password_hash: bcrypt.hashSync(body.password, 10) })
      .eq("id", targetId);
    if (error) throw error;
    await supabase.from("sessions").delete().eq("user_id", targetId);
    await logAudit(user.id, "USER_PASSWORD_RESET", "user", String(targetId), target.username);
  }

  if (VALID_ROLES.includes(body.role ?? "") && body.role !== target.role) {
    const newRole = body.role as string;
    const newIsPrivileged = newRole === "OWNER" || newRole === "ADMIN";
    if ((newIsPrivileged || targetIsPrivileged) && !isOwner) {
      return NextResponse.json(
        { error: "Only the owner can change owner or administrator roles." },
        { status: 403 }
      );
    }
    if (target.role === "OWNER" && newRole !== "OWNER" && (await countOwners()) <= 1) {
      return NextResponse.json({ error: "Cannot demote the only owner." }, { status: 400 });
    }
    const { error } = await supabase.from("users").update({ role: newRole }).eq("id", targetId);
    if (error) throw error;
    await logAudit(user.id, "USER_ROLE_CHANGED", "user", String(targetId), `${target.username} → ${newRole}`);
  }

  return NextResponse.json({ ok: true });
}