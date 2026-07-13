import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { XCircle } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/mobile/PageHeader";
import { StickyActionBar } from "@/components/mobile/StickyActionBar";
import { MobileQueryErrorState } from "@/components/mobile/MobileStates";
import { PrimaryContactCard } from "@/components/mobile/PrimaryContactCard";
import { Button } from "@/components/ui/button";
import { RegistrationIdentityCard } from "@/components/mobile/registrations/RegistrationIdentityCard";
import { RegistrationEntityCard } from "@/components/mobile/registrations/RegistrationEntityCard";
import { RegistrationActivityCard } from "@/components/mobile/registrations/RegistrationActivityCard";
import { RegistrationCancelDialog } from "@/components/mobile/registrations/RegistrationCancelDialog";
import {
  useCancelMyRegistration,
  useMyMobileRegistrationDetail,
} from "@/features/registrations/queries";

export const Route = createFileRoute("/registrations/$registrationId")({
  component: RegistrationDetailPage,
  notFoundComponent: () => (
    <MobileShell showHeader={false}>
      <PageHeader title="Chi tiết đăng ký" />
      <MobileQueryErrorState message="Không tìm thấy đăng ký." />
    </MobileShell>
  ),
  errorComponent: () => (
    <MobileShell showHeader={false}>
      <PageHeader title="Chi tiết đăng ký" />
      <MobileQueryErrorState message="Có lỗi khi tải đăng ký." />
    </MobileShell>
  ),
});

function RegistrationDetailPage() {
  const { registrationId } = Route.useParams();
  const { data, isLoading, isError, error, refetch } =
    useMyMobileRegistrationDetail(registrationId);
  const [cancelOpen, setCancelOpen] = useState(false);

  const cancel = useCancelMyRegistration({
    registrationId,
    method: data?.capabilities.cancel_method ?? null,
    projectId: data?.project?.id ?? null,
    voucherId: data?.voucher?.id ?? null,
    eventId: data?.event?.id ?? null,
  });

  if (isLoading) {
    return (
      <MobileShell showHeader={false} showBottomNav={false}>
        <PageHeader title="Chi tiết đăng ký" />
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-border bg-[color:var(--surface)]"
            />
          ))}
        </div>
      </MobileShell>
    );
  }

  if (isError || !data) {
    return (
      <MobileShell showHeader={false} showBottomNav={false}>
        <PageHeader title="Chi tiết đăng ký" />
        <MobileQueryErrorState
          message={error instanceof Error ? error.message : "Không thể tải đăng ký."}
          onRetry={() => void refetch()}
        />
      </MobileShell>
    );
  }

  const canCancel = data.capabilities.can_cancel;

  return (
    <MobileShell showHeader={false} showBottomNav>
      <PageHeader title="Chi tiết đăng ký" subtitle={data.registration.registration_code} />
      <div className="space-y-3 p-4 pb-32">
        <RegistrationIdentityCard detail={data} />
        <RegistrationEntityCard detail={data} />
        <RegistrationActivityCard detail={data} />
        {data.primary_contact && (
          <PrimaryContactCard contact={data.primary_contact} title="Người phụ trách" />
        )}
        {data.project && (
          <div className="pt-1 text-center">
            <Link
              to="/projects/$projectId"
              params={{ projectId: data.project.id }}
              className="text-[12px] font-semibold text-[color:var(--brand-navy)]"
            >
              Xem dự án {data.project.name}
            </Link>
          </div>
        )}
      </div>

      {canCancel && (
        <StickyActionBar bottomOffset={0}>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => setCancelOpen(true)}
            disabled={cancel.isPending}
          >
            <XCircle className="mr-2 h-4 w-4" />
            {cancel.isPending ? "Đang huỷ…" : "Huỷ đăng ký"}
          </Button>
        </StickyActionBar>
      )}

      <RegistrationCancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        detail={data}
        pending={cancel.isPending}
        onConfirm={() => {
          cancel.mutate(undefined, {
            onSuccess: () => setCancelOpen(false),
          });
        }}
      />
    </MobileShell>
  );
}