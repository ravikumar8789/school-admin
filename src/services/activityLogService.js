import { supabase } from "../supabaseClient";

/**
 * Best-effort audit row; failures are swallowed so core flows are never blocked.
 */
export async function logAdminActivity({
  action,
  entityType = null,
  entityId = null,
  summary = null,
  metadata = null,
}) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id || !action) return;

    const row = {
      admin_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      summary,
      metadata: metadata && typeof metadata === "object" ? metadata : null,
    };

    const { error } = await supabase.from("admin_activity_log").insert(row);
    if (error && import.meta.env.DEV) {
      console.warn("activity log insert:", error.message);
    }
  } catch {
    /* ignore */
  }
}

export async function listAdminActivity({ limit = 80, offset = 0 } = {}) {
  return supabase
    .from("admin_activity_log")
    .select("id, action, entity_type, entity_id, summary, metadata, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
}
