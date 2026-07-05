import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  searchMobileInventory,
  getMobileInventoryFilters,
  type MobileInventoryFilters,
  type MobileInventoryPage,
} from "@/services/mobile/inventory.service";
import { queryKeys } from "@/lib/queryKeys";

const PAGE_SIZE = 30;

export function useMobileInventory(filters: MobileInventoryFilters) {
  const normalized: Record<string, unknown> = {
    ...filters,
    limit: PAGE_SIZE,
  };
  delete normalized.offset;
  return useInfiniteQuery<MobileInventoryPage>({
    queryKey: queryKeys.mobileInventory(normalized),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      searchMobileInventory({ ...filters, limit: PAGE_SIZE, offset: pageParam as number }),
    getNextPageParam: (last) => (last.has_more ? last.offset + last.limit : undefined),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useMobileInventoryFilters(projectId?: string | null) {
  return useQuery({
    queryKey: queryKeys.mobileInventoryFilters(projectId ?? null),
    queryFn: () => getMobileInventoryFilters(projectId ?? null),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}