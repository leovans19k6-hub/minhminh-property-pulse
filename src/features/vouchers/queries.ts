import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  cancelMyMobileVoucherRegistration,
  getMobileVoucherDetail,
  registerForMobileVoucher,
  searchMobileVouchers,
  type MobileVoucherSearchArgs,
  type MobileVoucherListItem,
} from "@/services/mobile/vouchers.service";
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
    m.includes("hết hạn")
  );
}

export function useMobileVouchers(args: Omit<MobileVoucherSearchArgs, "limit" | "offset">) {
  return useInfiniteQuery({
    queryKey: queryKeys.mobileVouchers({
      projectId: args.projectId ?? null,
      query: (args.query ?? "").trim().toLowerCase() || null,
      featured: args.featured ?? null,
      registrationState: args.registrationState ?? null,
    }),
    queryFn: ({ pageParam = 0 }) =>
      searchMobileVouchers({ ...args, limit: PAGE_SIZE, offset: pageParam as number }),
    initialPageParam: 0,
    getNextPageParam: (last, all) =>
      (last?.length ?? 0) < PAGE_SIZE ? undefined : all.reduce((n, p) => n + p.length, 0),
    staleTime: 45_000,
    retry: (count, err) => (isTerminalError(err) ? false : count < 1),
  });
}

export function useMobileVoucherDetail(
  voucherId: string | undefined,
  ctx: { productId?: string | null; policyId?: string | null } = {},
) {
  return useQuery({
    queryKey: queryKeys.mobileVoucherDetail(
      voucherId ?? "",
      ctx.productId ?? null,
      ctx.policyId ?? null,
    ),
    queryFn: () => getMobileVoucherDetail(voucherId!, ctx),
    enabled: !!voucherId,
    staleTime: 15_000,
    retry: (count, err) => (isTerminalError(err) ? false : count < 1),
  });
}

function invalidateVoucherDomain(
  qc: ReturnType<typeof useQueryClient>,
  ctx: { voucherId: string; projectId?: string | null; productId?: string | null; policyId?: string | null },
) {
  qc.invalidateQueries({ queryKey: ["mobile", "vouchers"] });
  qc.invalidateQueries({
    queryKey: queryKeys.mobileVoucherDetail(
      ctx.voucherId,
      ctx.productId ?? null,
      ctx.policyId ?? null,
    ),
  });
  if (ctx.projectId) {
    qc.invalidateQueries({ queryKey: queryKeys.mobileProjectDetail(ctx.projectId) });
  }
  if (ctx.productId) {
    qc.invalidateQueries({ queryKey: queryKeys.mobileProductDetail(ctx.productId) });
  }
}

export function useRegisterForVoucher(ctx: {
  voucherId: string;
  projectId?: string | null;
  productId?: string | null;
  productTypeId?: string | null;
  policyId?: string | null;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note?: string | null) =>
      registerForMobileVoucher(ctx.voucherId, {
        productId: ctx.productId,
        productTypeId: ctx.productTypeId,
        policyId: ctx.policyId,
        note: note ?? null,
      }),
    onSuccess: () => {
      toast.success("Đăng ký voucher thành công.");
      invalidateVoucherDomain(qc, ctx);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Không thể đăng ký voucher.";
      toast.error(msg);
      invalidateVoucherDomain(qc, ctx);
    },
  });
}

export function useCancelMyVoucherRegistration(ctx: {
  voucherId: string;
  projectId?: string | null;
  productId?: string | null;
  policyId?: string | null;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (registrationId: string) => cancelMyMobileVoucherRegistration(registrationId),
    onSuccess: () => {
      toast.success("Đã huỷ đăng ký voucher.");
      invalidateVoucherDomain(qc, ctx);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Không thể huỷ đăng ký voucher.";
      toast.error(msg);
      invalidateVoucherDomain(qc, ctx);
    },
  });
}

export type { MobileVoucherListItem };