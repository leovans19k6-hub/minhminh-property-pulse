import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ServiceError } from "@/services/_helpers";
import {
  createInventoryView,
  updateInventoryView,
  validateViewCode,
  VIEW_TYPES,
  VIEW_TYPE_LABELS,
  type InventoryViewRow,
  type ViewType,
} from "@/services/admin/inventoryViews.service";

export function InventoryViewDialog({
  projectId,
  view,
  onClose,
  onSaved,
}: {
  projectId: string;
  view: InventoryViewRow | null;
  onClose: () => void;
  onSaved: (v: InventoryViewRow) => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!view;

  const [name, setName] = useState(view?.name ?? "");
  const [code, setCode] = useState(view?.code ?? "");
  const [description, setDescription] = useState(view?.description ?? "");
  const [viewType, setViewType] = useState<ViewType>((view?.view_type as ViewType) ?? "admin_table");
  const [isDefault, setIsDefault] = useState(view?.is_default ?? false);
  const [sortField, setSortField] = useState(view?.default_sort_field ?? "");
  const [sortDir, setSortDir] = useState<"asc" | "desc">((view?.default_sort_direction as "asc" | "desc") ?? "asc");
  const [pageSize, setPageSize] = useState<number>(view?.page_size ?? 30);

  useEffect(() => {
    if (!isEdit && !code && name) {
      const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
      if (slug) setCode(slug);
    }
  }, [name, code, isEdit]);

  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        project_id: projectId,
        name: name.trim(),
        code: code.trim(),
        description: description.trim() || null,
        view_type: viewType,
        is_default: isDefault,
        default_sort_field: sortField.trim() || null,
        default_sort_direction: sortDir,
        page_size: pageSize,
      };
      return isEdit
        ? updateInventoryView(view!.id, payload)
        : createInventoryView(payload);
    },
    onSuccess: (row) => {
      toast.success(isEdit ? "Đã cập nhật view" : "Đã tạo view");
      qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "inventory-views"] });
      onSaved(row);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ServiceError ? e.message : "Không lưu được"),
  });

  const submit = () => {
    if (!name.trim()) return toast.error("Nhập tên view");
    const err = validateViewCode(code.trim());
    if (err) return toast.error(err);
    if (pageSize < 1 || pageSize > 200) return toast.error("Page size 1–200");
    mut.mutate();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa bảng hiển thị" : "Tạo bảng hiển thị"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tên *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Mã (code) *</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toLowerCase())}
                disabled={isEdit}
                placeholder="admin_default"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Loại view</Label>
              <Select value={viewType} onValueChange={(v) => setViewType(v as ViewType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VIEW_TYPES.map((v) => (
                    <SelectItem key={v} value={v}>{VIEW_TYPE_LABELS[v]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Page size</Label>
              <Input type="number" min={1} max={200}
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) || 30)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Mô tả</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Sort mặc định (field key)</Label>
              <Input value={sortField} onChange={(e) => setSortField(e.target.value)} placeholder="product_code" />
            </div>
            <div className="space-y-1.5">
              <Label>Chiều sort</Label>
              <Select value={sortDir} onValueChange={(v) => setSortDir(v as "asc" | "desc")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Tăng dần</SelectItem>
                  <SelectItem value="desc">Giảm dần</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded border px-3 py-2">
            <div>
              <div className="text-sm font-medium">Đặt làm mặc định</div>
              <div className="text-xs text-muted-foreground">Chỉ 1 default cho mỗi loại view.</div>
            </div>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={submit} disabled={mut.isPending}>{mut.isPending ? "Đang lưu…" : "Lưu"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}