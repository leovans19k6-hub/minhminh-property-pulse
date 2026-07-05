import { Link } from "@tanstack/react-router";
import { Home, Building2, LayoutGrid, ClipboardList, User } from "lucide-react";
import type { ComponentType } from "react";

interface Item {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
}

const items: Item[] = [
  { to: "/", label: "Trang chủ", icon: Home, exact: true },
  { to: "/projects", label: "Dự án", icon: Building2 },
  { to: "/inventory", label: "Bảng hàng", icon: LayoutGrid },
  { to: "/register", label: "Đăng ký", icon: ClipboardList },
  { to: "/account", label: "Tài khoản", icon: User },
];

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[520px] border-t border-border bg-background/95 backdrop-blur md:max-w-[640px]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Điều hướng chính"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact }}
              className="flex min-h-[64px] flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium text-muted-foreground data-[status=active]:text-[var(--brand-navy)]"
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}