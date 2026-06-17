import { getSupabase } from "./db";

export async function logAudit(
  userId: number | null,
  action: string,
  entity = "",
  entityId = "",
  detail = ""
) {
  const { error } = await getSupabase().from("audit_log").insert({
    user_id: userId,
    action,
    entity,
    entity_id: entityId,
    detail,
  });
  if (error) throw error;
}