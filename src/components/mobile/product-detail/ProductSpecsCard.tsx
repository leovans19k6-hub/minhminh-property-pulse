import type { MobileProductDetail } from "@/services/mobile/products.service";
import { SectionCard } from "@/components/mobile/SectionCard";

interface Props {
  product: MobileProductDetail["product"];
  floor: MobileProductDetail["floor"];
  building: MobileProductDetail["building"];
  zone: MobileProductDetail["zone"];
}

type Item = { label: string; value: string };

function num(v: number | null | undefined, unit: string): string | null {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  return `${v.toLocaleString("vi-VN")} ${unit}`;
}

function str(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined || v === "") return null;
  return String(v);
}

export function ProductSpecsCard({ product: p, floor, building, zone }: Props) {
  const isApartment = p.category === "apartment" || p.category === "high_rise";

  const raw: (Item | null)[] = isApartment
    ? [
        building ? { label: "Toà", value: building.name } : null,
        floor?.floor_number != null
          ? { label: "Tầng", value: String(floor.floor_number) }
          : p.floor_number != null
            ? { label: "Tầng", value: String(p.floor_number) }
            : null,
        str(p.door_direction) && { label: "Hướng cửa", value: str(p.door_direction)! },
        str(p.balcony_direction) && {
          label: "Hướng ban công",
          value: str(p.balcony_direction)!,
        },
        num(p.carpet_area, "m²") && { label: "DT thông thuỷ", value: num(p.carpet_area, "m²")! },
        num(p.built_up_area, "m²") && { label: "DT tim tường", value: num(p.built_up_area, "m²")! },
        p.bedrooms != null && { label: "Phòng ngủ", value: String(p.bedrooms) },
        p.bathrooms != null && { label: "Phòng tắm", value: String(p.bathrooms) },
        str(p.view_text) && { label: "View", value: str(p.view_text)! },
      ].map((x) => (x ? (x as Item) : null))
    : [
        zone ? { label: "Phân khu", value: zone.name } : null,
        num(p.land_area, "m²") && { label: "DT đất", value: num(p.land_area, "m²")! },
        num(p.construction_area, "m²") && {
          label: "DT xây dựng",
          value: num(p.construction_area, "m²")!,
        },
        num(p.built_up_area, "m²") && {
          label: "DT sàn XD",
          value: num(p.built_up_area, "m²")!,
        },
        num(p.frontage, "m") && { label: "Mặt tiền", value: num(p.frontage, "m")! },
        p.number_of_floors != null && {
          label: "Số tầng",
          value: String(p.number_of_floors),
        },
        str(p.direction) && { label: "Hướng", value: str(p.direction)! },
        str(p.construction_status) && {
          label: "Tình trạng XD",
          value: str(p.construction_status)!,
        },
      ].map((x) => (x ? (x as Item) : null));

  const items = raw.filter((x): x is Item => !!x);
  if (items.length === 0) return null;

  return (
    <SectionCard title="Thông số chính" padded={false}>
      <dl
        className={
          items.length === 1
            ? "grid grid-cols-1 divide-y divide-border"
            : "grid grid-cols-2 divide-y divide-border sm:divide-y-0"
        }
      >
        {items.map((it, i) => (
          <div
            key={it.label}
            className={
              "flex flex-col gap-0.5 px-4 py-3 " +
              (items.length > 1 && i % 2 === 0 ? "border-r border-border" : "")
            }
          >
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--text-tertiary)]">
              {it.label}
            </dt>
            <dd className="text-sm font-semibold text-[color:var(--text-primary)]">{it.value}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}