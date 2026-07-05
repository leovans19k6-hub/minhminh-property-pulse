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
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-full border-t border-border bg-[color:var(--surface)]/95 backdrop-blur sm:max-w-[640px] md:max-w-[720px]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Điều hướng chính"
    >
      <ul className="grid grid-cols-5 px-2 pt-1">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact }}
              className="group flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors data-[status=active]:text-[color:var(--brand-navy)]"
            >
              <span className="grid h-8 w-12 place-items-center rounded-full transition-colors group-data-[status=active]:bg-[color:var(--brand-navy-soft)]">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="truncate leading-none">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}