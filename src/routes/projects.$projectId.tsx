import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MapPin, Phone, MessageSquare, FileText, Ticket, MapPinned, LayoutGrid } from "lucide-react";
import { PageHeader } from "@/components/mobile/PageHeader";
import { MobileShell } from "@/components/mobile/MobileShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ProductCard } from "@/components/shared/ProductCard";
import {
  getProject,
  productsByProject,
  policiesByProject,
  vouchersByProject,
  eventsByProject,
} from "@/features/mock/data";
import { formatDate, formatDateTime } from "@/utils/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/projects/$projectId")({
  loader: ({ params }) => {
    const project = getProject(params.projectId);
    if (!project) throw notFound();
    return { project };
  },
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
  const { project } = Route.useLoaderData();
  const items = productsByProject(project.id);
  const pol = policiesByProject(project.id);
  const vs = vouchersByProject(project.id);
  const evs = eventsByProject(project.id);

  return (
    <div className="mx-auto min-h-screen w-full max-w-[520px] bg-background pb-24 md:max-w-[640px]">
      <PageHeader title={project.name} subtitle={project.developer} />

      <div className="relative aspect-[16/10] w-full bg-muted">
        <img src={project.cover} alt={project.name} className="h-full w-full object-cover" />
        <div className="absolute left-3 top-3">
          <StatusBadge status={project.status} />
        </div>
      </div>

      <div className="space-y-3 p-4">
        <h1 className="text-lg font-bold tracking-tight">{project.name}</h1>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate">{project.location}</span>
        </div>
        <p className="text-sm text-foreground/80">{project.shortDescription}</p>

        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
          <div className="rounded-xl border border-border p-2">
            <p className="text-[10px] uppercase text-muted-foreground">Tổng SP</p>
            <p className="text-sm font-semibold">{project.totalUnits}</p>
          </div>
          <div className="rounded-xl border border-border p-2">
            <p className="text-[10px] uppercase text-muted-foreground">Còn hàng</p>
            <p className="text-sm font-semibold text-emerald-700">{project.availableUnits}</p>
          </div>
          <div className="rounded-xl border border-border p-2">
            <p className="text-[10px] uppercase text-muted-foreground">Phân khu</p>
            <p className="text-sm font-semibold">{project.subzones.length}</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          {[
            { to: "/inventory", icon: LayoutGrid, label: "Bảng hàng", search: { projectId: project.id } },
            { to: "/policies", icon: FileText, label: "Chính sách" },
            { to: "/register", icon: Ticket, label: "Voucher", search: { type: "voucher" as const, projectId: project.id } },
            { to: "/register", icon: MapPinned, label: "Site Tour", search: { type: "sitetour" as const, projectId: project.id } },
          ].map((a) => (
            <Link
              key={a.label}
              to={a.to}
              {...(a.search ? { search: a.search as never } : {})}
              className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-2 text-center text-[11px] font-medium"
            >
              <a.icon className="h-4 w-4 text-[var(--brand-navy)]" />
              {a.label}
            </Link>
          ))}
        </div>

        {/* Manager */}
        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--brand-navy)] text-sm font-bold text-primary-foreground">
            {project.saleManager.name.split(" ").pop()?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground">Phụ trách dự án</p>
            <p className="truncate text-sm font-semibold">{project.saleManager.name}</p>
            <p className="truncate text-xs text-muted-foreground">{project.saleManager.phone}</p>
          </div>
          <a
            href={`tel:${project.saleManager.phone.replace(/\s/g, "")}`}
            className="grid h-10 w-10 place-items-center rounded-full bg-emerald-600 text-white"
            aria-label="Gọi phụ trách"
          >
            <Phone className="h-4 w-4" />
          </a>
          <a
            href={`sms:${project.saleManager.phone.replace(/\s/g, "")}`}
            className="grid h-10 w-10 place-items-center rounded-full bg-[var(--brand-navy)] text-white"
            aria-label="Nhắn tin"
          >
            <MessageSquare className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="px-4">
        <TabsList className="sticky top-14 z-30 grid w-full grid-cols-4">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="units">Bảng hàng</TabsTrigger>
          <TabsTrigger value="policies">Chính sách</TabsTrigger>
          <TabsTrigger value="events">Sự kiện</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-3 pt-3">
          <h3 className="text-sm font-semibold">Phân khu / Toà</h3>
          <div className="flex flex-wrap gap-2">
            {project.subzones.map((s) => (
              <span
                key={s}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs"
              >
                {s}
              </span>
            ))}
            {project.towers?.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs"
              >
                Toà {t}
              </span>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="units" className="space-y-3 pt-3">
          {items.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Chưa có sản phẩm cập nhật.
            </p>
          )}
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </TabsContent>
        <TabsContent value="policies" className="space-y-2 pt-3">
          {pol.map((x) => (
            <div key={x.id} className="rounded-2xl border border-border bg-card p-3">
              <p className="text-[11px] text-muted-foreground">{formatDate(x.publishedAt)}</p>
              <p className="text-sm font-semibold">{x.title}</p>
              <p className="text-xs text-muted-foreground">{x.summary}</p>
            </div>
          ))}
          <h3 className="pt-4 text-sm font-semibold">Voucher đang mở</h3>
          {vs.map((v) => (
            <div
              key={v.id}
              className="rounded-2xl border border-dashed border-[var(--brand-gold)] bg-[var(--brand-gold)]/10 p-3"
            >
              <p className="text-sm font-semibold">{v.title}</p>
              <p className="text-lg font-bold text-[var(--brand-navy)]">{v.value}</p>
              <p className="text-[11px] text-muted-foreground">HSD {formatDate(v.expiresAt)}</p>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="events" className="space-y-2 pt-3">
          {evs.map((e) => (
            <div key={e.id} className="rounded-2xl border border-border bg-card p-3">
              <p className="text-[11px] uppercase text-muted-foreground">{e.type}</p>
              <p className="text-sm font-semibold">{e.title}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(e.startAt)} · {e.location}
              </p>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}