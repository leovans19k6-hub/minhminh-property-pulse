import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Heart,
  ClipboardList,
  Users,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/features/auth/AuthProvider";

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
  const navigate = useNavigate();
  const { currentUser, signOut } = useAuth();
  const profile = currentUser?.profile;
  const initials =
    (profile?.full_name ?? currentUser?.email ?? "MM")
      .split(" ")
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "MM";
  const primaryRole = currentUser?.systemRoles[0] ?? "Nhân viên";
  const canAccessAdmin = Boolean(
    currentUser?.isSuperAdmin || currentUser?.isAdmin || currentUser?.isDirector,
  );

  async function handleLogout() {
    await signOut();
    void navigate({ to: "/login", replace: true });
  }

  return (
    <MobileShell title="Tài khoản">
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <Avatar className="h-14 w-14 border border-border">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback className="bg-[var(--brand-navy)] text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {profile?.full_name ?? currentUser?.email ?? "Người dùng"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {currentUser?.email ?? "—"}
            </p>
          </div>
          <span className="rounded-full bg-[var(--brand-gold)]/20 px-2 py-1 text-[10px] font-semibold text-[var(--brand-navy)]">
            {primaryRole}
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 text-xs">
          <p className="mb-2 flex items-center gap-1.5 font-semibold text-[var(--brand-navy)]">
            <ShieldCheck className="h-3.5 w-3.5" /> Thông tin tài khoản
          </p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-muted-foreground">
            <dt>Số điện thoại</dt>
            <dd className="text-right text-foreground">{profile?.phone ?? "—"}</dd>
            <dt>Mã nhân viên</dt>
            <dd className="text-right text-foreground">{profile?.employee_code ?? "—"}</dd>
            <dt>Chi nhánh</dt>
            <dd className="text-right text-foreground">{profile?.branch ?? "—"}</dd>
            <dt>Phòng ban</dt>
            <dd className="text-right text-foreground">{profile?.department ?? "—"}</dd>
            <dt>Chức vụ</dt>
            <dd className="text-right text-foreground">{profile?.position ?? "—"}</dd>
            <dt>Trạng thái</dt>
            <dd className="text-right text-foreground">
              {currentUser?.isActive ? "Hoạt động" : "Ngưng hoạt động"}
            </dd>
            <dt>Vai trò hệ thống</dt>
            <dd className="text-right text-foreground">
              {currentUser?.systemRoles.length ? currentUser.systemRoles.join(", ") : "—"}
            </dd>
            <dt>Dự án tham gia</dt>
            <dd className="text-right text-foreground">
              {currentUser?.projectMemberships.length ?? 0}
            </dd>
          </dl>
        </div>

        {canAccessAdmin && (
          <Link
            to="/admin"
            className="flex h-14 items-center gap-3 rounded-2xl border border-[var(--brand-gold)]/40 bg-[var(--brand-navy)] px-4 text-primary-foreground shadow-sm"
          >
            <LayoutDashboard className="h-5 w-5 text-[var(--brand-gold)]" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Trang quản trị</p>
              <p className="text-[11px] opacity-80">Quản lý hệ thống & dữ liệu</p>
            </div>
            <ChevronRight className="h-4 w-4 opacity-80" />
          </Link>
        )}

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
          onClick={() => void handleLogout()}
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