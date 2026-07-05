import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}

export function FilterChip({ children, active, onClick, onRemove, className }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
        active
          ? "border-[color:var(--brand-navy)] bg-[color:var(--brand-navy)] text-[color:var(--primary-foreground)]"
          : "border-border bg-[color:var(--surface)] text-[color:var(--text-primary)] hover:bg-[color:var(--brand-navy-soft)]",
        className,
      )}
    >
      {children}
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          aria-label="Xoá bộ lọc"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="grid h-4 w-4 place-items-center rounded-full hover:bg-black/10"
        >
          <X className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}