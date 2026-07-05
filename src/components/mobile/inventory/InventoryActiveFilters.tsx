import { FilterChip } from "@/components/mobile/FilterChip";
import type { MobileFilterOptions } from "@/services/mobile/inventory.service";
import { formatVND } from "@/utils/format";
import { categoryLabel, countAdvancedFilters, statusLabel, type InventorySearchState } from "./filterUtils";

interface Props {
  search: InventorySearchState;
  options: MobileFilterOptions | undefined;
  onRemove: (key: keyof InventorySearchState | "floor" | "area" | "price") => void;
  onClearAll: () => void;
}

function labelFrom<T extends { id: string; name: string }>(list: T[] | undefined, id?: string): string | null {
  if (!id) return null;
  return list?.find((x) => x.id === id)?.name ?? null;
}

export function InventoryActiveFilters({ search, options, onRemove, onClearAll }: Props) {
  const count = countAdvancedFilters(search);
  if (count === 0) return null;

  const chips: Array<{ key: Parameters<Props["onRemove"]>[0]; label: string }> = [];

  if (search.category)
    chips.push({ key: "category", label: `Loại: ${categoryLabel(search.category)}` });
  if (search.status)
    chips.push({ key: "status", label: `Trạng thái: ${statusLabel(search.status)}` });
  const zone = labelFrom(options?.zones, search.zoneId);
  if (search.zoneId) chips.push({ key: "zoneId", label: `Phân khu: ${zone ?? "—"}` });
  const building = labelFrom(options?.buildings, search.buildingId);
  if (search.buildingId) chips.push({ key: "buildingId", label: `Toà: ${building ?? "—"}` });
  const type = labelFrom(options?.product_types, search.productTypeId);
  if (search.productTypeId) chips.push({ key: "productTypeId", label: `Loại căn: ${type ?? "—"}` });
  if (search.direction) chips.push({ key: "direction", label: `Hướng: ${search.direction}` });

  if (search.floorMin != null || search.floorMax != null) {
    const from = search.floorMin ?? "•";
    const to = search.floorMax ?? "•";
    chips.push({ key: "floor", label: `Tầng: ${from} – ${to}` });
  }
  if (search.areaMin != null || search.areaMax != null) {
    const from = search.areaMin ?? "•";
    const to = search.areaMax ?? "•";
    chips.push({ key: "area", label: `DT: ${from} – ${to} m²` });
  }
  if (search.priceMin != null || search.priceMax != null) {
    const from = search.priceMin != null ? formatVND(search.priceMin) : "•";
    const to = search.priceMax != null ? formatVND(search.priceMax) : "•";
    chips.push({ key: "price", label: `Giá: ${from} – ${to}` });
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {chips.map((c) => (
        <FilterChip key={c.key} active onRemove={() => onRemove(c.key)}>
          {c.label}
        </FilterChip>
      ))}
      {chips.length >= 2 && (
        <button
          type="button"
          onClick={onClearAll}
          className="ml-1 h-8 shrink-0 rounded-full px-3 text-xs font-medium text-[color:var(--text-secondary)] underline-offset-2 hover:underline"
        >
          Xoá tất cả
        </button>
      )}
    </div>
  );
}