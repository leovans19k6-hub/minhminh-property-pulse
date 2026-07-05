import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { MobileProjectCard } from "@/components/shared/MobileProjectCard";
import { Input } from "@/components/ui/input";
import { useMobileProjects } from "@/features/projects/queries";
import {
  MobileListSkeleton,
  MobileQueryErrorState,
  MobileEmptyState,
} from "@/components/mobile/MobileStates";

export const Route = createFileRoute("/projects")({
  component: ProjectsPage,
  head: () => ({
    meta: [
      { title: "Dự án — Minh Minh Sales Hub" },
      {
        name: "description",
        content: "Danh sách dự án bất động sản đang phân phối bởi Minh Minh Group.",
      },
    ],
  }),
});

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function ProjectsPage() {
  const [q, setQ] = useState("");
  const { data, isLoading, isError, error, refetch } = useMobileProjects();

  const filtered = useMemo(() => {
    const t = normalize(q.trim());
    if (!t) return data ?? [];
    return (data ?? []).filter((p) => {
      const hay = normalize(
        [p.name, p.code ?? "", p.developer_name ?? "", p.location_text ?? ""].join(" "),
      );
      return hay.includes(t);
    });
  }, [data, q]);

  const total = data?.length ?? 0;
  const hasQuery = q.trim().length > 0;

  return (
    <MobileShell title="Dự án">
      <div className="space-y-4 p-4">
        {/* Header block */}
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-[color:var(--text-primary)]">
            Dự án
          </h1>
          <p className="mt-0.5 text-[12.5px] text-[color:var(--text-secondary)]">
            {isLoading
              ? "Đang tải danh sách..."
              : isError
                ? "Không thể tải danh sách dự án."
                : `Đã tải ${total} dự án bạn có quyền truy cập`}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm tên dự án, mã dự án..."
            aria-label="Tìm dự án"
            className="h-11 rounded-xl border-border bg-[color:var(--surface)] pl-9 pr-10 text-[13.5px]"
          />
          {hasQuery && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Xóa tìm kiếm"
              className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-[color:var(--text-tertiary)] hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {isLoading && <MobileListSkeleton count={4} />}
        {isError && (
          <MobileQueryErrorState
            message={error instanceof Error ? error.message : undefined}
            onRetry={() => refetch()}
          />
        )}
        {!isLoading && !isError && (
          <>
            {filtered.length === 0 ? (
              hasQuery ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                  <p className="text-sm font-medium">Không tìm thấy dự án phù hợp</p>
                  <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
                    Thử từ khóa khác hoặc xoá bộ lọc.
                  </p>
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="mt-3 rounded-full bg-[color:var(--brand-navy)] px-4 py-1.5 text-xs font-semibold text-primary-foreground"
                  >
                    Xóa tìm kiếm
                  </button>
                </div>
              ) : (
                <MobileEmptyState
                  title="Bạn chưa có dự án được phân quyền"
                  hint="Liên hệ quản trị viên để được cấp quyền."
                />
              )
            ) : (
              <div className="space-y-3">
                {filtered.map((p) => (
                  <MobileProjectCard key={p.id} project={p} variant="default" />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </MobileShell>
  );
}