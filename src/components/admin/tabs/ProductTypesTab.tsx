import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import {
  archiveProductType, createProductType, listGlobalProductTypes,
  listProjectProductTypes, updateProductType, type ProductTypeRow,
} from "@/services/admin/productTypes.service";
import { EmptyState, ErrorState } from "@/components/admin/EmptyState";
import { ServiceError } from "@/services/_helpers";
import { useAuth } from "@/features/auth/AuthProvider";

const CATEGORY_LABELS: Record<string, string> = {
  low_rise: "Thấp tầng", apartment: "Căn hộ", commercial: "Thương mại", other: "Khác",
};

export function ProductTypesTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const { currentUser } = useAuth();
  const canManageGlobal = Boolean(currentUser?.isSuperAdmin || currentUser?.isAdmin);
  return (
    <div className="space-y-8">
      <Section title="Loại sản phẩm toàn hệ thống" projectId={null} canManage={canManageGlobal} />
      <Section title="Loại sản phẩm riêng của dự án" projectId={projectId} canManage={canManage} />
    </div>
  );
}

function Section({ title, projectId, canManage }: { title: string; projectId: string | null; canManage: boolean }) {
  const qc = useQueryClient();
  const key = projectId ? queryKeys.adminProjectProductTypes(projectId) : ["admin", "product-types", "global"];
  const q = useQuery({
    queryKey: key,
    queryFn: () => (projectId ? listProjectProductTypes(projectId) : listGlobalProductTypes()),
  });
  const [editing, setEditing] = useState<ProductTypeRow | "new" | null>(null);
  const archiveMut = useMutation({
    mutationFn: archiveProductType,
    onSuccess: () => { toast.success("Đã lưu trữ"); qc.invalidateQueries({ queryKey: key }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {canManage ? (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus className="mr-1 h-4 w-4" /> Thêm
          </Button>
        ) : null}
      </div>
      {q.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : q.error ? (
        <ErrorState message="Không tải được." onRetry={() => q.refetch()} />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState title="Chưa có loại sản phẩm" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Nhóm</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).map((t) => (
                <TableRow key={t.id} className={t.status === "inactive" ? "opacity-50" : ""}>
                  <TableCell className="font-mono text-xs">{t.code}</TableCell>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-xs">{CATEGORY_LABELS[t.category] ?? t.category}</TableCell>
                  <TableCell><Badge variant="secondary">{t.status}</Badge></TableCell>
                  <TableCell>
                    {canManage ? (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(t)}><Pencil className="h-4 w-4" /></Button>
                        {t.status !== "inactive" ? (
                          <Button size="icon" variant="ghost" onClick={() => archiveMut.mutate(t.id)}><Archive className="h-4 w-4" /></Button>
                        ) : null}
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editing ? (
        <TypeFormDialog
          projectId={projectId}
          type={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: key }); setEditing(null); }}
        />
      ) : null}
    </div>
  );
}

function TypeFormDialog({
  projectId, type, onClose, onSaved,
}: {
  projectId: string | null; type: ProductTypeRow | null;
  onClose: () => void; onSaved: () => void;
}) {
  const [code, setCode] = useState(type?.code ?? "");
  const [name, setName] = useState(type?.name ?? "");
  const [category, setCategory] = useState(type?.category ?? "apartment");
  const [description, setDescription] = useState(type?.description ?? "");
  const [displayOrder, setDisplayOrder] = useState(type?.display_order ?? 0);
  const [status, setStatus] = useState(type?.status ?? "active");

  const mut = useMutation({
    mutationFn: async () => {
      const payload = { project_id: projectId, code, name, category, description: description || null, display_order: displayOrder, status };
      if (type) await updateProductType(type.id, payload);
      else await createProductType(payload);
    },
    onSuccess: () => { toast.success(type ? "Đã cập nhật" : "Đã tạo loại"); onSaved(); },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lưu thất bại"),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{type ? "Sửa loại sản phẩm" : "Thêm loại sản phẩm"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Mã *</Label><Input value={code} onChange={(e) => setCode(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Tên *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nhóm *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Thứ tự</Label><Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} /></div>
            <div className="space-y-1">
              <Label className="text-xs">Trạng thái</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Hoạt động</SelectItem>
                  <SelectItem value="inactive">Không hoạt động</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Mô tả</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !code || !name}>Lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}