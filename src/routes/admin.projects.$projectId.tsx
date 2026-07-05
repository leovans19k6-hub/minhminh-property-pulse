import { createFileRoute, Link, Outlet, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryKeys } from "@/lib/queryKeys";
import { adminGetProject } from "@/services/admin/projects.service";
import { OverviewTab } from "@/components/admin/tabs/OverviewTab";
import { ZonesTab } from "@/components/admin/tabs/ZonesTab";
import { BuildingsTab } from "@/components/admin/tabs/BuildingsTab";
import { FloorsTab } from "@/components/admin/tabs/FloorsTab";
import { ProductTypesTab } from "@/components/admin/tabs/ProductTypesTab";
import { MembersTab } from "@/components/admin/tabs/MembersTab";
import { FieldsTab } from "@/components/admin/tabs/FieldsTab";
import { InventorySettingsTab } from "@/components/admin/tabs/InventorySettingsTab";
import { ViewsTab } from "@/components/admin/tabs/ViewsTab";
import { useAuth } from "@/features/auth/AuthProvider";
import { canManageProject } from "@/features/admin/access";

const TAB_VALUES = ["overview", "zones", "buildings", "floors", "product-types", "fields", "views", "settings", "members", "inventory", "policies", "vouchers", "events"] as const;

const searchSchema = z.object({
  tab: fallback(z.enum(TAB_VALUES), "overview").default("overview"),
});

export const Route = createFileRoute("/admin/projects/$projectId")({
  validateSearch: zodValidator(searchSchema),
  component: ProjectDetailLayout,
});

function ProjectDetailLayout() {
  const matchRoute = useMatchRoute();
  if (matchRoute({ to: "/admin/projects/$projectId/edit", fuzzy: true })) return <Outlet />;
  return <ProjectDetail />;
}

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/projects/$projectId" });
  const { currentUser } = useAuth();
  const canManage = canManageProject(currentUser, projectId);

  const q = useQuery({
    queryKey: queryKeys.adminProjectDetail(projectId),
    queryFn: () => adminGetProject(projectId),
  });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Đang tải…</p>;
  if (!q.data) return <p className="text-sm text-muted-foreground">Không tìm thấy dự án.</p>;
  const p = q.data;
  const dev = Array.isArray(p.developers) ? p.developers[0] : p.developers;

  const setTab = (value: string) =>
    navigate({ search: { tab: (TAB_VALUES as readonly string[]).includes(value) ? (value as typeof tab) : "overview" }, replace: false });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={p.name}
        description={`${p.code} · ${dev?.name ?? "—"} · ${p.location_text ?? ""}`}
        breadcrumb={
          <Link to="/admin/projects" className="inline-flex items-center gap-1 hover:underline">
            <ArrowLeft className="h-3 w-3" />Dự án
          </Link>
        }
        actions={
          <>
            <Badge variant="outline">{p.status}</Badge>
            {canManage ? (
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/projects/$projectId/edit" params={{ projectId }}>
                  <Pencil className="mr-1 h-4 w-4" /> Chỉnh sửa
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="zones">Phân khu</TabsTrigger>
          <TabsTrigger value="buildings">Tòa nhà</TabsTrigger>
          <TabsTrigger value="floors">Tầng</TabsTrigger>
          <TabsTrigger value="product-types">Loại SP</TabsTrigger>
          <TabsTrigger value="fields">Trường tuỳ chỉnh</TabsTrigger>
          <TabsTrigger value="views">Bảng hiển thị</TabsTrigger>
          <TabsTrigger value="settings">Cấu hình</TabsTrigger>
          <TabsTrigger value="members">Thành viên</TabsTrigger>
          <TabsTrigger value="inventory" disabled>Bảng hàng</TabsTrigger>
          <TabsTrigger value="policies" disabled>Chính sách</TabsTrigger>
          <TabsTrigger value="vouchers" disabled>Voucher</TabsTrigger>
          <TabsTrigger value="events" disabled>Sự kiện</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4"><OverviewTab project={p} /></TabsContent>
        <TabsContent value="zones" className="mt-4">{tab === "zones" && <ZonesTab projectId={projectId} canManage={canManage} />}</TabsContent>
        <TabsContent value="buildings" className="mt-4">{tab === "buildings" && <BuildingsTab projectId={projectId} canManage={canManage} />}</TabsContent>
        <TabsContent value="floors" className="mt-4">{tab === "floors" && <FloorsTab projectId={projectId} canManage={canManage} />}</TabsContent>
        <TabsContent value="product-types" className="mt-4">{tab === "product-types" && <ProductTypesTab projectId={projectId} canManage={canManage} />}</TabsContent>
        <TabsContent value="fields" className="mt-4">{tab === "fields" && <FieldsTab projectId={projectId} canManage={canManage} />}</TabsContent>
        <TabsContent value="views" className="mt-4">{tab === "views" && <ViewsTab projectId={projectId} canManage={canManage} />}</TabsContent>
        <TabsContent value="settings" className="mt-4">{tab === "settings" && <InventorySettingsTab projectId={projectId} canManage={canManage} />}</TabsContent>
        <TabsContent value="members" className="mt-4">{tab === "members" && <MembersTab projectId={projectId} canManage={canManage} />}</TabsContent>
      </Tabs>
    </div>
  );
}