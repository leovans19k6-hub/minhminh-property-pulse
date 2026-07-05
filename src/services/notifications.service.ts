import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap } from "./_helpers";

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export async function listNotifications(userId: string): Promise<NotificationRow[]> {
  const res = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  return unwrap(res, "notifications.list");
}

export async function getUnreadCount(userId: string): Promise<number> {
  const res = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (res.error) throw new Error(`[notifications.unread] ${res.error.message}`);
  return res.count ?? 0;
}

export async function markRead(notificationId: string): Promise<void> {
  const res = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);
  if (res.error) throw new Error(`[notifications.markRead] ${res.error.message}`);
}