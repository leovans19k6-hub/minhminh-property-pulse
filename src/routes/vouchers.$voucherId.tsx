import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/mobile/PageHeader";
import { StickyActionBar } from "@/components/mobile/StickyActionBar";
import { MobileQueryErrorState } from "@/components/mobile/MobileStates";
import { PrimaryContactCard } from "@/components/mobile/PrimaryContactCard";
import { VoucherIdentityCard } from "@/components/mobile/vouchers/VoucherIdentityCard";
import { VoucherEligibilityCard } from "@/components/mobile/vouchers/VoucherEligibilityCard";
import {
  VoucherBenefitsCard,
  VoucherPrimaryBenefitCard,
} from "@/components/mobile/vouchers/VoucherBenefitsCard";
import { VoucherConditionsCard } from "@/components/mobile/vouchers/VoucherConditionsCard";
import { VoucherCapacityCard } from "@/components/mobile/vouchers/VoucherCapacityCard";
import { VoucherApplicabilityCard } from "@/components/mobile/vouchers/VoucherApplicabilityCard";
import { VoucherAttachmentsCard } from "@/components/mobile/vouchers/VoucherAttachmentsCard";
import { VoucherMyRegistrationCard } from "@/components/mobile/vouchers/VoucherMyRegistrationCard";
import { VoucherRegistrationDialog } from "@/components/mobile/vouchers/VoucherRegistrationDialog";
import { VoucherCancelRegistrationDialog } from "@/components/mobile/vouchers/VoucherCancelRegistrationDialog";
import {
  useCancelMyVoucherRegistration,
  useMobileVoucherDetail,
  useRegisterForVoucher,
} from "@/features/vouchers/queries";
import { ServiceError } from "@/services/_helpers";

const searchSchema = z.object({
  productId: z.string().uuid().optional(),
  policyId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/vouchers/$voucherId")({
  validateSearch: searchSchema,
  component: VoucherDetailPage,
  notFoundComponent: () => (
    <MobileShell showHeader={false}>
      <PageHeader title="Chi tiết voucher" />
      <MobileQueryErrorState message="Không tìm thấy voucher." />
    </MobileShell>
  ),
  errorComponent: () => (
    <MobileShell showHeader={false}>
      <PageHeader title="Chi tiết voucher" />
      <MobileQueryErrorState message="Có lỗi khi tải voucher." />
    </MobileShell>
  ),
});

function VoucherDetailPage() {
  const { voucherId } = Route.useParams();
  const { productId, policyId } = Route.useSearch();
  const { data, isLoading, isError, error, refetch } = useMobileVoucherDetail(voucherId, {
    productId: productId ?? null,
    policyId: policyId ?? null,
  });

  const [regOpen, setRegOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const register = useRegisterForVoucher({
    voucherId,
    projectId: data?.voucher.project_id ?? null,
    productId: productId ?? null,
    policyId: policyId ?? null,
  });
  const cancel = useCancelMyVoucherRegistration({
    voucherId,
    projectId: data?.voucher.project_id ?? null,
    productId: productId ?? null,
    policyId: policyId ?? null,
  });

  if (isLoading) {
    return (
      <MobileShell showHeader={false} showBottomNav={false}>
        <PageHeader title="Chi tiết voucher" />
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-border bg-muted/40"
            />
          ))}
        </div>
      </MobileShell>
    );
  }

  if (isError || !data) {
    const msg = error instanceof ServiceError ? error.message : undefined;
    return (
      <MobileShell showHeader={false} showBottomNav={false}>
        <PageHeader title="Chi tiết voucher" />
        <div className="space-y-3 p-4">
          <MobileQueryErrorState message={msg} onRetry={() => refetch()} />
          <div className="flex justify-center">
            <Link to="/vouchers" className="text-xs font-semibold text-[color:var(--brand-navy)]">
              Về danh sách voucher
            </Link>
          </div>
        </div>
      </MobileShell>
    );
  }

  const my = data.my_registration_state;
  const v = data.voucher;

  const primaryCta = (() => {
    if (my.can_register) {
      return (
        <button
          type="button"
          onClick={() => setRegOpen(true)}
          className="grid h-11 flex-1 place-items-center rounded-xl bg-[color:var(--brand-navy)] text-sm font-semibold text-white"
        >
          Đăng ký voucher
        </button>
      );
    }
    if (my.can_cancel) {
      return (
        <button
          type="button"
          onClick={() => setCancelOpen(true)}
          className="grid h-11 flex-1 place-items-center rounded-xl border border-[color:var(--danger,#dc2626)] text-sm font-semibold text-[color:var(--danger,#991b1b)]"
        >
          Huỷ đăng ký
        </button>
      );
    }
    const codeLabels: Record<string, string> = {
      voucher_full: "Đã hết suất",
      voucher_registration_not_open: "Chưa mở đăng ký",
      voucher_registration_closed: "Đã hết hạn đăng ký",
      voucher_user_limit_reached: "Đã đăng ký",
      voucher_paused: "Voucher tạm dừng",
      voucher_expired: "Voucher đã hết hạn",
      voucher_not_applicable: "Không đủ điều kiện",
      voucher_profile_incomplete: "Cần cập nhật hồ sơ",
      voucher_archived: "Voucher không khả dụng",
      voucher_not_active: "Voucher không khả dụng",
    };
    const label = codeLabels[data.eligibility.code] ?? "Không khả dụng";
    return (
      <div className="grid h-11 flex-1 place-items-center rounded-xl bg-[color:var(--surface-secondary)] text-xs font-semibold text-[color:var(--text-secondary)]">
        {label}
      </div>
    );
  })();

  return (
    <MobileShell showHeader={false} showBottomNav={false} bottomPadding={72}>
      <PageHeader
        title="Chi tiết voucher"
        subtitle={v.code ?? data.project?.name ?? undefined}
      />
      <div className="space-y-4 p-4">
        <VoucherIdentityCard detail={data} />
        <VoucherEligibilityCard eligibility={data.eligibility} />
        <VoucherPrimaryBenefitCard
          benefits={data.benefits}
          fallback={
            v.value_amount != null
              ? `Giảm ${v.value_amount.toLocaleString("vi-VN")} đ`
              : v.value_percent != null
                ? `Giảm ${v.value_percent}%`
                : null
          }
        />
        <VoucherCapacityCard detail={data} />
        <VoucherBenefitsCard benefits={data.benefits} />
        <VoucherConditionsCard conditions={data.conditions} />
        <VoucherApplicabilityCard
          applicability={data.applicability_summary}
          hasProductContext={!!productId}
          hasPolicyContext={!!policyId}
        />
        <VoucherAttachmentsCard attachments={data.attachments} />
        <VoucherMyRegistrationCard detail={data} />
        {data.primary_contact && <PrimaryContactCard contact={data.primary_contact} />}
      </div>

      <StickyActionBar>{primaryCta}</StickyActionBar>

      <VoucherRegistrationDialog
        open={regOpen}
        onOpenChange={setRegOpen}
        detail={data}
        pending={register.isPending}
        onConfirm={() =>
          register.mutate(null, {
            onSuccess: () => setRegOpen(false),
          })
        }
      />
      <VoucherCancelRegistrationDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        detail={data}
        pending={cancel.isPending}
        onConfirm={() => {
          const id = my.cancellation_registration_id;
          if (!id) return;
          cancel.mutate(id, { onSuccess: () => setCancelOpen(false) });
        }}
      />
    </MobileShell>
  );
}