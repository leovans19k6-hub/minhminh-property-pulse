import type { ProductStatus, ProjectStatus } from "@/types/models";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "neutral" | "info" | "premium";

const toneClass: Record<Tone, string> = {
  success:
    "bg-[color:var(--success-soft)] text-[color:var(--success)] ring-1 ring-inset ring-[color:var(--success)]/15",
  warning:
    "bg-[color:var(--warning-soft)] text-[color:oklch(0.45_0.13_75)] ring-1 ring-inset ring-[color:var(--warning)]/20",
  danger:
    "bg-[color:var(--danger-soft)] text-[color:var(--danger)] ring-1 ring-inset ring-[color:var(--danger)]/15",
  info:
    "bg-[color:var(--info-soft)] text-[color:var(--info)] ring-1 ring-inset ring-[color:var(--info)]/15",
  neutral:
    "bg-[color:var(--brand-navy-soft)] text-[color:var(--text-secondary)] ring-1 ring-inset ring-[color:var(--border)]",
  premium:
    "bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-navy)] ring-1 ring-inset ring-[color:var(--brand-gold)]/30",
};

const map: Record<string, Tone> = {
  "Đang bán": "success",
  "Sắp mở bán": "warning",
  "Đã bàn giao": "neutral",
  "Còn hàng": "success",
  "Đã đặt cọc": "warning",
  "Đã bán": "neutral",
  Khoá: "danger",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ProductStatus | ProjectStatus;
  className?: string;
}) {
  const tone = map[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        toneClass[tone],
        className,
      )}
    >
      {status}
    </span>
  );
}