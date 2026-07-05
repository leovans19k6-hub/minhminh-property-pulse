import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users as UsersIcon, Package, ClipboardList, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthProvider";
import { canCreateProjects, canReadUsers } from "@/features/admin/access";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { currentUser } = useAuth();
  const managedCount = currentUser?.projectMemberships.filter((m) =>
    ["project_director", "admin", "sales_manager"].includes(m.memberRole),
  ).length ?? 0;

  const recent = useQuery({
    queryKey: ["admin", "dashboard", "recent-projects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, code, status, updated_at")
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`Xin chào, ${currentUser?.profile?.full_name ?? currentUser?.email ?? "bạn"}`}
        description="Tổng quan hoạt động quản trị Minh Minh Sales Hub."
        actions={
          <div className="flex gap-2">
            {canCreateProjects(currentUser) && (
              <Button asChild size="sm">
                <Link to="/admin/projects/new">
                  <Plus className="mr-1 h-4 w-4" /> Tạo dự án
                </Link>
              </Button>
            )}
            {canReadUsers(currentUser) && (
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/users">
                  <UsersIcon className="mr-1 h-4 w-4" /> Người dùng
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {currentUser?.systemRoles.map((r) => (
          <Badge key={r} variant="secondary">{r}</Badge>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label="Dự án quản lý" value={managedCount} />
        <StatCard icon={Package} label="Tổng sản phẩm" value={0} placeholder />
        <StatCard icon={ClipboardList} label="Đăng ký" value={0} placeholder />
        <StatCard icon={UsersIcon} label="Khách hàng" value={0} placeholder />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Dự án cập nhật gần đây</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/projects">Xem tất cả</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải…</p>
          ) : recent.data?.length ? (
            <ul className="divide-y">
              {recent.data.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{p.status}</Badge>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/admin/projects/$projectId" params={{ projectId: p.id }}>
                        Mở
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có dự án nào.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  placeholder,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
  placeholder?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="rounded-lg bg-muted p-2">
          <Icon className="h-5 w-5 text-[var(--brand-navy)]" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">
            {value}
            {placeholder && (
              <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                (sắp có)
              </span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}