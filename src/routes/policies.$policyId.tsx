import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/mobile/PageHeader";
import { MobileQueryErrorState } from "@/components/mobile/MobileStates";
import { PolicyIdentityCard } from "@/components/mobile/policies/PolicyIdentityCard";
import { PolicyContentSections } from "@/components/mobile/policies/PolicyContentSections";
import { PolicyApplicabilityCard } from "@/components/mobile/policies/PolicyApplicabilityCard";
import { PolicyAttachmentsCard } from "@/components/mobile/policies/PolicyAttachmentsCard";
import { PrimaryContactCard } from "@/components/mobile/PrimaryContactCard";
import { SectionCard } from "@/components/mobile/SectionCard";
import { InfoRow } from "@/components/mobile/InfoRow";
import { useMobilePolicyDetail } from "@/features/policies/queries";
import { ServiceError } from "@/services/_helpers";
import { formatDate } from "@/utils/format";

const searchSchema = z.object({
  productId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/policies/$policyId")({
  validateSearch: searchSchema,
  component: PolicyDetailPage,
  notFoundComponent: () => (
    <MobileShell showHeader={false}>
      <PageHeader title="Chi tiết chính sách" />
      <MobileQueryErrorState message="Không tìm thấy chính sách." />
    </MobileShell>
  ),
  errorComponent: () => (
    <MobileShell showHeader={false}>
      <PageHeader title="Chi tiết chính sách" />
      <MobileQueryErrorState message="Có lỗi khi tải chính sách." />
    </MobileShell>
  ),
});

function PolicyDetailPage() {
  const { policyId } = Route.useParams();
  const { productId } = Route.useSearch();
  const { data, isLoading, isError, error, refetch } = useMobilePolicyDetail(
    policyId,
    productId ?? null,
  );

  if (isLoading) {
    return (
      <MobileShell showHeader={false}>
        <PageHeader title="Chi tiết chính sách" />
        <div className="space-y-3 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
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
    const msg =
      error instanceof ServiceError
        ? error.message
        : error instanceof Error
          ? error.message
          : undefined;
    return (
      <MobileShell showHeader={false}>
        <PageHeader title="Chi tiết chính sách" />
        <div className="space-y-3 p-4">
          <MobileQueryErrorState message={msg} onRetry={() => refetch()} />
          <div className="flex justify-center">
            <Link
              to="/policies"
              className="text-xs font-semibold text-[color:var(--brand-navy)]"
            >
              Về danh sách chính sách
            </Link>
          </div>
        </div>
      </MobileShell>
    );
  }

  const p = data.policy;
  const now = Date.now();
  const deadlinePassed =
    !!p.registration_deadline && new Date(p.registration_deadline).getTime() < now;

  return (
    <MobileShell showHeader={false}>
      <PageHeader title="Chi tiết chính sách" subtitle={data.project?.name ?? p.title} />

      <div className="space-y-4 p-4 pb-8">
        <PolicyIdentityCard detail={data} />

        {p.registration_deadline && (
          <SectionCard title="Đăng ký">
            <div className="divide-y divide-border">
              <InfoRow
                label="Hạn đăng ký"
                value={formatDate(p.registration_deadline)}
              />
              {deadlinePassed && (
                <p className="pt-2 text-[12.5px] font-semibold text-[color:var(--warning,#b45309)]">
                  Đã hết hạn đăng ký
                </p>
              )}
            </div>
          </SectionCard>
        )}

        <PolicyContentSections sections={data.content_sections} summary={p.summary} />

        <PolicyApplicabilityCard
          applicability={data.applicability_summary}
          hasProductContext={!!productId}
        />

        <PolicyAttachmentsCard attachments={data.attachments} />

        {data.primary_contact && (
          <PrimaryContactCard contact={data.primary_contact} />
        )}
      </div>
    </MobileShell>
  );
}