import { Link } from "@tanstack/react-router";
import { Calendar, ChevronRight, MapPin, Sparkles, Users, Video } from "lucide-react";
import type { MobileEventListItem } from "@/services/mobile/events.service";
import { formatDateTime } from "@/utils/format";

interface Props {
  item: MobileEventListItem;
  showProject?: boolean;
  productId?: string | null;
}

const STATE_LABEL: Record<string, string> = {
  upcoming_registration: "Sắp mở đăng ký",
  registration_open: "Đang mở đăng ký",
  upcoming: "Sắp diễn ra",
  ongoing: "Đang diễn ra",
  full: "Hết suất",
  registration_closed: "Đóng đăng ký",
  completed: "Đã kết thúc",
};

const TYPE_LABEL: Record<string, string> = {
  site_tour: "Site Tour",
  sales_event: "Sự kiện BH",
  training: "Đào tạo",
  opening: "Khai trương",
  customer_event: "Sự kiện KH",
  other: "Khác",
  event: "Sự kiện",
  launch: "Ra mắt",
};

function stateTone(state: string): string {
  if (state === "registration_open" || state === "ongoing")
    return "bg-[color:var(--success-soft,#dcfce7)] text-[color:var(--success,#166534)]";
  if (state.startsWith("upcoming"))
    return "bg-[color:var(--info-soft)] text-[color:var(--info)]";
  if (state === "full" || state === "registration_closed" || state === "completed")
    return "bg-[color:var(--danger-soft,#fee2e2)] text-[color:var(--danger,#991b1b)]";
  return "bg-muted text-[color:var(--text-secondary)]";
}

export function MobileEventCard({ item, showProject, productId }: Props) {
  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: item.id }}
      search={productId ? { productId } : undefined}
      className="group block rounded-2xl border border-border bg-[color:var(--surface)] p-3 shadow-[var(--shadow-xs)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-navy)]"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0 space-y-1">
          {showProject && item.project_name && (
            <p className="truncate text-[11px] font-medium uppercase tracking-wide text-[color:var(--text-tertiary)]">
              {item.project_name}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {item.is_featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-gold-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--brand-navy)]">
                <Sparkles className="h-3 w-3" />
                Nổi bật
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--info-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[color:var(--info)]">
              {TYPE_LABEL[item.event_type] ?? item.event_type}
            </span>
          </div>
          <p className="min-w-0 text-sm font-semibold leading-snug text-[color:var(--text-primary)]">
            {item.title}
          </p>
          {item.summary && (
            <p className="line-clamp-2 text-xs text-[color:var(--text-secondary)]">
              {item.summary}
            </p>
          )}
          <div className="space-y-0.5">
            {item.start_at && (
              <p className="flex items-center gap-1 text-[11px] text-[color:var(--text-secondary)]">
                <Calendar className="h-3 w-3" aria-hidden />
                {formatDateTime(item.start_at)}
              </p>
            )}
            {(item.location_name || item.location_type === "online") && (
              <p className="flex items-center gap-1 text-[11px] text-[color:var(--text-tertiary)]">
                {item.location_type === "online" ? (
                  <Video className="h-3 w-3" aria-hidden />
                ) : (
                  <MapPin className="h-3 w-3" aria-hidden />
                )}
                {item.location_name ?? "Trực tuyến"}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {STATE_LABEL[item.derived_state] && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${stateTone(item.derived_state)}`}
              >
                {STATE_LABEL[item.derived_state]}
              </span>
            )}
            {!item.is_unlimited && item.remaining != null && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[color:var(--text-tertiary)]">
                <Users className="h-3 w-3" aria-hidden />
                {item.remaining <= 0
                  ? "Hết suất"
                  : `Còn ${item.remaining}/${item.capacity} suất`}
              </span>
            )}
            {item.user_registration_count > 0 && (
              <span className="inline-flex items-center rounded-full bg-[color:var(--success-soft,#dcfce7)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--success,#166534)]">
                Đã đăng ký
              </span>
            )}
          </div>
        </div>
        <ChevronRight
          className="mt-1 h-4 w-4 shrink-0 text-[color:var(--text-tertiary)] transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
    </Link>
  );
}