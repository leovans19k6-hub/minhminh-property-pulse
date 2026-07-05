import { Link } from "@tanstack/react-router";
import { Bell, Building2, ClipboardList, PartyPopper, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificationRow } from "@/services/notifications.service";

function iconFor(type: string) {
  if (type.startsWith("voucher")) return Ticket;
  if (type.startsWith("event") || type.startsWith("site_tour")) return PartyPopper;
  if (type.startsWith("registration")) return ClipboardList;
  if (type.startsWith("project") || type.startsWith("policy")) return Building2;
  return Bell;
}

function relTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

// Whitelist internal routes we consider safe to navigate to from action_url.
function safeInternalHref(url: string | null): string | null {
  if (!url) return null;
  if (!url.startsWith("/")) return null;
  const allowed = ["/inventory", "/products/", "/projects", "/favorites", "/notifications"];
  if (allowed.some((p) => url === p || url.startsWith(p))) return url;
  return null;
}

export function NotificationItem({
  item,
  onClick,
}: {
  item: NotificationRow;
  onClick: () => void;
}) {
  const Icon = iconFor(item.notification_type);
  const unread = !item.read_at;
  const href = safeInternalHref(item.action_url);

  const body = (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-3 text-left transition-colors",
        unread
          ? "border-[color:var(--brand-navy)]/25 bg-[color:var(--brand-navy-soft)]"
          : "border-border bg-[color:var(--surface)]",
      )}
    >
      <span
        className={cn(
          "relative grid h-10 w-10 shrink-0 place-items-center rounded-xl",
          unread
            ? "bg-[color:var(--brand-navy)] text-[color:var(--primary-foreground)]"
            : "bg-muted text-[color:var(--text-secondary)]",
        )}
      >
        <Icon className="h-4 w-4" />
        {unread && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[color:var(--brand-gold)] ring-2 ring-[color:var(--surface)]" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "line-clamp-2 text-[13.5px] leading-snug",
            unread ? "font-semibold text-[color:var(--text-primary)]" : "text-[color:var(--text-primary)]",
          )}
        >
          {item.title}
        </p>
        {item.message && (
          <p className="mt-0.5 line-clamp-2 text-[12px] text-[color:var(--text-secondary)]">
            {item.message}
          </p>
        )}
        <p className="mt-1 text-[11px] text-[color:var(--text-tertiary)]">
          {relTime(item.created_at)}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link to={href} onClick={onClick} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-navy)] rounded-2xl">
        {body}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-navy)] rounded-2xl"
    >
      {body}
    </button>
  );
}