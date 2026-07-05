import { useQuery } from "@tanstack/react-query";
import { getMobileProductDetail } from "@/services/mobile/products.service";
import { queryKeys } from "@/lib/queryKeys";
import { ServiceError } from "@/services/_helpers";

export function useMobileProductDetail(productId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.mobileProductDetail(productId ?? ""),
    queryFn: () => getMobileProductDetail(productId!),
    enabled: !!productId,
    staleTime: 30_000,
    retry: (count, err) => {
      if (err instanceof ServiceError) {
        const msg = err.message;
        if (msg.includes("quyền") || msg.includes("Không tìm thấy")) return false;
      }
      return count < 1;
    },
  });
}