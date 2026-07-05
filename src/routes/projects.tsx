import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
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

function ProjectsPage() {
  const [q, setQ] = useState("");
  const { data, isLoading, isError, error, refetch } = useMobileProjects();
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return data ?? [];
    return (data ?? []).filter(
      (p) =>
        p.name.toLowerCase().includes(t) ||
        (p.developer_name?.toLowerCase().includes(t) ?? false),
    );
  }, [data, q]);
  return (
    <MobileShell title="Dự án">
      <div className="space-y-4 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm dự án, chủ đầu tư..."
            className="h-11 pl-9"
          />
        </div>
        {isLoading && <MobileListSkeleton />}
        {isError && (
          <MobileQueryErrorState
            message={error instanceof Error ? error.message : undefined}
            onRetry={() => refetch()}
          />
        )}
        {!isLoading && !isError && (
          <>
            <p className="text-xs text-muted-foreground">
              {filtered.length} dự án đang phân phối
            </p>
            {filtered.length === 0 ? (
              <MobileEmptyState
                title="Chưa có dự án phù hợp"
                hint="Bạn có thể cần được cấp quyền tham gia dự án."
              />
            ) : (
              <div className="space-y-3">
                {filtered.map((p) => (
                  <MobileProjectCard key={p.id} project={p} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </MobileShell>
  );
}