import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";

interface MobileShellProps {
  children: ReactNode;
  title?: string;
  showHeader?: boolean;
  showBottomNav?: boolean;
  headerRight?: ReactNode;
  headerLeft?: ReactNode;
  /** Reserve space at bottom for a sticky action bar (in px). */
  bottomPadding?: number;
  greeting?: string;
}

export function MobileShell({
  children,
  title,
  showHeader = true,
  showBottomNav = true,
  headerRight,
  headerLeft,
  bottomPadding = 0,
  greeting,
}: MobileShellProps) {
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-full flex-col bg-background text-foreground sm:max-w-[640px] md:max-w-[720px]">
      {showHeader && (
        <MobileHeader
          title={title}
          greeting={greeting}
          right={headerRight}
          left={headerLeft}
        />
      )}
      <main
        className="flex-1"
        style={{
          paddingBottom: `calc(${showBottomNav ? 76 : 0}px + ${bottomPadding}px + env(safe-area-inset-bottom))`,
        }}
      >
        {children}
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
}