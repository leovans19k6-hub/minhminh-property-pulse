import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MobileHeaderProps {
  title?: string;
  greeting?: string;
  left?: ReactNode;
  right?: ReactNode;
}

export function MobileHeader({ title, greeting, left, right }: MobileHeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2">
          {left ?? (
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--brand-navy)] text-[13px] font-bold text-primary-foreground">
                MM
              </div>
              <span className="truncate text-[15px] font-semibold tracking-tight">
                {title ?? "Minh Minh Portal"}
              </span>
            </Link>
          )}
        </div>
        <div className="min-w-0">
          {greeting && (
            <p className="truncate text-right text-xs text-muted-foreground">{greeting}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {right ?? (
            <>
              <Link
                to="/notifications"
                aria-label="Thông báo"
                className="relative grid h-10 w-10 place-items-center rounded-full text-foreground hover:bg-muted"
              >
                <Bell className="h-5 w-5" />
              </Link>
              <Link to="/account" aria-label="Tài khoản">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback className="bg-[var(--brand-navy)] text-primary-foreground">
                    MM
                  </AvatarFallback>
                </Avatar>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}