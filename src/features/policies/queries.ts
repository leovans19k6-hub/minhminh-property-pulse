import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  getMobilePolicyDetail,
  searchMobilePolicies,
  type MobilePolicyListItem,
  type MobilePolicySearchArgs,
} from "@/services/mobile/policies.service";
import { queryKeys } from "@/lib/queryKeys";
import { ServiceError } from "@/services/_helpers";

const PAGE_SIZE = 30;

export function useMobilePolicies(args: Omit<MobilePolicySearchArgs, "limit" | "offset">) {
  return useInfiniteQuery({
    queryKey: queryKeys.mobilePolicies({
      projectId: args.projectId ?? null,
      query: (args.query ?? "").trim().toLowerCase() || null,
      featured: args.featured ?? null,
    }),
    queryFn: ({ pageParam = 0 }) =>
      searchMobilePolicies({ ...args, limit: PAGE_SIZE, offset: pageParam as number }),
    initialPageParam: 0,
    getNextPageParam: (last, all) =>
      (last?.length ?? 0) < PAGE_SIZE ? undefined : all.reduce((n, p) => n + p.length, 0),
    staleTime: 45_000,
    retry: (count, err) => {
      if (err instanceof ServiceError && err.message.includes("quyền")) return false;
      return count < 1;
    },
  });
}

export function useMobilePolicyDetail(policyId: string | undefined, productId?: string | null) {
  return useQuery({
    queryKey: queryKeys.mobilePolicyDetail(policyId ?? "", productId ?? null),
    queryFn: () => getMobilePolicyDetail(policyId!, productId ?? null),
    enabled: !!policyId,
    staleTime: 45_000,
    retry: (count, err) => {
      if (err instanceof ServiceError) {
        const m = err.message;
        if (
          m.includes("quyền") ||
          m.includes("Không tìm thấy") ||
          m.includes("không còn") ||
          m.includes("không áp dụng") ||
          m.includes("chưa được công bố")
        )
          return false;
      }
      return count < 1;
    },
  });
}

export type { MobilePolicyListItem };