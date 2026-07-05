import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap } from "./_helpers";

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export interface NotificationsPage {
  items: NotificationRow[];
  hasMore: boolean;
  limit: number;
  offset: number;
}

export async function listNotifications(
  userId: string,
  limit = 30,
  offset = 0,
): Promise<NotificationsPage> {
  const res = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);
  const rows = unwrap(res, "notifications.list");
  const hasMore = rows.length > limit;
  return { items: hasMore ? rows.slice(0, limit) : rows, hasMore, limit, offset };
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

export async function markAllRead(userId: string): Promise<number> {
  const res = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null)
    .select("id");
  if (res.error) throw new Error(`[notifications.markAllRead] ${res.error.message}`);
  return res.data?.length ?? 0;
}