import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/features/auth/AuthProvider";
import { canManageUsers, assignableRoles } from "@/features/admin/access";
import {
  getAdminUser, assignUserRole, removeUserRole, setUserStatus,
} from "@/features/admin/users.functions";
import { mapUserError } from "./admin.users";

export const Route = createFileRoute("/admin/users/$userId")({
  component: UserDetailPage,
});

function UserDetailPage() {
  const { userId } = Route.useParams();
  const { currentUser } = useAuth();
  const canManage = canManageUsers(currentUser);
  const qc = useQueryClient();
  const getFn = useServerFn(getAdminUser);
  const assignFn = useServerFn(assignUserRole);
  const removeFn = useServerFn(removeUserRole);
  const statusFn = useServerFn(setUserStatus);

  const q = useQuery({
    queryKey: queryKeys.adminUserDetail(userId),
    queryFn: () => getFn({ data: { userId } }),
  });

  const [pickedRole, setPickedRole] = useState("");
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.adminUserDetail(userId) });
    qc.invalidateQueries({ queryKey: ["admin", "users"] });
  };
  const assign = useMutation({
    mutationFn: (roleCode: string) => assignFn({ data: { userId, roleCode } }),
    onSuccess: () => { toast.success("Đã gán vai trò"); invalidate(); },
    onError: (e: Error) => toast.error(mapUserError(e.message)),
  });
  const remove = useMutation({
    mutationFn: (roleCode: string) => removeFn({ data: { userId, roleCode } }),
    onSuccess: () => { toast.success("Đã xóa vai trò"); invalidate(); },
    onError: (e: Error) => toast.error(mapUserError(e.message)),
  });
  const toggle = useMutation({
    mutationFn: (newStatus: "active" | "inactive") => statusFn({ data: { userId, status: newStatus } }),
    onSuccess: () => { toast.success("Đã cập nhật trạng thái"); invalidate(); },
    onError: (e: Error) => toast.error(mapUserError(e.message)),
  });

  if (q.isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin" />;
  if (!q.data) return <p className="text-sm text-muted-foreground">Không tìm thấy người dùng.</p>;

  const p = q.data.profile as {
    full_name: string | null; phone: string | null; employee_code: string | null;
    branch: string | null; department: string | null; position: string | null; status: string;
    avatar_url: string | null;
    user_roles?: Array<{ roles: { id: string; code: string; name: string } | { id: string; code: string; name: string }[] | null }>;
    project_members?: Array<{ id: string; member_role: string; is_primary_contact: boolean; projects: { id: string; name: string; code: string } | { id: string; name: string; code: string }[] | null }>;
  };
  const roles = (p.user_roles ?? []).flatMap((ur) =>
    Array.isArray(ur.roles) ? ur.roles : ur.roles ? [ur.roles] : [],
  );
  const memberships = (p.project_members ?? []).map((m) => ({
    ...m,
    project: Array.isArray(m.projects) ? m.projects[0] : m.projects,
  }));
  const availableRoles = assignableRoles(currentUser).filter(
    (r) => !roles.some((existing) => existing.code === r),
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={p.full_name ?? q.data.email ?? "Người dùng"}
        description={q.data.email ?? undefined}
        breadcrumb={<Link to="/admin/users" className="inline-flex items-center gap-1 hover:underline"><ArrowLeft className="h-3 w-3" />Người dùng</Link>}
        actions={
          canManage && (
            <Button
              variant={p.status === "active" ? "outline" : "default"}
              onClick={() => toggle.mutate(p.status === "active" ? "inactive" : "active")}
            >
              {p.status === "active" ? "Ngưng tài khoản" : "Kích hoạt tài khoản"}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Hồ sơ</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Trạng thái" value={p.status} />
            <Info label="Điện thoại" value={p.phone} />
            <Info label="Mã NV" value={p.employee_code} />
            <Info label="Chi nhánh" value={p.branch} />
            <Info label="Phòng ban" value={p.department} />
            <Info label="Chức vụ" value={p.position} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Vai trò hệ thống</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {roles.length === 0 && <span className="text-sm text-muted-foreground">Chưa có</span>}
              {roles.map((r) => (
                <Badge key={r.code} variant="secondary" className="gap-2">
                  {r.name}
                  {canManage && assignableRoles(currentUser).includes(r.code) && (
                    <button
                      onClick={() => remove.mutate(r.code)}
                      className="text-xs opacity-60 hover:opacity-100"
                      aria-label={`Xóa ${r.name}`}
                    >×</button>
                  )}
                </Badge>
              ))}
            </div>
            {canManage && availableRoles.length > 0 && (
              <div className="flex gap-2">
                <Select value={pickedRole} onValueChange={setPickedRole}>
                  <SelectTrigger><SelectValue placeholder="Chọn vai trò" /></SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={!pickedRole || assign.isPending}
                  onClick={() => { assign.mutate(pickedRole); setPickedRole(""); }}
                >Gán</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Dự án tham gia</CardTitle></CardHeader>
          <CardContent>
            {memberships.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa tham gia dự án nào.</p>
            ) : (
              <ul className="divide-y">
                {memberships.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <div className="font-medium">{m.project?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{m.member_role}{m.is_primary_contact ? " · Primary" : ""}</div>
                    </div>
                    {m.project?.id && (
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/admin/projects/$projectId" params={{ projectId: m.project.id }}>Xem</Link>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value ?? "—"}</div>
    </div>
  );
}