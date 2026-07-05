import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

const items = [
  { id: "n1", title: "Chính sách mới cho Hoàng Huy New City", time: "5 phút trước" },
  { id: "n2", title: "Voucher 100tr Vinhomes Vũ Yên sắp hết hạn", time: "1 giờ trước" },
  { id: "n3", title: "Site Tour The Minato Residence cuối tuần", time: "Hôm qua" },
];

function NotificationsPage() {
  return (
    <MobileShell title="Thông báo">
      <div className="space-y-2 p-4">
        {items.map((n) => (
          <div key={n.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--brand-navy)]/8 text-[var(--brand-navy)]">
              <Bell className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{n.title}</p>
              <p className="text-[11px] text-muted-foreground">{n.time}</p>
            </div>
          </div>
        ))}
      </div>
    </MobileShell>
  );
}