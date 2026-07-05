import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMobileFavorites,
  addMobileFavorite,
  removeMobileFavorite,
} from "@/services/mobile/favorites.service";
import { queryKeys } from "@/lib/queryKeys";

export function useMobileFavorites(limit = 30, offset = 0) {
  return useQuery({
    queryKey: queryKeys.mobileFavorites({ limit, offset }),
    queryFn: () => getMobileFavorites(limit, offset),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useAddMobileFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => addMobileFavorite(productId),
    onSuccess: (_v, productId) => {
      qc.invalidateQueries({ queryKey: queryKeys.mobileProductDetail(productId) });
      qc.invalidateQueries({ queryKey: ["mobile", "favorites"] });
    },
  });
}

export function useRemoveMobileFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => removeMobileFavorite(productId),
    onSuccess: (_v, productId) => {
      qc.invalidateQueries({ queryKey: queryKeys.mobileProductDetail(productId) });
      qc.invalidateQueries({ queryKey: ["mobile", "favorites"] });
    },
  });
}