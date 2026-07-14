import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { BellOff, CheckCheck } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { MobileQueryErrorState, MobileInlineLoader } from "@/components/mobile/MobileStates";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useMobileNotifications,
  useUnreadNotificationCount,
} from "@/features/notifications/queries";
import { NotificationItem } from "@/components/mobile/notifications/NotificationItem";
import { NotificationsSkeleton } from "@/components/mobile/notifications/NotificationsSkeleton";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
  head: () => ({
    meta: [
      { title: "Thông báo — Minh Minh Sales Hub" },
      { name: "description", content: "Cập nhật liên quan đến công việc và khách hàng của bạn." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const PAGE_SIZE = 30;

function NotificationsPage() {
  const { currentUser } = useAuth();
  const userId = currentUser?.userId ?? null;
  const [offset, setOffset] = useState(0);
  const [tab, setTab] = useState<"all" | "unread">("all");

  const list = useMobileNotifications(userId, {
    limit: PAGE_SIZE,
    offset,
    unreadOnly: tab === "unread",
  });
  const unread = useUnreadNotificationCount(userId);
  const markRead = useMarkNotificationRead(userId);
  const markAll = useMarkAllNotificationsRead(userId);

  if (!userId) {
    return (
      <MobileShell title="Thông báo">
        <EmptyBlock
          title="Đăng nhập để xem thông báo"
          hint="Các cập nhật liên quan đến công việc của bạn sẽ xuất hiện tại đây."
        />
      </MobileShell>
    );
  }

  const items = list.data?.items ?? [];
  const hasMore = list.data?.hasMore ?? false;
  const unreadCount = unread.data ?? 0;

  return (
    <MobileShell title="Thông báo">
      <div className="sticky top-14 z-30 border-b border-border bg-[color:var(--surface)]/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-[color:var(--text-secondary)]">
            {unread.isLoading
              ? "Đang tải..."
              : unreadCount > 0
                ? (
                  <>
                    <span className="font-semibold text-[color:var(--brand-navy)]">
                      {unreadCount}
                    </span>{" "}
                    thông báo chưa đọc
                  </>
                )
                : "Bạn đã đọc tất cả thông báo"}
          </p>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 rounded-xl"
              disabled={markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              <CheckCheck className="h-4 w-4" />
              Đánh dấu đã đọc
            </Button>
          )}
        </div>
        <div className="mt-3 inline-flex h-9 rounded-xl border border-border bg-background p-0.5 text-[12.5px]">
          {(["all", "unread"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                if (k === tab) return;
                setTab(k);
                setOffset(0);
              }}
              className={cn(
                "min-w-[92px] rounded-lg px-3 font-medium transition-colors",
                tab === k
                  ? "bg-[color:var(--brand-navy)] text-[color:var(--primary-foreground)]"
                  : "text-[color:var(--text-secondary)]",
              )}
            >
              {k === "all" ? "Tất cả" : `Chưa đọc${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
            </button>
          ))}
        </div>
      </div>

      {list.isLoading && <NotificationsSkeleton count={6} />}

      {list.isError && (
        <MobileQueryErrorState
          message={list.error instanceof Error ? list.error.message : undefined}
          onRetry={() => list.refetch()}
        />
      )}

      {!list.isLoading && !list.isError && items.length === 0 && offset === 0 && (
        <EmptyBlock
          title="Chưa có thông báo"
          hint="Các cập nhật liên quan đến công việc của bạn sẽ xuất hiện tại đây."
        />
      )}

      {!list.isLoading && !list.isError && items.length > 0 && (
        <div className="space-y-2.5 px-4 py-3">
          {items.map((n) => (
            <NotificationItem
              key={n.id}
              item={n}
              onClick={() => {
                if (!n.read_at) markRead.mutate(n.id);
              }}
            />
          ))}
          {hasMore && (
            <Button
              type="button"
              variant="outline"
              className="mt-2 h-11 w-full rounded-xl"
              disabled={list.isFetching}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              Xem thêm
            </Button>
          )}
          {list.isFetching && <MobileInlineLoader />}
          {!hasMore && items.length > 6 && (
            <p className="pt-2 text-center text-[11.5px] text-[color:var(--text-tertiary)]">
              Bạn đã xem hết thông báo.
            </p>
          )}
        </div>
      )}
    </MobileShell>
  );
}

function EmptyBlock({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="m-4 rounded-2xl border border-dashed border-border bg-[color:var(--surface)] p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[color:var(--brand-navy-soft)]">
        <BellOff className="h-6 w-6 text-[color:var(--brand-navy)]" />
      </div>
      <p className="mt-3 text-sm font-semibold text-[color:var(--text-primary)]">{title}</p>
      {hint && (
        <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">{hint}</p>
      )}
    </div>
  );
}