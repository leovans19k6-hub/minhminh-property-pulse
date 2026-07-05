import type { z } from "zod";

export interface InventorySearchState {
  projectId?: string;
  focus?: "code";
  q?: string;
  category?: string;
  zoneId?: string;
  buildingId?: string;
  productTypeId?: string;
  status?: string;
  direction?: string;
  floorMin?: number;
  floorMax?: number;
  areaMin?: number;
  areaMax?: number;
  priceMin?: number;
  priceMax?: number;
}

/** Dimensions that count as an "advanced filter" in the mobile toolbar/sheet. */
export function countAdvancedFilters(s: InventorySearchState): number {
  let n = 0;
  if (s.category) n++;
  if (s.zoneId) n++;
  if (s.buildingId) n++;
  if (s.productTypeId) n++;
  if (s.status) n++;
  if (s.direction) n++;
  if (s.floorMin != null || s.floorMax != null) n++;
  if (s.areaMin != null || s.areaMax != null) n++;
  if (s.priceMin != null || s.priceMax != null) n++;
  return n;
}

/** Returned drafts always exclude projectId/focus/q — those are preserved separately. */
export function emptyAdvancedDraft(): Partial<InventorySearchState> {
  return {
    category: undefined,
    zoneId: undefined,
    buildingId: undefined,
    productTypeId: undefined,
    status: undefined,
    direction: undefined,
    floorMin: undefined,
    floorMax: undefined,
    areaMin: undefined,
    areaMax: undefined,
    priceMin: undefined,
    priceMax: undefined,
  };
}

export function statusLabel(s: string): string {
  switch (s) {
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
      return s;
  }
}

export function categoryLabel(c: string): string {
  switch (c) {
    case "apartment":
      return "Căn hộ";
    case "low-rise":
      return "Thấp tầng";
    default:
      return c;
  }
}

// Zod-inferred shape sanity — kept as type helper for callers.
export type _EnsureZod<T extends InventorySearchState> = z.infer<z.ZodType<T>>;