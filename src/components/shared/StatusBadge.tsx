import type { ProductStatus, ProjectStatus } from "@/types/models";
import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  "Đang bán": "bg-emerald-100 text-emerald-800",
  "Sắp mở bán": "bg-amber-100 text-amber-800",
  "Đã bàn giao": "bg-slate-100 text-slate-700",
  "Còn hàng": "bg-emerald-100 text-emerald-800",
  "Đã đặt cọc": "bg-amber-100 text-amber-800",
  "Đã bán": "bg-slate-200 text-slate-700",
  Khoá: "bg-rose-100 text-rose-800",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ProductStatus | ProjectStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        map[status] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {status}
    </span>
  );
}