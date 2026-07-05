import { cn } from "@/lib/utils";

interface Props {
  value: number | string | null | undefined;
  label?: string;
  size?: "sm" | "md" | "lg";
  tone?: "default" | "muted";
  suffix?: string;
  className?: string;
}

function format(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Liên hệ";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat("vi-VN").format(n);
}

const sizeMap = {
  sm: "text-[15px] font-semibold",
  md: "text-[18px] font-bold",
  lg: "text-[22px] font-bold tracking-tight",
};

export function PriceDisplay({ value, label, size = "md", tone = "default", suffix = "₫", className }: Props) {
  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <p className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--text-tertiary)]">
          {label}
        </p>
      )}
      <p
        className={cn(
          sizeMap[size],
          tone === "default" ? "text-[color:var(--brand-navy)]" : "text-[color:var(--text-secondary)]",
          "truncate",
        )}
      >
        {format(value)}
        {value !== null && value !== undefined && value !== "" && (
          <span className="ml-1 text-[0.7em] font-medium text-[color:var(--text-tertiary)]">{suffix}</span>
        )}
      </p>
    </div>
  );
}