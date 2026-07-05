import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import {
  addProjectMember, listProjectMembers, removeProjectMember,
  setPrimaryContact, updateProjectMember,
  MEMBER_ROLE_LABELS, type MemberRow,
} from "@/services/admin/projectMembers.service";
import { searchEligibleProjectMembers } from "@/features/admin/members.functions";
import { EmptyState, ErrorState } from "@/components/admin/EmptyState";
import { ServiceError } from "@/services/_helpers";

type MemberWithProfile = MemberRow & {
  profiles: {
    id: string; full_name: string | null; avatar_url: string | null;
    phone: string | null; employee_code: string | null;
    branch: string | null; department: string | null; position: string | null; status: string;
  } | null;
};

export function MembersTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: queryKeys.adminProjectMembers(projectId),
    queryFn: () => listProjectMembers(projectId) as Promise<MemberWithProfile[]>,
  });
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<MemberWithProfile | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const removeTarget = q.data?.find((m) => m.id === removeId);

  const setPrimaryMut = useMutation({
    mutationFn: (memberId: string) => setPrimaryContact(projectId, memberId),
    onSuccess: () => {
      toast.success("Đã đặt người liên hệ chính");
      qc.invalidateQueries({ queryKey: queryKeys.adminProjectMembers(projectId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: removeProjectMember,
    onSuccess: () => {
      toast.success("Đã xóa thành viên");
      qc.invalidateQueries({ queryKey: queryKeys.adminProjectMembers(projectId) });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setRemoveId(null),
  });

  if (q.isLoading) return <Skeleton className="h-40 w-full" />;
  if (q.error) return <ErrorState message="Không tải được danh sách thành viên." onRetry={() => q.refetch()} />;
  const rows = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rows.length} thành viên</p>
        {canManage ? (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Thêm thành viên
          </Button>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Chưa có thành viên" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thành viên</TableHead>
                <TableHead>Chức vụ dự án</TableHead>
                <TableHead>Chi nhánh</TableHead>
                <TableHead>SĐT</TableHead>
                <TableHead>Chính</TableHead>
                <TableHead className="w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        {m.profiles?.avatar_url && <AvatarImage src={m.profiles.avatar_url} />}
                        <AvatarFallback className="text-xs">{(m.profiles?.full_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{m.profiles?.full_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{m.profiles?.employee_code ?? m.profiles?.position ?? ""}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{MEMBER_ROLE_LABELS[m.member_role] ?? m.member_role}</Badge></TableCell>
                  <TableCell className="text-xs">{m.profiles?.branch ?? "—"}</TableCell>
                  <TableCell className="text-xs">{m.phone_override ?? m.profiles?.phone ?? "—"}</TableCell>
                  <TableCell>
                    {m.is_primary_contact ? (
                      <Badge className="bg-amber-500 text-white"><Star className="mr-1 h-3 w-3" />Chính</Badge>
                    ) : canManage ? (
                      <Button size="sm" variant="ghost" onClick={() => setPrimaryMut.mutate(m.id)}>Đặt làm chính</Button>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {canManage ? (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(m)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setRemoveId(m.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {addOpen ? (
        <AddMemberDialog
          projectId={projectId}
          existingUserIds={rows.map((r) => r.user_id)}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: queryKeys.adminProjectMembers(projectId) });
            setAddOpen(false);
          }}
        />
      ) : null}

      {editing ? (
        <EditMemberDialog
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: queryKeys.adminProjectMembers(projectId) });
            setEditing(null);
          }}
        />
      ) : null}

      <AlertDialog open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa thành viên?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget?.is_primary_contact
                ? "Thành viên này đang là người liên hệ chính. Hãy đặt người khác làm chính trước khi xóa."
                : "Thành viên sẽ bị xóa khỏi dự án. Bạn có thể thêm lại bất cứ lúc nào."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={removeTarget?.is_primary_contact ?? false}
              onClick={() => removeId && removeMut.mutate(removeId)}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type Eligible = {
  id: string; full_name: string | null; avatar_url: string | null;
  phone: string | null; employee_code: string | null; branch: string | null;
  department: string | null; position: string | null; status: string;
};

function AddMemberDialog({
  projectId, existingUserIds, onClose, onSaved,
}: {
  projectId: string; existingUserIds: string[];
  onClose: () => void; onSaved: () => void;
}) {
  const search = useServerFn(searchEligibleProjectMembers);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<Eligible | null>(null);
  const [role, setRole] = useState("sales");
  const [phoneOverride, setPhoneOverride] = useState("");
  const [zaloUrl, setZaloUrl] = useState("");
  const [note, setNote] = useState("");
  const [makePrimary, setMakePrimary] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const eligibleQ = useQuery({
    queryKey: ["admin", "eligible-members", projectId, debounced],
    queryFn: async () => (await search({ data: { projectId, query: debounced, limit: 20 } })).rows as Eligible[],
  });

  const results = (eligibleQ.data ?? []).filter((u) => !existingUserIds.includes(u.id));

  const mut = useMutation({
    mutationFn: async () => {
      if (!selected) throw new ServiceError("Chưa chọn người dùng");
      const created = await addProjectMember({
        project_id: projectId, user_id: selected.id, member_role: role,
        phone_override: phoneOverride || null, zalo_url: zaloUrl || null, note: note || null,
      });
      if (makePrimary) await setPrimaryContact(projectId, created.id);
    },
    onSuccess: () => { toast.success("Đã thêm thành viên"); onSaved(); },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Thêm thất bại"),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Thêm thành viên dự án</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {!selected ? (
            <>
              <Input placeholder="Tìm theo tên, mã NV, SĐT…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
              <div className="max-h-64 space-y-1 overflow-auto rounded border p-2">
                {eligibleQ.isLoading ? <p className="text-xs text-muted-foreground">Đang tìm…</p>
                  : results.length === 0 ? <p className="text-xs text-muted-foreground">Không có kết quả.</p>
                  : results.map((u) => (
                    <button key={u.id} type="button" className="flex w-full items-center gap-2 rounded p-2 text-left hover:bg-muted"
                      onClick={() => setSelected(u)}>
                      <Avatar className="h-8 w-8">
                        {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                        <AvatarFallback className="text-xs">{(u.full_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{u.full_name ?? "—"}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {[u.employee_code, u.branch, u.position].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between rounded border p-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{(selected.full_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm font-medium">{selected.full_name}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Chọn lại</Button>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Chức vụ dự án *</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MEMBER_ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">SĐT ghi đè</Label><Input value={phoneOverride} onChange={(e) => setPhoneOverride(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Zalo URL</Label><Input value={zaloUrl} onChange={(e) => setZaloUrl(e.target.value)} /></div>
              </div>
              <div className="space-y-1"><Label className="text-xs">Ghi chú</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={makePrimary} onChange={(e) => setMakePrimary(e.target.checked)} />
                Đặt làm người liên hệ chính
              </label>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button onClick={() => mut.mutate()} disabled={!selected || mut.isPending}>Thêm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditMemberDialog({
  member, onClose, onSaved,
}: { member: MemberRow; onClose: () => void; onSaved: () => void }) {
  const [role, setRole] = useState(member.member_role);
  const [phoneOverride, setPhoneOverride] = useState(member.phone_override ?? "");
  const [zaloUrl, setZaloUrl] = useState(member.zalo_url ?? "");
  const [note, setNote] = useState(member.note ?? "");
  const mut = useMutation({
    mutationFn: () => updateProjectMember(member.id, {
      member_role: role, phone_override: phoneOverride || null,
      zalo_url: zaloUrl || null, note: note || null,
    }),
    onSuccess: () => { toast.success("Đã cập nhật"); onSaved(); },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lưu thất bại"),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Sửa thành viên</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Chức vụ dự án</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(MEMBER_ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">SĐT ghi đè</Label><Input value={phoneOverride} onChange={(e) => setPhoneOverride(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Zalo URL</Label><Input value={zaloUrl} onChange={(e) => setZaloUrl(e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Ghi chú</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">Người liên hệ chính được đặt qua nút &quot;Đặt làm chính&quot; ngoài danh sách.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>Lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}