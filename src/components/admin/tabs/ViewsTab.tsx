import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Columns3, Copy, Pencil, Plus, RotateCcw, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { queryKeys } from "@/lib/queryKeys";
import { EmptyState, ErrorState } from "@/components/admin/EmptyState";
import { ServiceError } from "@/services/_helpers";
import {
  listInventoryViews,
  setViewStatus,
  duplicateInventoryView,
  setDefaultViewRpc,
  VIEW_TYPES,
  VIEW_TYPE_LABELS,
  type InventoryViewRow,
  type ViewType,
} from "@/services/admin/inventoryViews.service";
import { InventoryViewDialog } from "@/components/admin/dialogs/InventoryViewDialog";
import { ViewFieldsDialog } from "@/components/admin/dialogs/ViewFieldsDialog";

export function ViewsTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const [viewTypeFilter, setViewTypeFilter] = useState<string>("__all__");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [editing, setEditing] = useState<InventoryViewRow | "new" | null>(null);
  const [fieldsFor, setFieldsFor] = useState<InventoryViewRow | null>(null);
  const [duplicating, setDuplicating] = useState<InventoryViewRow | null>(null);

  const filters = useMemo(
    () => ({
      viewType: viewTypeFilter === "__all__" ? undefined : (viewTypeFilter as ViewType),
      includeArchived,
    }),
    [viewTypeFilter, includeArchived],
  );

  const listKey = ["admin", "projects", projectId, "inventory-views"];
  const key = queryKeys.adminInventoryViews(projectId, filters as Record<string, unknown>);

  const q = useQuery({
    queryKey: key,
    queryFn: () =>
      listInventoryViews(projectId, {
        viewType: viewTypeFilter === "__all__" ? undefined : (viewTypeFilter as ViewType),
        includeArchived,
      }),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "archived" }) => setViewStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: listKey }); toast.success("Đã cập nhật"); },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lỗi"),
  });

  const defaultMut = useMutation({
    mutationFn: (v: InventoryViewRow) => setDefaultViewRpc(v.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: listKey }); toast.success("Đã đặt mặc định"); },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lỗi"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Loại view</div>
            <Select value={viewTypeFilter} onValueChange={setViewTypeFilter}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tất cả</SelectItem>
                {VIEW_TYPES.map((v) => (
                  <SelectItem key={v} value={v}>{VIEW_TYPE_LABELS[v]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={includeArchived} onCheckedChange={setIncludeArchived} />
            Hiện đã lưu trữ
          </label>
        </div>
        {canManage ? (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus className="mr-1 h-4 w-4" /> Tạo view
          </Button>
        ) : null}
      </div>

      {q.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : q.isError ? (
        <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />
      ) : !q.data || q.data.length === 0 ? (
        <EmptyState title="Chưa có bảng hiển thị" description="Tạo view đầu tiên để cấu hình cột cho bảng hàng." />
      ) : (
        <div className="rounded border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Mã</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Mặc định</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-64 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.data.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell className="font-mono text-xs">{v.code}</TableCell>
                  <TableCell>{VIEW_TYPE_LABELS[v.view_type as ViewType] ?? v.view_type}</TableCell>
                  <TableCell>
                    {v.is_default ? <Badge><Star className="mr-1 h-3 w-3" />Mặc định</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={v.status === "active" ? "outline" : "secondary"}>{v.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => setFieldsFor(v)}>
                      <Columns3 className="mr-1 h-4 w-4" /> Cột
                    </Button>
                    {canManage && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => setEditing(v)} title="Sửa">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!v.is_default && v.status === "active" && (
                          <Button size="icon" variant="ghost" title="Đặt mặc định" onClick={() => defaultMut.mutate(v)}>
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" title="Nhân bản" onClick={() => setDuplicating(v)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        {v.status === "active" ? (
                          <Button size="icon" variant="ghost" title="Lưu trữ"
                            onClick={() => statusMut.mutate({ id: v.id, status: "archived" })}>
                            <Archive className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button size="icon" variant="ghost" title="Kích hoạt lại"
                            onClick={() => statusMut.mutate({ id: v.id, status: "active" })}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editing ? (
        <InventoryViewDialog
          projectId={projectId}
          view={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      ) : null}
      {fieldsFor ? (
        <ViewFieldsDialog projectId={projectId} view={fieldsFor} onClose={() => setFieldsFor(null)} />
      ) : null}
      {duplicating ? (
        <DuplicateDialog projectId={projectId} source={duplicating} onClose={() => setDuplicating(null)} />
      ) : null}
    </div>
  );
}

function DuplicateDialog({
  projectId,
  source,
  onClose,
}: {
  projectId: string;
  source: InventoryViewRow;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(`${source.name} (bản sao)`);
  const [code, setCode] = useState(`${source.code}_copy`);
  const mut = useMutation({
    mutationFn: () => duplicateInventoryView(source.id, { name: name.trim(), code: code.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "inventory-views"] });
      toast.success("Đã nhân bản view");
      onClose();
    },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Không nhân bản được"),
  });
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nhân bản view</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tên mới</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Mã (code) mới</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toLowerCase())} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending ? "Đang xử lý…" : "Nhân bản"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}