import type { Role, SessionUser } from "./auth";
import { getSupabase } from "./db";

export type PurchaseScope =
  | { type: "all" }
  | { type: "own"; userId: number }
  | { type: "department"; roles: Role[] }
  | { type: "all_except_owner" };

/** Who may view which purchases in lists, reports, and detail pages. */
export function purchaseScope(user: SessionUser): PurchaseScope {
  if (user.role === "OWNER") return { type: "all" };
  if (user.role === "ADMIN") return { type: "all_except_owner" };
  if (user.role === "PURCHASE") return { type: "department", roles: ["PURCHASE"] };
  return { type: "own", userId: user.id };
}

type ScopeContext = {
  departmentIds?: number[];
  ownerIds?: number[];
};

async function userIdsByRoles(roles: Role[]): Promise<number[]> {
  const { data, error } = await getSupabase().from("users").select("id").in("role", roles);
  if (error) throw error;
  return (data ?? []).map((u) => u.id);
}

async function creatorRole(createdBy: number): Promise<Role | null> {
  const { data, error } = await getSupabase().from("users").select("role").eq("id", createdBy).maybeSingle();
  if (error) throw error;
  return (data?.role as Role) ?? null;
}

export async function purchaseScopeContext(scope: PurchaseScope): Promise<ScopeContext> {
  if (scope.type === "department") {
    return { departmentIds: await userIdsByRoles(scope.roles) };
  }
  if (scope.type === "all_except_owner") {
    return { ownerIds: await userIdsByRoles(["OWNER"]) };
  }
  return {};
}

/** Sync filter — must not be async or Supabase builders get executed early. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyPurchaseScopeFilter(q: any, scope: PurchaseScope, ctx: ScopeContext) {
  if (scope.type === "all") return q;
  if (scope.type === "own") return q.eq("created_by", scope.userId);
  if (scope.type === "department") {
    const ids = ctx.departmentIds ?? [];
    if (ids.length === 0) return q.eq("created_by", -1);
    return q.in("created_by", ids);
  }
  let filtered = q;
  for (const id of ctx.ownerIds ?? []) {
    filtered = filtered.neq("created_by", id);
  }
  return filtered;
}

export async function canViewPurchase(
  viewer: SessionUser,
  purchase: { created_by: number }
): Promise<boolean> {
  const scope = purchaseScope(viewer);
  if (scope.type === "all") return true;
  if (scope.type === "own") return purchase.created_by === viewer.id;
  if (scope.type === "department") {
    const role = await creatorRole(purchase.created_by);
    return role != null && scope.roles.includes(role);
  }
  const role = await creatorRole(purchase.created_by);
  return role !== "OWNER";
}