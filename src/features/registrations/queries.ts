import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  cancelMyMobileRegistration,
  getMyMobileRegistrationDetail,
  searchMyMobileRegistrations,
  type MobileCancelMethod,
  type MobileRegistrationListItem,
  type MobileRegistrationSearchArgs,
} from "@/services/mobile/registrations.service";
import { queryKeys } from "@/lib/queryKeys";
import { ServiceError } from "@/services/_helpers";

const PAGE_SIZE = 30;

function isTerminalError(err: unknown): boolean {
  if (!(err instanceof ServiceError)) return false;
  const m = err.message;
  return m.includes("quyền") || m.includes("Không tìm thấy");
}

export function useMyMobileRegistrations(
  args: Omit<MobileRegistrationSearchArgs, "limit" | "offset">,
) {
  return useInfiniteQuery({
    queryKey: queryKeys.mobileMyRegistrations({
      projectId: args.projectId ?? null,
      domain: args.domain ?? null,
      registrationType: args.registrationType ?? null,
      status: args.status ?? null,
      query: (args.query ?? "").trim().toLowerCase() || null,
    }),
    queryFn: ({ pageParam = 0 }) =>
      searchMyMobileRegistrations({ ...args, limit: PAGE_SIZE, offset: pageParam as number }),
    initialPageParam: 0,
    getNextPageParam: (last, all) =>
      (last?.length ?? 0) < PAGE_SIZE ? undefined : all.reduce((n, p) => n + p.length, 0),
    staleTime: 30_000,
    retry: (count, err) => (isTerminalError(err) ? false : count < 1),
  });
}

export function useMyMobileRegistrationDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.mobileMyRegistrationDetail(id ?? ""),
    queryFn: () => getMyMobileRegistrationDetail(id!),
    enabled: !!id,
    staleTime: 15_000,
    retry: (count, err) => (isTerminalError(err) ? false : count < 1),
  });
}

export function useCancelMyRegistration(ctx: {
  registrationId: string;
  method: MobileCancelMethod;
  projectId?: string | null;
  voucherId?: string | null;
  eventId?: string | null;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cancelMyMobileRegistration(ctx.registrationId, ctx.method),
    onSuccess: () => {
      toast.success("Đã huỷ đăng ký.");
      qc.invalidateQueries({ queryKey: ["mobile", "registrations"] });
      qc.invalidateQueries({
        queryKey: queryKeys.mobileMyRegistrationDetail(ctx.registrationId),
      });
      // Also invalidate the source domain caches so voucher/event UIs refresh.
      if (ctx.method === "voucher") {
        qc.invalidateQueries({ queryKey: ["mobile", "vouchers"] });
      } else if (ctx.method === "event") {
        qc.invalidateQueries({ queryKey: ["mobile", "events"] });
      }
      if (ctx.projectId) {
        qc.invalidateQueries({ queryKey: queryKeys.mobileProjectDetail(ctx.projectId) });
      }
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Không thể huỷ đăng ký.";
      toast.error(msg);
    },
  });
}

export type { MobileRegistrationListItem };