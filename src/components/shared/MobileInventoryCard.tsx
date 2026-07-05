import { Building2, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { MobileInventoryItem } from "@/services/mobile/inventory.service";
import { formatVND } from "@/utils/format";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "info" | "neutral" | "danger";

function statusMeta(status: string | null): { label: string; tone: Tone } {
  switch (status) {
    case "available":
      return { label: "Còn hàng", tone: "success" };
    case "holding":
      return { label: "Đang giữ", tone: "warning" };
    case "booked":
      return { label: "Đã đặt cọc", tone: "info" };
    case "sold":
      return { label: "Đã bán", tone: "neutral" };
    case "locked":
      return { label: "Khoá", tone: "danger" };
    case "unavailable":
      return { label: "Không mở bán", tone: "neutral" };
    default:
      return { label: status ?? "—", tone: "neutral" };
  }
}

const toneClass: Record<Tone, string> = {
  success:
    "bg-[color:var(--success-soft)] text-[color:var(--success)] ring-1 ring-inset ring-[color:var(--success)]/20",
  warning:
    "bg-[color:var(--warning-soft)] text-[color:oklch(0.45_0.13_75)] ring-1 ring-inset ring-[color:var(--warning)]/25",
  info:
    "bg-[color:var(--info-soft)] text-[color:var(--info)] ring-1 ring-inset ring-[color:var(--info)]/20",
  danger:
    "bg-[color:var(--danger-soft)] text-[color:var(--danger)] ring-1 ring-inset ring-[color:var(--danger)]/20",
  neutral:
    "bg-[color:var(--brand-navy-soft)] text-[color:var(--text-secondary)] ring-1 ring-inset ring-[color:var(--border)]",
};

function fmtNum(n: number | null | undefined): string | null {
  if (n == null) return null;
  const s = Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
  return s;
}

interface Spec {
  label: string;
  value: string;
}

function buildSpecs(item: MobileInventoryItem): Spec[] {
  const isApartment = item.category === "apartment";
  const specs: Spec[] = [];

  if (isApartment) {
    if (item.floor_number != null) specs.push({ label: "Tầng", value: `T${item.floor_number}` });
    const area = item.carpet_area ?? item.built_up_area;
    const a = fmtNum(area);
    if (a) specs.push({ label: "DT", value: `${a} m²` });
    if (item.bedrooms != null) specs.push({ label: "PN", value: String(item.bedrooms) });
    const dir = item.balcony_direction ?? item.direction;
    if (dir) specs.push({ label: "Hướng", value: dir });
  } else {
    if (item.product_type_name) specs.push({ label: "Loại", value: item.product_type_name });
    const area = item.land_area ?? item.built_up_area ?? item.construction_area;
    const a = fmtNum(area);
    if (a) specs.push({ label: item.land_area != null ? "Đất" : "DT", value: `${a} m²` });
    const dir = item.direction ?? item.balcony_direction;
    if (dir) specs.push({ label: "Hướng", value: dir });
  }

  return specs.slice(0, 4);
}

export function MobileInventoryCard({ item }: { item: MobileInventoryItem }) {
  const status = statusMeta(item.status);
  const specs = buildSpecs(item);
  const subtitle = [item.zone_name, item.building_name].filter(Boolean).join(" · ");

  return (
    <Link
      to="/products/$productId"
      params={{ productId: item.product_id }}
      className="group relative flex items-stretch gap-3 rounded-2xl border border-border bg-[color:var(--surface)] p-2.5 shadow-[var(--shadow-xs)] transition-shadow hover:shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-navy)]"
    >
      <div className="relative h-[104px] w-[104px] shrink-0 overflow-hidden rounded-xl bg-[color:var(--brand-navy-soft)] sm:h-[120px] sm:w-[120px]">
        {item.primary_image_url ? (
          <img
            src={item.primary_image_url}
            alt={item.product_code}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
            }}
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <Building2 className="h-7 w-7 text-[color:var(--brand-navy)]/30" />
          </div>
        )}
        {item.featured && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-[color:var(--brand-gold)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[color:var(--brand-navy)]">
            Nổi bật
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div className="min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 truncate text-[15px] font-bold leading-tight tracking-tight text-[color:var(--brand-navy)]">
              {item.product_code}
            </p>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                toneClass[status.tone],
              )}
            >
              {status.label}
            </span>
          </div>
          {subtitle && (
            <p className="truncate text-[11.5px] text-[color:var(--text-tertiary)]">{subtitle}</p>
          )}
          {specs.length > 0 && (
            <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 pt-0.5">
              {specs.map((s, i) => (
                <span key={i} className="text-[11.5px] text-[color:var(--text-secondary)]">
                  <span className="text-[color:var(--text-tertiary)]">{s.label}</span>{" "}
                  <span className="font-medium text-[color:var(--text-primary)]">{s.value}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-end justify-between gap-2 pt-1.5">
          <p className="min-w-0 truncate text-[16px] font-bold leading-none tracking-tight text-[color:var(--brand-navy)]">
            {item.primary_price != null ? (
              <>
                {formatVND(item.primary_price)}
                <span className="ml-1 text-[11px] font-medium text-[color:var(--text-tertiary)]">
                  {item.currency ?? "₫"}
                </span>
              </>
            ) : (
              <span className="text-[13px] font-semibold text-[color:var(--text-secondary)]">
                Liên hệ
              </span>
            )}
          </p>
          <ChevronRight
            className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)] transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </div>
      </div>
    </Link>
  );
}