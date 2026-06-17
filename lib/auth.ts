import crypto from "crypto";
import { cache } from "react";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabase } from "./db";
import { logAudit } from "./audit";

export const SESSION_COOKIE = "hpv_session";
const SESSION_DAYS = 7;

export type Role = "OWNER" | "ADMIN" | "STAFF" | "PURCHASE";

export function isAdminLike(role: Role): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export type SessionUser = {
  id: number;
  username: string;
  name: string;
  role: Role;
};

export type LoginResult =
  | { ok: true; user: SessionUser }
  | { ok: false; status: number; error: string };

function isActive(active: boolean | number | null | undefined): boolean {
  return active === true || active === 1;
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const supabase = getSupabase();
  const { data: row, error } = await supabase
    .from("users")
    .select("id, username, password_hash, name, role, active, approval_status")
    .eq("username", username.trim().toLowerCase())
    .maybeSingle();

  if (error) throw error;
  if (!row || !isActive(row.active) || !row.password_hash || !bcrypt.compareSync(password, row.password_hash)) {
    return { ok: false, status: 401, error: "Invalid username or password." };
  }
  if (row.approval_status === "PENDING") {
    return { ok: false, status: 403, error: "Your account is awaiting administrator approval." };
  }
  if (row.approval_status !== "APPROVED") {
    return { ok: false, status: 403, error: "This account has been rejected. Contact an administrator." };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await supabase.from("sessions").insert({
    token,
    user_id: row.id,
    expires_at: expires.toISOString(),
  });
  await supabase.from("sessions").delete().lt("expires_at", new Date().toISOString());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });

  const user = { id: row.id, username: row.username, name: row.name, role: row.role as Role };
  await logAudit(user.id, "LOGIN", "user", String(user.id), `${user.username} logged in`);
  return { ok: true, user };
}

export type SignupResult = { ok: true } | { ok: false; status: number; error: string };

export async function signup(input: {
  username: string;
  name: string;
  password: string;
  role: string;
}): Promise<SignupResult> {
  const username = input.username.trim().toLowerCase();
  const name = input.name.trim();
  const role = input.role === "STAFF" || input.role === "PURCHASE" ? input.role : null;

  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    return {
      ok: false,
      status: 400,
      error: "Username must be 3–30 characters (letters, digits, dot, dash, underscore).",
    };
  }
  if (!name) return { ok: false, status: 400, error: "Full name is required." };
  if (input.password.length < 6) {
    return { ok: false, status: 400, error: "Password must be at least 6 characters." };
  }
  if (!role) return { ok: false, status: 400, error: "Choose a valid role." };

  const supabase = getSupabase();
  const { data: exists } = await supabase.from("users").select("id").eq("username", username).maybeSingle();
  if (exists) return { ok: false, status: 409, error: "That username is already taken." };

  const { data: created, error } = await supabase
    .from("users")
    .insert({
      username,
      password_hash: bcrypt.hashSync(input.password, 10),
      name,
      role,
      approval_status: "PENDING",
    })
    .select("id")
    .single();

  if (error) throw error;
  await logAudit(null, "SIGNUP", "user", String(created.id), `${username} (${role}) pending approval`);
  return { ok: true };
}

export async function logout() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const user = await getSessionUser();
    await getSupabase().from("sessions").delete().eq("token", token);
    if (user) await logAudit(user.id, "LOGOUT", "user", String(user.id), `${user.username} logged out`);
  }
  cookieStore.delete(SESSION_COOKIE);
}

// Deduped per request: the app layout and the page both call requireUser(),
// and several components call getSessionUser() during one render. cache()
// collapses all of those into a single session+user lookup per request.
export const getSessionUser = cache(async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  // One round-trip instead of two: join the user row onto the session row.
  const { data: session, error: sErr } = await getSupabase()
    .from("sessions")
    .select("user:users(id, username, name, role, active)")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (sErr) throw sErr;

  const user = session?.user as
    | { id: number; username: string; name: string; role: string; active: boolean | number | null }
    | undefined;
  if (!user || !isActive(user.active)) return null;

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role as Role,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdminLike(user.role)) redirect("/");
  return user;
}

export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "OWNER") redirect("/");
  return user;
}

export async function apiUser(): Promise<SessionUser | null> {
  return getSessionUser();
}