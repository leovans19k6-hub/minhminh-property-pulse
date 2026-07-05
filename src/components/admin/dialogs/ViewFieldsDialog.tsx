import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { queryKeys } from "@/lib/queryKeys";
import { ServiceError } from "@/services/_helpers";
import {
  listViewFields,
  addViewField,
  updateViewField,
  removeViewField,
  reorderViewFields,
  CORE_FIELD_KEY_OPTIONS,
  type ViewFieldRow,
} from "@/services/admin/inventoryViewFields.service";
import { listFieldDefinitions } from "@/services/admin/fieldDefinitions.service";
import type { InventoryViewRow } from "@/services/admin/inventoryViews.service";

type Source = "core" | "custom" | "price";

export function ViewFieldsDialog({
  projectId,
  view,
  onClose,
}: {
  projectId: string;
  view: InventoryViewRow;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const fieldsKey = queryKeys.adminInventoryViewFields(view.id);

  const fieldsQ = useQuery({ queryKey: fieldsKey, queryFn: () => listViewFields(view.id) });
  const defsQ = useQuery({
    queryKey: queryKeys.adminProductFields(projectId, { includeArchived: false }),
    queryFn: () => listFieldDefinitions(projectId, { includeArchived: false }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: fieldsKey });

  const reorderMut = useMutation({
    mutationFn: reorderViewFields,
    onSuccess: invalidate,
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lỗi"),
  });
  const removeMut = useMutation({
    mutationFn: removeViewField,
    onSuccess: () => { invalidate(); toast.success("Đã xoá cột"); },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lỗi"),
  });
  const patchMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ViewFieldRow> }) => updateViewField(id, patch),
    onSuccess: invalidate,
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lỗi"),
  });

  const move = (idx: number, dir: -1 | 1) => {
    const items = [...(fieldsQ.data ?? [])];
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    [items[idx], items[j]] = [items[j], items[idx]];
    reorderMut.mutate(items.map((it, i) => ({ id: it.id, display_order: (i + 1) * 10 })));
  };

  // ---- Add form ----
  const [source, setSource] = useState<Source>("core");
  const [coreKey, setCoreKey] = useState<string>(CORE_FIELD_KEY_OPTIONS[0]?.key ?? "product_code");
  const [customId, setCustomId] = useState<string>("");
  const [priceCode, setPriceCode] = useState<string>("primary");
  const [columnLabel, setColumnLabel] = useState<string>("");

  const nextOrder = useMemo(
    () => (fieldsQ.data ? (fieldsQ.data.length + 1) * 10 : 10),
    [fieldsQ.data],
  );

  const addMut = useMutation({
    mutationFn: async () => {
      const base = {
        inventory_view_id: view.id,
        field_source: source,
        column_label: columnLabel.trim() || defaultLabel(),
        display_order: nextOrder,
        visible: true,
        sortable: false,
        filterable: false,
        searchable: false,
        mobile_visible: view.view_type.startsWith("mobile"),
      } as const;
      if (source === "core") {
        return addViewField({ ...base, core_field_key: coreKey });
      } else if (source === "custom") {
        if (!customId) throw new ServiceError("Chọn trường tuỳ chỉnh");
        return addViewField({ ...base, field_definition_id: customId });
      } else {
        return addViewField({ ...base, price_code: priceCode.trim() || "primary" });
      }
    },
    onSuccess: () => {
      invalidate();
      setColumnLabel("");
      toast.success("Đã thêm cột");
    },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Không thêm được"),
  });

  function defaultLabel() {
    if (source === "core") {
      return CORE_FIELD_KEY_OPTIONS.find((o) => o.key === coreKey)?.label ?? coreKey;
    }
    if (source === "custom") {
      return defsQ.data?.find((d) => d.id === customId)?.field_label ?? "Tuỳ chỉnh";
    }
    return priceCode === "primary" ? "Giá chính" : `Giá: ${priceCode}`;
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Cột hiển thị · {view.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add row */}
          <div className="rounded border p-3 space-y-3">
            <div className="text-sm font-medium">Thêm cột</div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <div className="space-y-1.5">
                <Label className="text-xs">Nguồn</Label>
                <Select value={source} onValueChange={(v) => setSource(v as Source)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="core">Trường lõi</SelectItem>
                    <SelectItem value="custom">Trường tuỳ chỉnh</SelectItem>
                    <SelectItem value="price">Giá</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {source === "core" && (
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs">Trường lõi</Label>
                  <Select value={coreKey} onValueChange={setCoreKey}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CORE_FIELD_KEY_OPTIONS.map((o) => (
                        <SelectItem key={o.key} value={o.key}>{o.label} · {o.key}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {source === "custom" && (
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs">Trường tuỳ chỉnh</Label>
                  <Select value={customId} onValueChange={setCustomId}>
                    <SelectTrigger><SelectValue placeholder="Chọn…" /></SelectTrigger>
                    <SelectContent>
                      {(defsQ.data ?? []).map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.field_label} · {d.field_key}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {source === "price" && (
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs">Mã giá (price_code)</Label>
                  <Input value={priceCode} onChange={(e) => setPriceCode(e.target.value)} placeholder="primary" />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Nhãn hiển thị</Label>
                <Input value={columnLabel} onChange={(e) => setColumnLabel(e.target.value)} placeholder="(mặc định)" />
              </div>
              <div className="flex items-end">
                <Button onClick={() => addMut.mutate()} disabled={addMut.isPending} className="w-full">
                  <Plus className="mr-1 h-4 w-4" /> Thêm
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">STT</TableHead>
                  <TableHead>Cột</TableHead>
                  <TableHead>Nguồn</TableHead>
                  <TableHead>Nhãn</TableHead>
                  <TableHead className="text-center">Hiện</TableHead>
                  <TableHead className="text-center">Sort</TableHead>
                  <TableHead className="text-center">Filter</TableHead>
                  <TableHead className="text-center">Search</TableHead>
                  <TableHead className="text-center">Mobile</TableHead>
                  <TableHead className="w-32 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(fieldsQ.data ?? []).map((f, idx) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {f.field_source === "core"
                        ? f.core_field_key
                        : f.field_source === "custom"
                          ? (defsQ.data?.find((d) => d.id === f.field_definition_id)?.field_key ?? f.field_definition_id)
                          : f.price_code}
                    </TableCell>
                    <TableCell><Badge variant="outline">{f.field_source}</Badge></TableCell>
                    <TableCell>
                      <Input
                        defaultValue={f.column_label}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== f.column_label) patchMut.mutate({ id: f.id, patch: { column_label: v } });
                        }}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={f.visible} onCheckedChange={(c) => patchMut.mutate({ id: f.id, patch: { visible: c } })} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={f.sortable} onCheckedChange={(c) => patchMut.mutate({ id: f.id, patch: { sortable: c } })} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={f.filterable} onCheckedChange={(c) => patchMut.mutate({ id: f.id, patch: { filterable: c } })} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={f.searchable} onCheckedChange={(c) => patchMut.mutate({ id: f.id, patch: { searchable: c } })} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={f.mobile_visible} onCheckedChange={(c) => patchMut.mutate({ id: f.id, patch: { mobile_visible: c } })} />
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => move(idx, -1)} disabled={idx === 0}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => move(idx, 1)} disabled={idx === (fieldsQ.data?.length ?? 0) - 1}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Xoá cột này?")) removeMut.mutate(f.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {fieldsQ.data && fieldsQ.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-6">
                      Chưa có cột nào. Thêm cột đầu tiên ở trên.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}