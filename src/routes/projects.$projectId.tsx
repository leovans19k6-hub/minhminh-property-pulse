import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, LayoutGrid, Building2 } from "lucide-react";
import { PageHeader } from "@/components/mobile/PageHeader";
import { MobileShell } from "@/components/mobile/MobileShell";
import { MobileInventoryCard } from "@/components/shared/MobileInventoryCard";
import { useMobileProjectDetail } from "@/features/projects/queries";
import {
  MobileListSkeleton,
  MobileQueryErrorState,
  MobileEmptyState,
} from "@/components/mobile/MobileStates";
import { ServiceError } from "@/services/_helpers";

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectDetailPage,
  notFoundComponent: () => (
    <MobileShell title="Dự án">
      <div className="p-6 text-sm text-muted-foreground">Không tìm thấy dự án.</div>
    </MobileShell>
  ),
  errorComponent: () => (
    <MobileShell title="Dự án">
      <div className="p-6 text-sm text-muted-foreground">Có lỗi khi tải dự án.</div>
    </MobileShell>
  ),
});

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const { data, isLoading, isError, error, refetch } = useMobileProjectDetail(projectId);

  if (isLoading) {
    return (
      <MobileShell title="Dự án">
        <MobileListSkeleton count={1} />
      </MobileShell>
    );
  }
  if (isError || !data) {
    const isPerm = error instanceof ServiceError && error.message.includes("quyền");
    return (
      <MobileShell title="Dự án">
        <MobileQueryErrorState
          message={isPerm ? "Bạn không có quyền xem dự án này." : error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      </MobileShell>
    );
  }

  const p = data.project;
  const stats = data.inventory_stats;
  const cover = p.cover_url ?? p.thumbnail_url;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[520px] bg-background pb-24 md:max-w-[640px]">
      <PageHeader title={p.name} subtitle={data.developer?.name ?? undefined} />

      <div className="relative aspect-[16/10] w-full bg-muted">
        {cover ? (
          <img src={cover as string} alt={p.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[var(--brand-navy)]/10">
            <Building2 className="h-10 w-10 text-[var(--brand-navy)]/40" />
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <h1 className="text-lg font-bold tracking-tight">{p.name}</h1>
        {p.location_text && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{p.location_text as string}</span>
          </div>
        )}
        {p.short_description && (
          <p className="text-sm text-foreground/80">{p.short_description as string}</p>
        )}

        {stats && (
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <StatBox label="Tổng SP" value={stats.total_products ?? 0} />
            <StatBox
              label="Còn hàng"
              value={stats.available_count ?? 0}
              accent="text-emerald-700"
            />
            <StatBox label="Phân khu" value={data.zones.length} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Link
            to="/inventory"
            search={{ projectId: p.id }}
            className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-center text-[12px] font-medium"
          >
            <LayoutGrid className="h-4 w-4 text-[var(--brand-navy)]" />
            Xem bảng hàng
          </Link>
          <Link
            to="/inventory"
            search={{ projectId: p.id, focus: "code" }}
            className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-center text-[12px] font-medium"
          >
            <Building2 className="h-4 w-4 text-[var(--brand-navy)]" />
            Tìm mã căn
          </Link>
        </div>

        {data.zones.length > 0 && (
          <section className="pt-3">
            <h3 className="mb-2 text-sm font-semibold">Phân khu / Toà</h3>
            <div className="flex flex-wrap gap-2">
              {data.zones.map((z) => (
                <span
                  key={z.id}
                  className="rounded-full border border-border bg-card px-3 py-1 text-xs"
                >
                  {z.name}
                </span>
              ))}
              {data.buildings.map((b) => (
                <span
                  key={b.id}
                  className="rounded-full border border-border bg-card px-3 py-1 text-xs"
                >
                  {b.name}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="pt-3">
          <h3 className="mb-2 text-sm font-semibold">Sản phẩm nổi bật</h3>
          {data.featured_products.length === 0 ? (
            <MobileEmptyState title="Chưa có sản phẩm nổi bật." />
          ) : (
            <div className="space-y-3">
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
          )}
        </section>
      </div>
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="rounded-xl border border-border p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={"text-sm font-semibold " + (accent ?? "")}>{value}</p>
    </div>
  );
}