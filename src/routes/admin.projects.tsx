import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { queryKeys } from "@/lib/queryKeys";
import { adminListProjects } from "@/services/admin/projects.service";
import { useAuth } from "@/features/auth/AuthProvider";
import { canCreateProjects } from "@/features/admin/access";

export const Route = createFileRoute("/admin/projects")({
  component: ProjectsLayout,
});

function ProjectsLayout() {
  const matchRoute = useMatchRoute();
  // If a child route is active (new / $projectId / edit), render it.
  if (matchRoute({ to: "/admin/projects/new" }) || matchRoute({ to: "/admin/projects/$projectId", fuzzy: true })) {
    return <Outlet />;
  }
  return <ProjectsIndex />;
}

function ProjectsIndex() {
  const { currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: queryKeys.adminProjects({ search }),
    queryFn: () => adminListProjects({ search: search || undefined }),
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dự án"
        description="Quản lý danh mục dự án đang phân phối."
        actions={
          canCreateProjects(currentUser) && (
            <Button asChild size="sm">
              <Link to="/admin/projects/new"><Plus className="mr-1 h-4 w-4" /> Tạo dự án</Link>
            </Button>
          )
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên, mã, slug…" className="pl-9" />
      </div>

      {q.isLoading && <p className="text-sm text-muted-foreground">Đang tải…</p>}
      {q.data?.length === 0 && <p className="text-sm text-muted-foreground">Chưa có dự án nào.</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {q.data?.map((p) => {
          const dev = Array.isArray(p.developers) ? p.developers[0] : p.developers;
          return (
            <Card key={p.id} className="transition hover:shadow-md">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link to="/admin/projects/$projectId" params={{ projectId: p.id }} className="block truncate font-semibold hover:underline">
                      {p.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{p.code} · {dev?.name ?? "—"}</p>
                  </div>
                  <Badge variant={p.status === "active" ? "default" : "outline"}>{p.status}</Badge>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{p.short_description ?? p.description ?? "Chưa có mô tả."}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{p.province ?? p.location_text ?? "—"}</span>
                  <span>#{p.display_order}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}