import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryKeys } from "@/lib/queryKeys";
import { adminGetProject } from "@/services/admin/projects.service";

export const Route = createFileRoute("/admin/projects/$projectId")({
  component: ProjectDetailLayout,
});

function ProjectDetailLayout() {
  const matchRoute = useMatchRoute();
  if (matchRoute({ to: "/admin/projects/$projectId/edit", fuzzy: true })) return <Outlet />;
  return <ProjectDetail />;
}

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const q = useQuery({
    queryKey: queryKeys.adminProjectDetail(projectId),
    queryFn: () => adminGetProject(projectId),
  });
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Đang tải…</p>;
  if (!q.data) return <p className="text-sm text-muted-foreground">Không tìm thấy dự án.</p>;
  const p = q.data;
  const dev = Array.isArray(p.developers) ? p.developers[0] : p.developers;
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={p.name}
        description={`${p.code} · ${dev?.name ?? "—"}`}
        breadcrumb={<Link to="/admin/projects" className="inline-flex items-center gap-1 hover:underline"><ArrowLeft className="h-3 w-3" />Dự án</Link>}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/projects/$projectId/edit" params={{ projectId }}>
              <Pencil className="mr-1 h-4 w-4" /> Chỉnh sửa
            </Link>
          </Button>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="zones" disabled>Phân khu</TabsTrigger>
          <TabsTrigger value="buildings" disabled>Tòa nhà</TabsTrigger>
          <TabsTrigger value="floors" disabled>Tầng</TabsTrigger>
          <TabsTrigger value="types" disabled>Loại SP</TabsTrigger>
          <TabsTrigger value="members" disabled>Thành viên</TabsTrigger>
          <TabsTrigger value="inventory" disabled>Bảng hàng</TabsTrigger>
          <TabsTrigger value="policies" disabled>Chính sách</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Thông tin dự án</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Nhà phát triển" value={dev?.name} />
                <Info label="Danh mục" value={p.project_category} />
                <Info label="Trạng thái" value={<Badge variant="outline">{p.status}</Badge>} />
                <Info label="Featured" value={p.is_featured ? "Có" : "Không"} />
                <Info label="Địa chỉ" value={p.location_text} />
                <Info label="Tỉnh/Thành" value={p.province} />
                <Info label="Quận/Huyện" value={p.district} />
                <Info label="Thứ tự hiển thị" value={p.display_order} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Mô tả</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{p.description ?? p.short_description ?? "Chưa có mô tả."}</p>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-4">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Các tab quản lý cấu trúc (phân khu, tòa nhà, tầng, loại sản phẩm, thành viên) sẽ có ở bước phát triển tiếp theo.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value ?? "—"}</div>
    </div>
  );
}