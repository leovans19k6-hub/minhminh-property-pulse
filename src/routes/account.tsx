import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  ChevronRight,
  Heart,
  LayoutDashboard,
  Loader2,
  LogOut,
  Building2,
  Star,
} from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { SectionCard } from "@/components/mobile/SectionCard";
import { InfoRow } from "@/components/mobile/InfoRow";
import { AccountIdentityCard } from "@/components/mobile/account/AccountIdentityCard";
import { AccountRolesCard } from "@/components/mobile/account/AccountRolesCard";
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

const shortcuts = [
  { to: "/favorites" as const, icon: Heart, label: "Sản phẩm yêu thích" },
  { to: "/notifications" as const, icon: Bell, label: "Thông báo" },
];

function AccountPage() {
  const navigate = useNavigate();
  const { currentUser, signOut, isInitializing, isLoadingUserContext } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (isInitializing || isLoadingUserContext) {
    return (
      <MobileShell title="Tài khoản">
        <div className="space-y-4 p-4">
          <div className="h-24 animate-pulse rounded-2xl border border-border bg-[color:var(--surface)]" />
          <div className="h-40 animate-pulse rounded-2xl border border-border bg-[color:var(--surface)]" />
          <div className="h-24 animate-pulse rounded-2xl border border-border bg-[color:var(--surface)]" />
        </div>
      </MobileShell>
    );
  }

  if (!currentUser) {
    return (
      <MobileShell title="Tài khoản">
        <div className="m-4 rounded-2xl border border-dashed border-border bg-[color:var(--surface)] p-8 text-center">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">
            Không có thông tin tài khoản
          </p>
          <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
            Vui lòng đăng nhập lại để tiếp tục.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[color:var(--brand-navy)] px-4 text-sm font-semibold text-[color:var(--primary-foreground)]"
          >
            Đăng nhập
          </Link>
        </div>
      </MobileShell>
    );
  }

  const profile = currentUser?.profile;
  const canAccessAdmin = Boolean(
    currentUser?.isSuperAdmin || currentUser?.isAdmin || currentUser?.isDirector,
  );
  const memberships = currentUser?.projectMemberships ?? [];
  const primaryMemberships = memberships.filter((m) => m.isPrimaryContact).length;
  const employmentRows = [
    profile?.employee_code && { label: "Mã nhân viên", value: profile.employee_code },
    profile?.position && { label: "Chức vụ", value: profile.position },
    profile?.branch && { label: "Chi nhánh", value: profile.branch },
    profile?.department && { label: "Phòng ban", value: profile.department },
    profile?.phone && { label: "Số điện thoại", value: profile.phone },
  ].filter(Boolean) as { label: string; value: string }[];

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      void navigate({ to: "/login", replace: true });
    } catch (err) {
      console.error("[Account] signOut failed", err);
      setSigningOut(false);
    }
  }

  return (
    <MobileShell title="Tài khoản">
      <div className="space-y-4 p-4">
        <AccountIdentityCard user={currentUser} />

        {canAccessAdmin && (
          <Link
            to="/admin"
            className="flex h-14 items-center gap-3 rounded-2xl border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-navy)] px-4 text-[color:var(--primary-foreground)] shadow-[var(--shadow-sm)]"
          >
            <LayoutDashboard className="h-5 w-5 text-[color:var(--brand-gold)]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Trang quản trị</p>
              <p className="truncate text-[11px] opacity-80">Quản lý hệ thống & dữ liệu</p>
            </div>
            <ChevronRight className="h-4 w-4 opacity-80" />
          </Link>
        )}

        {employmentRows.length > 0 && (
          <SectionCard title="Thông tin công việc" padded={false}>
            <div className="divide-y divide-border px-4">
              {employmentRows.map((r) => (
                <InfoRow key={r.label} label={r.label} value={r.value} />
              ))}
            </div>
          </SectionCard>
        )}

        <AccountRolesCard roles={currentUser.systemRoles} />

        <SectionCard title="Dự án tham gia">
          {memberships.length === 0 ? (
            <p className="text-[12.5px] text-[color:var(--text-tertiary)]">
              Bạn chưa được cấp quyền dự án nào.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-[12.5px] text-[color:var(--text-secondary)]">
                Tổng cộng{" "}
                <span className="font-semibold text-[color:var(--text-primary)]">
                  {memberships.length}
                </span>{" "}
                dự án
                {primaryMemberships > 0 && (
                  <>
                    {" "}·{" "}
                    <span className="font-semibold text-[color:var(--brand-navy)]">
                      {primaryMemberships}
                    </span>{" "}
                    phụ trách chính
                  </>
                )}
              </p>
              <ul className="divide-y divide-border rounded-xl border border-border bg-[color:var(--surface)]">
                {memberships.slice(0, 8).map((m) => (
                  <li
                    key={`${m.projectId}-${m.memberRole}`}
                    className="flex items-center gap-2 px-3 py-2.5 text-[12.5px]"
                  >
                    <Building2 className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]" />
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[color:var(--text-secondary)]">
                      {m.projectId.slice(0, 8)}
                    </span>
                    <span className="shrink-0 rounded-full bg-[color:var(--brand-navy-soft)] px-2 py-0.5 text-[10.5px] font-semibold text-[color:var(--brand-navy)]">
                      {m.memberRole}
                    </span>
                    {m.isPrimaryContact && (
                      <Star className="h-3.5 w-3.5 shrink-0 fill-[color:var(--brand-gold)] text-[color:var(--brand-gold)]" />
                    )}
                  </li>
                ))}
                {memberships.length > 8 && (
                  <li className="px-3 py-2 text-[11px] text-[color:var(--text-tertiary)]">
                    +{memberships.length - 8} dự án khác
                  </li>
                )}
              </ul>
              <p className="text-[10.5px] text-[color:var(--text-tertiary)]">
                Tên dự án đầy đủ khả dụng trong danh mục Dự án.
              </p>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Truy cập nhanh" padded={false}>
          <div className="divide-y divide-border">
            {shortcuts.map((it) => (
              <Link
                key={it.label}
                to={it.to}
                className="flex h-14 items-center gap-3 px-4 text-[color:var(--text-primary)]"
              >
                <it.icon className="h-4 w-4 text-[color:var(--brand-navy)]" />
                <span className="flex-1 truncate text-sm">{it.label}</span>
                <ChevronRight className="h-4 w-4 text-[color:var(--text-tertiary)]" />
              </Link>
            ))}
          </div>
        </SectionCard>

        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={signingOut}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-[color:var(--surface)] text-sm font-semibold text-[color:var(--danger)] shadow-[var(--shadow-xs)] disabled:opacity-70"
        >
          {signingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          {signingOut ? "Đang đăng xuất..." : "Đăng xuất"}
        </button>

        <p className="pt-2 text-center text-[11px] text-[color:var(--text-tertiary)]">
          Minh Minh Sales Hub · Bản mobile
        </p>
      </div>
    </MobileShell>
  );
}