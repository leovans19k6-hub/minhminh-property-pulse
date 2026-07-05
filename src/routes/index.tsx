import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Heart, LayoutGrid, UserPlus } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { MobileProjectCard } from "@/components/shared/MobileProjectCard";
import { useMobileProjects } from "@/features/projects/queries";
import { useCurrentUser } from "@/features/auth/AuthProvider";
import { HomeQuickActions, type QuickActionItem } from "@/components/mobile/home/HomeQuickActions";
import { MobileQueryErrorState, MobileEmptyState } from "@/components/mobile/MobileStates";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trang chủ — Minh Minh Portal" },
      {
        name: "description",
        content: "Dashboard nội bộ dành cho nhân viên kinh doanh Minh Minh Group.",
      },
    ],
  }),
  component: HomePage,
});

const quickActions: QuickActionItem[] = [
  { to: "/inventory", icon: LayoutGrid, label: "Bảng hàng", subtitle: "Tra cứu sản phẩm" },
  { to: "/projects", icon: Building2, label: "Dự án", subtitle: "Danh sách đang bán" },
  { to: "/favorites", icon: Heart, label: "Yêu thích", subtitle: "Sản phẩm đã lưu" },
  { to: "/register", icon: UserPlus, label: "Đăng ký", subtitle: "Voucher · Site Tour" },
];

function firstName(fullName: string | null | undefined): string | null {
  if (!fullName) return null;
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? null;
}

function HomePage() {
  const currentUser = useCurrentUser();
  const name = firstName(currentUser?.profile?.full_name);
  const greeting = name ? `Xin chào, ${name}` : "Xin chào";

  const { data: projects, isLoading, isError, error, refetch } = useMobileProjects();
  const projectsPreview = (projects ?? []).slice(0, 5);

  return (
    <MobileShell greeting={greeting}>
      <div className="space-y-6 pt-4">
        {/* Greeting block */}
        <section className="px-4">
          <h1 className="text-[22px] font-bold tracking-tight text-[color:var(--text-primary)]">
            {greeting}
          </h1>
          <p className="mt-1 text-[13px] text-[color:var(--text-secondary)]">
            Hôm nay bạn muốn làm gì?
          </p>
        </section>

        {/* Quick Actions */}
        <section className="px-4">
          <HomeQuickActions items={quickActions} />
        </section>

        {/* Projects */}
        <section>
          <div className="mb-3 flex items-end justify-between px-4">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight text-[color:var(--text-primary)]">
                Dự án của bạn
              </h2>
              <p className="text-[11.5px] text-[color:var(--text-tertiary)]">
                Truy cập nhanh các dự án bạn có quyền
              </p>
            </div>
            <Link
              to="/projects"
              className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[color:var(--brand-navy)]"
            >
              Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex gap-3 overflow-x-auto px-4 pb-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[260px] shrink-0 animate-pulse overflow-hidden rounded-2xl border border-border bg-[color:var(--surface)]"
                >
                  <div className="aspect-[16/9] w-full bg-muted" />
                  <div className="space-y-2 p-3">
                    <div className="h-3 w-2/3 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <MobileQueryErrorState
              message={error instanceof Error ? error.message : "Không thể tải dự án."}
              onRetry={() => refetch()}
            />
          ) : projectsPreview.length === 0 ? (
            <MobileEmptyState
              title="Chưa có dự án nào"
              hint="Bạn có thể cần được cấp quyền tham gia dự án."
            />
          ) : (
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {projectsPreview.map((p) => (
                <div key={p.id} className="snap-start">
                  <MobileProjectCard project={p} variant="compact" />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </MobileShell>
  );
}