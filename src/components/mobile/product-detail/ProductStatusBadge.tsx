import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "neutral" | "info";

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
};

const map: Record<string, { tone: Tone; label: string }> = {
  available: { tone: "success", label: "Còn hàng" },
  reserved: { tone: "warning", label: "Đang giữ" },
  booked: { tone: "info", label: "Đã cọc" },
  sold: { tone: "neutral", label: "Đã bán" },
  locked: { tone: "danger", label: "Khoá" },
  unavailable: { tone: "neutral", label: "Ngưng bán" },
};

export function ProductStatusBadge({ status, className }: { status: string; className?: string }) {
  const info = map[status] ?? { tone: "neutral" as Tone, label: status };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        toneClass[info.tone],
        className,
      )}
    >
      {info.label}
    </span>
  );
}