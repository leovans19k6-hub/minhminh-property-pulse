import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { LayoutGrid, Phone } from "lucide-react";
import { PageHeader } from "@/components/mobile/PageHeader";
import { MobileShell } from "@/components/mobile/MobileShell";
import { MobileInventoryCard } from "@/components/shared/MobileInventoryCard";
import { SectionCard } from "@/components/mobile/SectionCard";
import { InfoRow } from "@/components/mobile/InfoRow";
import { PrimaryContactCard } from "@/components/mobile/PrimaryContactCard";
import { useMobileProjectDetail } from "@/features/projects/queries";
import { MobileQueryErrorState } from "@/components/mobile/MobileStates";
import { ServiceError } from "@/services/_helpers";
import { ProjectIdentityCard } from "@/components/mobile/project-detail/ProjectIdentityCard";
import { ProjectDetailSkeleton } from "@/components/mobile/project-detail/ProjectDetailSkeleton";

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectDetailPage,
  notFoundComponent: () => (
    <MobileShell title="Dự án">
      <NotFoundBlock />
    </MobileShell>
  ),
  errorComponent: () => (
    <MobileShell title="Dự án">
      <MobileQueryErrorState message="Có lỗi khi tải dự án." />
    </MobileShell>
  ),
});

function NotFoundBlock() {
  return (
    <div className="p-6 text-center">
      <p className="text-sm font-medium">Không tìm thấy dự án.</p>
      <Link
        to="/projects"
        className="mt-3 inline-flex rounded-full bg-[color:var(--brand-navy)] px-4 py-1.5 text-xs font-semibold text-primary-foreground"
      >
        Về danh sách dự án
      </Link>
    </div>
  );
}

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useMobileProjectDetail(projectId);

  if (isLoading) {
    return (
      <MobileShell showHeader={false}>
        <PageHeader title="Chi tiết dự án" />
        <ProjectDetailSkeleton />
      </MobileShell>
    );
  }

  if (isError || !data) {
    const isPerm =
      error instanceof ServiceError &&
      (error.message.includes("quyền") || error.message.includes("permission"));
    const isNotFound =
      error instanceof ServiceError && error.message.includes("Không tìm thấy");
    return (
      <MobileShell showHeader={false}>
        <PageHeader title="Chi tiết dự án" />
        <div className="space-y-3 p-4">
          <MobileQueryErrorState
            message={
              isPerm
                ? "Bạn không có quyền xem dự án này."
                : isNotFound
                  ? "Không tìm thấy dự án."
                  : error instanceof Error
                    ? error.message
                    : undefined
            }
            onRetry={() => refetch()}
          />
          <button
            type="button"
            onClick={() => router.navigate({ to: "/projects" })}
            className="mx-auto block text-xs font-semibold text-[color:var(--brand-navy)]"
          >
            Quay lại danh sách dự án
          </button>
        </div>
      </MobileShell>
    );
  }

  const p = data.project;
  const contact = data.primary_contact;
  const phoneDigits = contact?.phone?.replace(/\s/g, "") ?? "";
  const hasFeatured = data.featured_products.length > 0;
  const policies = data.policies_preview ?? [];

  return (
    <MobileShell showHeader={false}>
      <PageHeader title="Chi tiết dự án" subtitle={p.name} />

      <div className="space-y-4 p-4">
        {/* Identity + cover */}
        <ProjectIdentityCard project={p} developerName={data.developer?.name ?? null} />

        {/* Primary action */}
        <div className="grid grid-cols-1 gap-2">
          <Link
            to="/inventory"
            search={{ projectId: p.id }}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-navy)] text-sm font-semibold text-primary-foreground shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-navy)]"
          >
            <LayoutGrid className="h-4 w-4" />
            Xem bảng hàng
          </Link>
          {contact?.phone && (
            <a
              href={`tel:${phoneDigits}`}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-[color:var(--surface)] text-sm font-semibold text-[color:var(--brand-navy)]"
            >
              <Phone className="h-4 w-4" />
              Liên hệ sale phụ trách
            </a>
          )}
        </div>

        {/* Overview */}
        {(data.developer?.name ||
          p.location_text ||
          p.project_category ||
          p.short_description) && (
          <SectionCard title="Tổng quan">
            <div className="divide-y divide-border">
              {data.developer?.name && (
                <InfoRow label="Chủ đầu tư" value={data.developer.name} />
              )}
              {p.location_text && (
                <InfoRow label="Vị trí" value={p.location_text as string} />
              )}
              {p.project_category && (
                <InfoRow label="Loại hình" value={p.project_category as string} />
              )}
              {p.code && <InfoRow label="Mã dự án" value={p.code as string} />}
            </div>
            {p.short_description && (
              <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-[color:var(--text-secondary)]">
                {p.short_description as string}
              </p>
            )}
          </SectionCard>
        )}

        {/* Featured products */}
        {hasFeatured && (
          <section>
            <div className="mb-2 flex items-end justify-between px-1">
              <h2 className="text-[14px] font-semibold tracking-tight text-[color:var(--text-primary)]">
                Sản phẩm nổi bật
              </h2>
              <Link
                to="/inventory"
                search={{ projectId: p.id }}
                className="text-[12px] font-semibold text-[color:var(--brand-navy)]"
              >
                Xem bảng hàng
              </Link>
            </div>
            <div className="space-y-2.5">
              {data.featured_products.map((f) => (
                <MobileInventoryCard
                  key={f.product_id}
                  item={{
                    product_id: f.product_id,
                    project_id: p.id,
                    project_name: p.name,
                    product_code: f.product_code,
                    product_name: f.product_name,
                    category: f.category,
                    status: f.status,
                    product_type_name: f.product_type_name,
                    zone_name: f.zone_name,
                    building_name: f.building_name,
                    floor_number: f.floor_number,
                    direction: f.direction,
                    door_direction: null,
                    balcony_direction: f.balcony_direction,
                    view_text: null,
                    land_area: f.land_area,
                    construction_area: null,
                    built_up_area: f.built_up_area,
                    carpet_area: null,
                    bedrooms: null,
                    bathrooms: null,
                    primary_price: f.primary_price,
                    primary_price_name: null,
                    currency: null,
                    primary_image_url: f.primary_image_url,
                    featured: null,
                    updated_at: "",
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Primary contact */}
        {contact && <PrimaryContactCard contact={contact} />}

        {/* Policies preview */}
        {policies.length > 0 && (
          <section>
            <div className="mb-2 flex items-end justify-between px-1">
              <h2 className="text-[14px] font-semibold tracking-tight text-[color:var(--text-primary)]">
                Chính sách đang áp dụng
              </h2>
              <Link
                to="/policies"
                search={{ projectId: p.id }}
                className="text-[12px] font-semibold text-[color:var(--brand-navy)]"
              >
                Xem tất cả
              </Link>
            </div>
            <ul className="space-y-2.5">
              {policies.map((pol) => (
                <li key={pol.id}>
                  <MobilePolicyCard
                    item={{
                      id: pol.id,
                      project_id: p.id,
                      project_name: p.name,
                      project_code: (p.code as string | null) ?? null,
                      title: pol.title,
                      slug: "",
                      summary: pol.summary,
                      is_featured: pol.is_featured,
                      priority: pol.priority,
                      effective_from: pol.effective_from,
                      effective_to: pol.effective_to,
                      registration_deadline: pol.registration_deadline,
                      published_at: null,
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </MobileShell>
  );
}