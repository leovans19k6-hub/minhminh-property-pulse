import { useQuery } from "@tanstack/react-query";
import { getMobileProjects, getMobileProjectDetail } from "@/services/mobile/projects.service";
import { queryKeys } from "@/lib/queryKeys";

export function useMobileProjects() {
  return useQuery({
    queryKey: queryKeys.mobileProjects(),
    queryFn: () => getMobileProjects(),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useMobileProjectDetail(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.mobileProjectDetail(projectId ?? ""),
    queryFn: () => getMobileProjectDetail(projectId!),
    enabled: !!projectId,
    staleTime: 60_000,
    retry: 1,
  });
}