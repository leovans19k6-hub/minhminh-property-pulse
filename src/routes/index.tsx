import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Search,
  LayoutGrid,
  Hash,
  FileText,
  Ticket,
  MapPinned,
  UserPlus,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { SectionHeader } from "@/components/mobile/SectionHeader";
import { MobileProjectCard } from "@/components/shared/MobileProjectCard";
import { ProductCard } from "@/components/shared/ProductCard";
import { products, policies, vouchers, events } from "@/features/mock/data";
import { formatDate, formatDateTime } from "@/utils/format";
import { useMobileProjects } from "@/features/projects/queries";
import { MobileInlineLoader } from "@/components/mobile/MobileStates";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const quickActions = [
  { to: "/inventory", icon: LayoutGrid, label: "Tra bảng hàng" },
  { to: "/inventory", icon: Hash, label: "Tìm mã căn", search: { focus: "code" as const } },
  { to: "/policies", icon: FileText, label: "Chính sách mới" },
  { to: "/register", icon: Ticket, label: "Đăng ký Voucher", search: { type: "voucher" as const } },
  {
    to: "/register",
    icon: MapPinned,
    label: "Đăng ký Site Tour",
    search: { type: "sitetour" as const },
  },
  {
    to: "/register",
    icon: UserPlus,
    label: "KH cần tư vấn",
    search: { type: "consult" as const },
  },
];

function HomePage() {
  const featured = products.filter((p) => p.status === "Còn hàng").slice(0, 6);
  const { data: projects, isLoading: projectsLoading } = useMobileProjects();
  return (
    <MobileShell greeting="Xin chào, Sale MMG 👋">
      <div className="space-y-6 pt-3">
        {/* Search */}
        <div className="px-4">
          <Link
            to="/inventory"
            className="flex h-12 items-center gap-3 rounded-2xl border border-border bg-card px-4 shadow-sm"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="truncate text-sm text-muted-foreground">
              Tìm dự án, mã căn, chính sách...
            </span>
          </Link>
        </div>

        {/* Quick actions */}
        <div className="px-4">
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((a) => (
              <Link
                key={a.label}
                to={a.to}
                {...(a.search ? { search: a.search } : {})}
                className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-2 text-center shadow-sm"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand-navy)]/8 text-[var(--brand-navy)]">
                  <a.icon className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-medium leading-tight">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Projects horizontal */}
        <section>
          <SectionHeader
            title="Dự án đang bán"
            action={
              <Link
                to="/projects"
                className="flex items-center gap-1 text-xs font-medium text-[var(--brand-navy)]"
              >
                Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
            {projectsLoading && <MobileInlineLoader />}
            {(projects ?? []).map((p) => (
              <div key={p.id} className="snap-start">
                <MobileProjectCard project={p} compact />
              </div>
            ))}
          </div>
        </section>

        {/* Featured products */}
        <section>
          <SectionHeader
            title="Sản phẩm nổi bật"
            action={
              <Link
                to="/inventory"
                className="flex items-center gap-1 text-xs font-medium text-[var(--brand-navy)]"
              >
                Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
            {featured.map((p) => (
              <div key={p.id} className="snap-start">
                <ProductCard product={p} compact />
              </div>
            ))}
          </div>
        </section>

        {/* Policies */}
        <section>
          <SectionHeader title="Chính sách mới nhất" />
          <div className="space-y-2 px-4">
            {policies.slice(0, 3).map((pol) => (
              <div
                key={pol.id}
                className="rounded-2xl border border-border bg-card p-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {formatDate(pol.publishedAt)}
                  </p>
                  {pol.tag && (
                    <span className="rounded-full bg-[var(--brand-gold)]/25 px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-navy)]">
                      {pol.tag}
                    </span>
                  )}
                </div>
                <h3 className="mt-1 text-sm font-semibold">{pol.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{pol.summary}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Vouchers */}
        <section>
          <SectionHeader title="Voucher đang mở đăng ký" />
          <div className="flex gap-3 overflow-x-auto px-4 pb-2">
            {vouchers.map((v) => (
              <div
                key={v.id}
                className="w-[240px] shrink-0 rounded-2xl border border-dashed border-[var(--brand-gold)] bg-[var(--brand-gold)]/10 p-3"
              >
                <Ticket className="h-5 w-5 text-[var(--brand-navy)]" />
                <h3 className="mt-2 text-sm font-semibold">{v.title}</h3>
                <p className="text-xl font-bold tracking-tight text-[var(--brand-navy)]">
                  {v.value}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  HSD {formatDate(v.expiresAt)} · Còn {v.quota} suất
                </p>
                <Link
                  to="/register"
                  search={{ type: "voucher", voucherId: v.id }}
                  className="mt-2 inline-flex text-xs font-semibold text-[var(--brand-navy)]"
                >
                  Đăng ký cho khách →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Events */}
        <section className="pb-4">
          <SectionHeader title="Site Tour & Sự kiện sắp tới" />
          <div className="space-y-2 px-4">
            {events.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--brand-navy)]/8 text-[var(--brand-navy)]">
                  <Calendar className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase text-muted-foreground">{e.type}</p>
                  <h3 className="truncate text-sm font-semibold">{e.title}</h3>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {formatDateTime(e.startAt)} · {e.location}
                  </p>
                </div>
                <Link
                  to="/register"
                  search={{ type: "sitetour", eventId: e.id }}
                  className="shrink-0 rounded-full bg-[var(--brand-navy)] px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
                >
                  Đăng ký
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>
    </MobileShell>
  );
}
