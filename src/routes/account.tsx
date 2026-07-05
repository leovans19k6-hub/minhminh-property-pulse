import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Heart,
  ClipboardList,
  Users,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/account")({
  component: AccountPage,
  head: () => ({
    meta: [
      { title: "Tài khoản — Minh Minh Sales Hub" },
      { name: "description", content: "Thông tin cá nhân, sản phẩm yêu thích và cài đặt." },
    ],
  }),
});

const items = [
  { to: "/favorites" as const, icon: Heart, label: "Sản phẩm yêu thích" },
  { to: "/account" as const, icon: ClipboardList, label: "Lịch sử đăng ký" },
  { to: "/account" as const, icon: Users, label: "Khách hàng của tôi" },
  { to: "/notifications" as const, icon: Bell, label: "Thông báo" },
  { to: "/account" as const, icon: Settings, label: "Cài đặt" },
];

function AccountPage() {
  return (
    <MobileShell title="Tài khoản">
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <Avatar className="h-14 w-14 border border-border">
            <AvatarFallback className="bg-[var(--brand-navy)] text-primary-foreground">
              MM
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Chuyên viên Kinh doanh</p>
            <p className="truncate text-xs text-muted-foreground">
              Minh Minh Group · Hải Phòng
            </p>
          </div>
          <span className="rounded-full bg-[var(--brand-gold)]/20 px-2 py-1 text-[10px] font-semibold text-[var(--brand-navy)]">
            Sale
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {items.map((it, i) => (
            <Link
              key={it.label}
              to={it.to}
              className={
                "flex h-14 items-center gap-3 px-4 " +
                (i > 0 ? "border-t border-border" : "")
              }
            >
              <it.icon className="h-4 w-4 text-[var(--brand-navy)]" />
              <span className="flex-1 text-sm">{it.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>

        <button
          type="button"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-semibold text-destructive"
        >
          <LogOut className="h-4 w-4" /> Đăng xuất
        </button>

        <p className="pt-2 text-center text-[11px] text-muted-foreground">
          Minh Minh Sales Hub v0.1 · Bản mobile
        </p>
      </div>
    </MobileShell>
  );
}