import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, ArrowUp, ArrowDown, ListOrdered, Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryKeys } from "@/lib/queryKeys";
import { EmptyState, ErrorState } from "@/components/admin/EmptyState";
import { ServiceError } from "@/services/_helpers";
import {
  listFieldDefinitions,
  reorderFieldDefinitions,
  setFieldStatus,
  FIELD_DATA_TYPE_LABELS,
  type FieldDataType,
  type FieldDefRow,
} from "@/services/admin/fieldDefinitions.service";
import { listProjectProductTypes } from "@/services/admin/productTypes.service";
import { FieldDefinitionDialog } from "@/components/admin/dialogs/FieldDefinitionDialog";
import { FieldOptionsDialog } from "@/components/admin/dialogs/FieldOptionsDialog";

export function FieldsTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const [productTypeId, setProductTypeId] = useState<string>("__all__");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [editing, setEditing] = useState<FieldDefRow | "new" | null>(null);
  const [optionsFor, setOptionsFor] = useState<FieldDefRow | null>(null);

  const filters = useMemo(
    () => ({
      productTypeId: productTypeId === "__all__" ? undefined : productTypeId,
      includeArchived,
    }),
    [productTypeId, includeArchived],
  );

  const key = queryKeys.adminProductFields(projectId, filters as Record<string, unknown>);
  const listKey = ["admin", "projects", projectId, "product-fields"];

  const q = useQuery({
    queryKey: key,
    queryFn: () =>
      listFieldDefinitions(projectId, {
        productTypeId: productTypeId === "__all__" ? undefined : productTypeId,
        includeArchived,
      }),
  });

  const productTypesQ = useQuery({
    queryKey: queryKeys.adminProjectProductTypes(projectId),
    queryFn: () => listProjectProductTypes(projectId),
  });

  const reorderMut = useMutation({
    mutationFn: reorderFieldDefinitions,
    onSuccess: () => qc.invalidateQueries({ queryKey: listKey }),
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Không đổi thứ tự được"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "archived" }) => setFieldStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: listKey }); toast.success("Đã cập nhật"); },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lỗi"),
  });

  const move = (idx: number, dir: -1 | 1) => {
    const items = [...(q.data ?? [])];
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    [items[idx], items[j]] = [items[j], items[idx]];
    reorderMut.mutate(items.map((it, i) => ({ id: it.id, display_order: (i + 1) * 10 })));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Loại sản phẩm</label>
            <Select value={productTypeId} onValueChange={setProductTypeId}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tất cả</SelectItem>
                {(productTypesQ.data ?? []).map((pt) => (
                  <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={includeArchived} onCheckedChange={setIncludeArchived} />
            Xem cả lưu trữ
          </label>
        </div>
        {canManage ? (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus className="mr-1 h-4 w-4" /> Thêm trường
          </Button>
        ) : null}
      </div>

      {q.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : q.error ? (
        <ErrorState message="Không tải được danh sách trường." onRetry={() => q.refetch()} />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState
          title="Chưa có trường tuỳ chỉnh"
          description="Thêm các trường mở rộng riêng cho bảng hàng của dự án này."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70px]" />
                <TableHead>Key</TableHead>
                <TableHead>Nhãn</TableHead>
                <TableHead>Kiểu</TableHead>
                <TableHead>Loại SP</TableHead>
                <TableHead>Cờ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).map((f, idx) => {
                const pt = (productTypesQ.data ?? []).find((x) => x.id === f.product_type_id);
                const flags = [
                  f.is_required && "required",
                  f.is_filterable && "filter",
                  f.is_sortable && "sort",
                  f.is_searchable && "search",
                ].filter(Boolean) as string[];
                const canHaveOptions = f.data_type === "single_select" || f.data_type === "multi_select";
                return (
                  <TableRow key={f.id} className={f.status === "archived" ? "opacity-50" : ""}>
                    <TableCell>
                      {canManage ? (
                        <div className="flex flex-col">
                          <Button size="icon" variant="ghost" className="h-6 w-6" disabled={idx === 0} onClick={() => move(idx, -1)}>
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" disabled={idx === (q.data?.length ?? 0) - 1} onClick={() => move(idx, 1)}>
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{f.field_key}</TableCell>
                    <TableCell className="font-medium">
                      {f.field_label}
                      {f.field_group ? <div className="text-xs text-muted-foreground">{f.field_group}</div> : null}
                    </TableCell>
                    <TableCell className="text-xs">{FIELD_DATA_TYPE_LABELS[f.data_type as FieldDataType] ?? f.data_type}</TableCell>
                    <TableCell className="text-xs">{pt?.name ?? <span className="text-muted-foreground">Tất cả</span>}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {flags.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : null}
                        {flags.map((fl) => (
                          <Badge key={fl} variant="outline" className="text-[10px]">{fl}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={f.status === "active" ? "secondary" : "outline"}>
                        {f.status === "active" ? "Hoạt động" : "Lưu trữ"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canManage ? (
                        <div className="flex justify-end gap-1">
                          {canHaveOptions ? (
                            <Button size="icon" variant="ghost" title="Tuỳ chọn" onClick={() => setOptionsFor(f)}>
                              <ListOrdered className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <Button size="icon" variant="ghost" onClick={() => setEditing(f)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {f.status === "active" ? (
                            <Button size="icon" variant="ghost" title="Lưu trữ" onClick={() => statusMut.mutate({ id: f.id, status: "archived" })}>
                              <Archive className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button size="icon" variant="ghost" title="Khôi phục" onClick={() => statusMut.mutate({ id: f.id, status: "active" })}>
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {editing ? (
        <FieldDefinitionDialog
          projectId={projectId}
          field={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      ) : null}
      {optionsFor ? (
        <FieldOptionsDialog
          fieldId={optionsFor.id}
          fieldLabel={optionsFor.field_label}
          onClose={() => setOptionsFor(null)}
        />
      ) : null}
    </div>
  );
}
