import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  cancelMyMobileEventRegistration,
  getMobileEventDetail,
  registerForMobileEvent,
  searchMobileEvents,
  type MobileEventListItem,
  type MobileEventSearchArgs,
} from "@/services/mobile/events.service";
import { queryKeys } from "@/lib/queryKeys";
import { ServiceError } from "@/services/_helpers";

const PAGE_SIZE = 30;

function isTerminalError(err: unknown): boolean {
  if (!(err instanceof ServiceError)) return false;
  const m = err.message;
  return (
    m.includes("quyền") ||
    m.includes("Không tìm thấy") ||
    m.includes("chưa được công bố") ||
    m.includes("lưu trữ") ||
    m.includes("đã kết thúc")
  );
}

export function useMobileEvents(args: Omit<MobileEventSearchArgs, "limit" | "offset">) {
  return useInfiniteQuery({
    queryKey: queryKeys.mobileEvents({
      projectId: args.projectId ?? null,
      query: (args.query ?? "").trim().toLowerCase() || null,
      eventType: args.eventType ?? null,
      featured: args.featured ?? null,
      derivedState: args.derivedState ?? null,
      startsFrom: args.startsFrom ?? null,
      startsTo: args.startsTo ?? null,
      productId: args.productId ?? null,
    }),
    queryFn: ({ pageParam = 0 }) =>
      searchMobileEvents({ ...args, limit: PAGE_SIZE, offset: pageParam as number }),
    initialPageParam: 0,
    getNextPageParam: (last, all) =>
      (last?.length ?? 0) < PAGE_SIZE ? undefined : all.reduce((n, p) => n + p.length, 0),
    staleTime: 45_000,
    retry: (count, err) => (isTerminalError(err) ? false : count < 1),
  });
}

export function useMobileEventDetail(
  eventId: string | undefined,
  ctx: {
    productId?: string | null;
    productTypeId?: string | null;
    policyId?: string | null;
    voucherId?: string | null;
  } = {},
) {
  return useQuery({
    queryKey: queryKeys.mobileEventDetail(
      eventId ?? "",
      ctx.productId ?? null,
      ctx.policyId ?? null,
      ctx.voucherId ?? null,
    ),
    queryFn: () => getMobileEventDetail(eventId!, ctx),
    enabled: !!eventId,
    staleTime: 15_000,
    retry: (count, err) => (isTerminalError(err) ? false : count < 1),
  });
}

function invalidateEventDomain(
  qc: ReturnType<typeof useQueryClient>,
  ctx: {
    eventId: string;
    projectId?: string | null;
    productId?: string | null;
    policyId?: string | null;
    voucherId?: string | null;
  },
) {
  qc.invalidateQueries({ queryKey: ["mobile", "events"] });
  qc.invalidateQueries({
    queryKey: queryKeys.mobileEventDetail(
      ctx.eventId,
      ctx.productId ?? null,
      ctx.policyId ?? null,
      ctx.voucherId ?? null,
    ),
  });
  if (ctx.projectId) {
    qc.invalidateQueries({ queryKey: queryKeys.mobileProjectDetail(ctx.projectId) });
  }
  if (ctx.productId) {
    qc.invalidateQueries({ queryKey: queryKeys.mobileProductDetail(ctx.productId) });
  }
}

export function useRegisterForEvent(ctx: {
  eventId: string;
  projectId?: string | null;
  productId?: string | null;
  productTypeId?: string | null;
  policyId?: string | null;
  voucherId?: string | null;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note?: string | null) =>
      registerForMobileEvent(ctx.eventId, {
        productId: ctx.productId,
        productTypeId: ctx.productTypeId,
        policyId: ctx.policyId,
        voucherId: ctx.voucherId,
        note: note ?? null,
      }),
    onSuccess: () => {
      toast.success("Đăng ký sự kiện thành công.");
      invalidateEventDomain(qc, ctx);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Không thể đăng ký sự kiện.";
      toast.error(msg);
      invalidateEventDomain(qc, ctx);
    },
  });
}

export function useCancelMyEventRegistration(ctx: {
  eventId: string;
  projectId?: string | null;
  productId?: string | null;
  policyId?: string | null;
  voucherId?: string | null;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (registrationId: string) => cancelMyMobileEventRegistration(registrationId),
    onSuccess: () => {
      toast.success("Đã huỷ đăng ký sự kiện.");
      invalidateEventDomain(qc, ctx);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Không thể huỷ đăng ký sự kiện.";
      toast.error(msg);
      invalidateEventDomain(qc, ctx);
    },
  });
}

export type { MobileEventListItem };