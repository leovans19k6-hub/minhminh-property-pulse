import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn as useSFn } from "@tanstack/react-start";
import { z } from "zod";
import { Plus, Search, UserCog, Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { queryKeys } from "@/lib/queryKeys";
import {
  listAdminUsers,
  createAdminUser,
  setUserStatus,
  assignUserRole,
  removeUserRole,
} from "@/features/admin/users.functions";
import { useAuth } from "@/features/auth/AuthProvider";
import { canManageUsers, assignableRoles } from "@/features/admin/access";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const { currentUser } = useAuth();
  const canManage = canManageUsers(currentUser);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "all">("all");

  const listFn = useSFn(listAdminUsers);
  const usersQ = useQuery({
    queryKey: queryKeys.adminUsers({ search, status }),
    queryFn: () => listFn({ data: { search: search || undefined, status, limit: 100, offset: 0 } }),
  });

  const disableFn = useSFn(setUserStatus);
  const toggleStatus = useMutation({
    mutationFn: (v: { userId: string; status: "active" | "inactive" }) => disableFn({ data: v }),
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: Error) => toast.error(mapUserError(e.message)),
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Người dùng"
        description="Quản lý tài khoản, phân quyền hệ thống."
        actions={canManage ? <CreateUserDialog /> : null}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, mã nhân viên, số điện thoại…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="inactive">Ngưng hoạt động</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người dùng</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden lg:table-cell">Mã NV</TableHead>
              <TableHead className="hidden lg:table-cell">Chi nhánh</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersQ.isLoading && (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              </TableCell></TableRow>
            )}
            {usersQ.data?.rows.length === 0 && !usersQ.isLoading && (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                Chưa có người dùng nào.
              </TableCell></TableRow>
            )}
            {usersQ.data?.rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium">{u.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground md:hidden">{u.email ?? "—"}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">{u.email ?? "—"}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm">{u.employee_code ?? "—"}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm">{u.branch ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    {u.roles.map((r) => (
                      <Badge key={r.code} variant="secondary" className="text-[10px]">{r.name}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={u.status === "active" ? "default" : "outline"}>
                    {u.status === "active" ? "Hoạt động" : "Ngưng"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/admin/users/$userId" params={{ userId: u.id }}>
                        <UserCog className="h-4 w-4" />
                      </Link>
                    </Button>
                    {canManage && (
                      <Button
                        size="sm" variant="outline"
                        onClick={() => toggleStatus.mutate({
                          userId: u.id,
                          status: u.status === "active" ? "inactive" : "active",
                        })}
                        disabled={toggleStatus.isPending}
                      >
                        {u.status === "active" ? "Ngưng" : "Kích hoạt"}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function mapUserError(m: string): string {
  if (m.includes("cannot_disable_last_super_admin")) return "Không thể ngưng super_admin cuối cùng.";
  if (m.includes("cannot_manage_super_admin")) return "Bạn không có quyền quản lý super_admin.";
  if (m.includes("forbidden_inactive")) return "Tài khoản của bạn đang bị ngưng.";
  if (m.includes("forbidden")) return "Không đủ quyền.";
  if (m.includes("insufficient_privilege")) return "Không đủ quyền.";
  if (m.includes("cannot_remove_last_super_admin")) return "Không thể xóa super_admin cuối cùng.";
  return m;
}

function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", full_name: "",
    phone: "", employee_code: "", branch: "", department: "", position: "",
  });
  const qc = useQueryClient();
  const createFn = useSFn(createAdminUser);
  const mutation = useMutation({
    mutationFn: () => createFn({ data: {
      email: form.email, password: form.password, full_name: form.full_name,
      phone: form.phone || undefined,
      employee_code: form.employee_code || undefined,
      branch: form.branch || undefined,
      department: form.department || undefined,
      position: form.position || undefined,
      status: "active" as const,
    } }),
    onSuccess: () => {
      toast.success("Đã tạo tài khoản");
      setOpen(false);
      setForm({ email: "", password: "", full_name: "", phone: "", employee_code: "", branch: "", department: "", position: "" });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: Error) => toast.error(mapUserError(e.message)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Tạo người dùng</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo người dùng mới</DialogTitle>
          <DialogDescription>Mật khẩu tạm sẽ chỉ hiển thị 1 lần trong form này.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Email *"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Mật khẩu tạm *"><Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="≥10 ký tự" /></Field>
          <Field label="Họ tên *"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label="Điện thoại"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Mã NV"><Input value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} /></Field>
          <Field label="Chi nhánh"><Input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} /></Field>
          <Field label="Phòng ban"><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
          <Field label="Chức vụ"><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
          <Button
            disabled={mutation.isPending || !form.email || form.password.length < 10 || !form.full_name}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Tạo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

export { mapUserError, assignUserRole, removeUserRole };
// re-export helper types so admin.users.$userId can share
export type _AssignableRolesHelper = typeof assignableRoles;
// suppress unused schema import warning
void z;