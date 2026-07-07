import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/mobile/PageHeader";
import { StickyActionBar } from "@/components/mobile/StickyActionBar";
import { MobileQueryErrorState } from "@/components/mobile/MobileStates";
import { PrimaryContactCard } from "@/components/mobile/PrimaryContactCard";
import { EventIdentityCard } from "@/components/mobile/events/EventIdentityCard";
import { EventEligibilityCard } from "@/components/mobile/events/EventEligibilityCard";
import { EventLocationCard } from "@/components/mobile/events/EventLocationCard";
import { EventCapacityCard } from "@/components/mobile/events/EventCapacityCard";
import { EventSessionsCard } from "@/components/mobile/events/EventSessionsCard";
import { EventAgendaCard } from "@/components/mobile/events/EventAgendaCard";
import { EventSpeakersCard } from "@/components/mobile/events/EventSpeakersCard";
import { EventSiteTourCard } from "@/components/mobile/events/EventSiteTourCard";
import { EventApplicabilityCard } from "@/components/mobile/events/EventApplicabilityCard";
import { EventAttachmentsCard } from "@/components/mobile/events/EventAttachmentsCard";
import { EventMyRegistrationCard } from "@/components/mobile/events/EventMyRegistrationCard";
import { EventRegistrationDialog } from "@/components/mobile/events/EventRegistrationDialog";
import { EventCancelRegistrationDialog } from "@/components/mobile/events/EventCancelRegistrationDialog";
import {
  useCancelMyEventRegistration,
  useMobileEventDetail,
  useRegisterForEvent,
} from "@/features/events/queries";
import { ServiceError } from "@/services/_helpers";

const searchSchema = z.object({
  productId: z.string().uuid().optional(),
  productTypeId: z.string().uuid().optional(),
  policyId: z.string().uuid().optional(),
  voucherId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/events/$eventId")({
  validateSearch: searchSchema,
  component: EventDetailPage,
  notFoundComponent: () => (
    <MobileShell showHeader={false}>
      <PageHeader title="Chi tiết sự kiện" />
      <MobileQueryErrorState message="Không tìm thấy sự kiện." />
    </MobileShell>
  ),
  errorComponent: () => (
    <MobileShell showHeader={false}>
      <PageHeader title="Chi tiết sự kiện" />
      <MobileQueryErrorState message="Có lỗi khi tải sự kiện." />
    </MobileShell>
  ),
});

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const { productId, productTypeId, policyId, voucherId } = Route.useSearch();
  const ctx = {
    productId: productId ?? null,
    productTypeId: productTypeId ?? null,
    policyId: policyId ?? null,
    voucherId: voucherId ?? null,
  };
  const { data, isLoading, isError, error, refetch } = useMobileEventDetail(eventId, ctx);
  const [regOpen, setRegOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const register = useRegisterForEvent({
    eventId,
    projectId: data?.event.project_id ?? null,
    ...ctx,
  });
  const cancel = useCancelMyEventRegistration({
    eventId,
    projectId: data?.event.project_id ?? null,
    ...ctx,
  });

  if (isLoading) {
    return (
      <MobileShell showHeader={false} showBottomNav={false}>
        <PageHeader title="Chi tiết sự kiện" />
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-muted/40" />
          ))}
        </div>
      </MobileShell>
    );
  }

  if (isError || !data) {
    const msg = error instanceof ServiceError ? error.message : undefined;
    return (
      <MobileShell showHeader={false} showBottomNav={false}>
        <PageHeader title="Chi tiết sự kiện" />
        <div className="space-y-3 p-4">
          <MobileQueryErrorState message={msg} onRetry={() => refetch()} />
          <div className="flex justify-center">
            <Link to="/events" className="text-xs font-semibold text-[color:var(--brand-navy)]">
              Về danh sách sự kiện
            </Link>
          </div>
        </div>
      </MobileShell>
    );
  }

  const my = data.my_registration_state;
  const e = data.event;
  const isTour = e.event_type === "site_tour";

  const primaryCta = (() => {
    if (my.can_register) {
      return (
        <button
          type="button"
          onClick={() => setRegOpen(true)}
          className="grid h-11 flex-1 place-items-center rounded-xl bg-[color:var(--brand-navy)] text-sm font-semibold text-white"
        >
          {isTour ? "Đăng ký Site Tour" : "Đăng ký sự kiện"}
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
    const labels: Record<string, string> = {
      event_full: "Đã hết suất",
      event_registration_not_open: "Chưa mở đăng ký",
      event_registration_closed: "Đã đóng đăng ký",
      event_user_limit_reached: "Đã đăng ký",
      event_paused: "Sự kiện tạm dừng",
      event_completed: "Sự kiện đã kết thúc",
      event_expired: "Sự kiện đã kết thúc",
      event_cancelled: "Sự kiện đã huỷ",
      event_not_applicable: "Không đủ điều kiện",
      event_profile_incomplete: "Cần cập nhật hồ sơ",
      event_archived: "Sự kiện không khả dụng",
      event_not_active: "Sự kiện không khả dụng",
    };
    return (
      <div className="grid h-11 flex-1 place-items-center rounded-xl bg-[color:var(--surface-secondary)] text-xs font-semibold text-[color:var(--text-secondary)]">
        {labels[data.eligibility.code] ?? "Không khả dụng"}
      </div>
    );
  })();

  return (
    <MobileShell showHeader={false} showBottomNav={false} bottomPadding={72}>
      <PageHeader title="Chi tiết sự kiện" subtitle={data.project?.name ?? e.title} />
      <div className="space-y-4 p-4">
        <EventIdentityCard detail={data} />
        <EventEligibilityCard eligibility={data.eligibility} />
        <EventLocationCard detail={data} />
        <EventCapacityCard detail={data} />
        <EventSessionsCard sessions={data.sessions} />
        <EventAgendaCard items={data.event.agenda} />
        <EventSpeakersCard speakers={data.event.speakers} />
        {isTour && <EventSiteTourCard details={data.event.site_tour_details} />}
        <EventApplicabilityCard
          applicability={data.applicability_summary}
          hasProductContext={!!productId}
          hasPolicyContext={!!policyId}
        />
        <EventAttachmentsCard attachments={data.event.attachments} />
        <EventMyRegistrationCard detail={data} />
        {data.primary_contact && <PrimaryContactCard contact={data.primary_contact} />}
      </div>

      <StickyActionBar>{primaryCta}</StickyActionBar>

      <EventRegistrationDialog
        open={regOpen}
        onOpenChange={setRegOpen}
        detail={data}
        pending={register.isPending}
        onConfirm={(note) =>
          register.mutate(note, { onSuccess: () => setRegOpen(false) })
        }
      />
      <EventCancelRegistrationDialog
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