import { supabase } from "../supabaseClient";
import { logAdminActivity } from "./activityLogService";

const notificationSelect = `
  id,
  title,
  body,
  notification_type,
  scheduled_at,
  created_at,
  created_by
`;

export async function listNotifications(limit = 100) {
  return await supabase
    .from("notifications")
    .select(notificationSelect)
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function listRecentNotifications(limit = 5) {
  return listNotifications(limit);
}

export async function insertNotification(row) {
  const res = await supabase
    .from("notifications")
    .insert(row)
    .select(notificationSelect)
    .single();
  if (!res.error && res.data?.id) {
    void logAdminActivity({
      action: "notification.create",
      entityType: "notification",
      entityId: res.data.id,
      summary: res.data.title,
    });
  }
  return res;
}

export async function updateNotification(id, row) {
  const res = await supabase
    .from("notifications")
    .update(row)
    .eq("id", id)
    .select(notificationSelect)
    .single();
  if (!res.error) {
    void logAdminActivity({
      action: "notification.update",
      entityType: "notification",
      entityId: id,
      summary: row?.title,
    });
  }
  return res;
}

export async function deleteNotification(id) {
  const res = await supabase.from("notifications").delete().eq("id", id);
  if (!res.error) {
    void logAdminActivity({
      action: "notification.delete",
      entityType: "notification",
      entityId: id,
    });
  }
  return res;
}
