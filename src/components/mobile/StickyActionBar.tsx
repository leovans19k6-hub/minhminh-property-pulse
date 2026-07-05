import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  className?: string;
  /** offset above bottom nav in px */
  bottomOffset?: number;
}

export function StickyActionBar({ children, className, bottomOffset = 0 }: Props) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 z-30 mx-auto w-full max-w-full border-t border-border bg-[color:var(--surface)]/95 backdrop-blur sm:max-w-[640px] md:max-w-[720px]",
        className,
      )}
      style={{
        bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom))`,
      }}
    >
      <div className="flex items-center gap-2 px-4 py-3">{children}</div>
    </div>
  );
}