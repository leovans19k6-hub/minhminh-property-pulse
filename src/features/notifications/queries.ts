import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUnreadCount,
  listNotifications,
  markAllRead,
  markRead,
} from "@/services/notifications.service";
import { queryKeys } from "@/lib/queryKeys";

export function useMobileNotifications(
  userId: string | null | undefined,
  page: { limit: number; offset: number },
) {
  return useQuery({
    queryKey: [
      ...queryKeys.notifications(userId ?? "anon"),
      "list",
      page.limit,
      page.offset,
    ],
    queryFn: () => listNotifications(userId!, page.limit, page.offset),
    enabled: !!userId,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useUnreadNotificationCount(userId: string | null | undefined) {
  return useQuery({
    queryKey: userId
      ? queryKeys.unreadNotificationCount(userId)
      : ["notifications", "unread-count", "anon"],
    queryFn: () => getUnreadCount(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead(userId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => markRead(notificationId),
    onSuccess: () => {
      if (!userId) return;
      qc.invalidateQueries({ queryKey: queryKeys.notifications(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.unreadNotificationCount(userId) });
    },
  });
}

export function useMarkAllNotificationsRead(userId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllRead(userId!),
    onSuccess: () => {
      if (!userId) return;
      qc.invalidateQueries({ queryKey: queryKeys.notifications(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.unreadNotificationCount(userId) });
    },
  });
}