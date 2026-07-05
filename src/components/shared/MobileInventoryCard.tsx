import { Building2 } from "lucide-react";
import type { MobileInventoryItem } from "@/services/mobile/inventory.service";
import { formatVND } from "@/utils/format";

function statusLabel(status: string | null): string {
  switch (status) {
    case "available":
      return "Còn hàng";
    case "holding":
      return "Đang giữ";
    case "booked":
      return "Đã đặt cọc";
    case "sold":
      return "Đã bán";
    case "locked":
      return "Khoá";
    case "unavailable":
      return "Không mở bán";
    default:
      return status ?? "—";
  }
}
function statusClass(status: string | null): string {
  switch (status) {
    case "available":
      return "bg-emerald-100 text-emerald-700";
    case "holding":
      return "bg-amber-100 text-amber-700";
    case "booked":
      return "bg-blue-100 text-blue-700";
    case "sold":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function MobileInventoryCard({ item }: { item: MobileInventoryItem }) {
  const isApartment = item.category === "apartment";
  const area = isApartment
    ? item.carpet_area ?? item.built_up_area
    : item.land_area ?? item.built_up_area;
  const areaLabel = isApartment ? "m² TT" : "m² đất";
  const direction = isApartment
    ? item.balcony_direction ?? item.direction
    : item.direction ?? item.balcony_direction;

  return (
    <div className="block overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="relative aspect-[4/3] bg-muted">
        {item.primary_image_url ? (
          <img
            src={item.primary_image_url}
            alt={item.product_code}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[var(--brand-navy)]/10">
            <Building2 className="h-8 w-8 text-[var(--brand-navy)]/40" />
          </div>
        )}
        <span
          className={
            "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold " +
            statusClass(item.status)
          }
        >
          {statusLabel(item.status)}
        </span>
      </div>
      <div className="space-y-1 p-3">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-bold tracking-tight text-[var(--brand-navy)]">
            {item.product_code}
          </p>
          <span className="text-xs text-muted-foreground">{item.product_type_name ?? "—"}</span>
        </div>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {item.project_name}
          {item.zone_name ? ` · ${item.zone_name}` : ""}
          {item.building_name ? ` · ${item.building_name}` : ""}
          {isApartment && item.floor_number != null ? ` · T${item.floor_number}` : ""}
        </p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            {area != null ? `${area} ${areaLabel}` : "—"} · {direction ?? "—"}
          </span>
          <span className="text-sm font-semibold text-[var(--brand-navy)]">
            {item.primary_price != null ? formatVND(item.primary_price) : "Liên hệ"}
          </span>
        </div>
      </div>
    </div>
  );
}