import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, ArrowUp, ArrowDown, Trash2, Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { queryKeys } from "@/lib/queryKeys";
import { EmptyState, ErrorState } from "@/components/admin/EmptyState";
import { ServiceError } from "@/services/_helpers";
import {
  listFieldOptions,
  createFieldOption,
  updateFieldOption,
  setOptionStatus,
  reorderFieldOptions,
  validateOptionValue,
  type FieldOptionRow,
} from "@/services/admin/fieldOptions.service";

export function FieldOptionsDialog({
  fieldId, fieldLabel, onClose,
}: {
  fieldId: string;
  fieldLabel: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [includeArchived, setIncludeArchived] = useState(false);
  const key = queryKeys.adminProductFieldOptions(fieldId);

  const q = useQuery({
    queryKey: [...key, { includeArchived }],
    queryFn: () => listFieldOptions(fieldId, includeArchived),
  });

  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const addMut = useMutation({
    mutationFn: async () => {
      const err = validateOptionValue(newValue);
      if (err) throw new ServiceError(err);
      const nextOrder = ((q.data ?? []).at(-1)?.display_order ?? 0) + 10;
      await createFieldOption({
        field_definition_id: fieldId,
        option_value: newValue.trim(),
        option_label: newLabel.trim() || newValue.trim(),
        display_order: nextOrder,
        metadata: newColor ? ({ color: newColor } as unknown as never) : ({} as unknown as never),
      });
    },
    onSuccess: () => {
      toast.success("Đã thêm lựa chọn");
      setNewValue(""); setNewLabel(""); setNewColor("");
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Thêm thất bại"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "archived" }) => setOptionStatus(id, status),
    onSuccess: () => { invalidate(); toast.success("Đã cập nhật"); },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lỗi"),
  });

  const reorderMut = useMutation({
    mutationFn: (items: Array<{ id: string; display_order: number }>) => reorderFieldOptions(items),
    onSuccess: () => invalidate(),
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Không đổi thứ tự được"),
  });

  const move = (idx: number, dir: -1 | 1) => {
    const items = [...(q.data ?? [])];
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    [items[idx], items[j]] = [items[j], items[idx]];
    reorderMut.mutate(items.map((it, i) => ({ id: it.id, display_order: (i + 1) * 10 })));
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lựa chọn cho: {fieldLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_1fr_120px_auto] items-end gap-2 rounded-md border p-3">
            <div className="space-y-1">
              <Label className="text-xs">Value (mã)</Label>
              <Input value={newValue} onChange={(e) => setNewValue(e.target.value.toLowerCase())} placeholder="dong_nam" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nhãn hiển thị</Label>
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Đông Nam" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Màu (hex)</Label>
              <Input value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="#22c55e" />
            </div>
            <Button size="sm" onClick={() => addMut.mutate()} disabled={addMut.isPending || !newValue.trim()}>
              <Plus className="mr-1 h-4 w-4" /> Thêm
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={includeArchived} onCheckedChange={setIncludeArchived} />
              Xem cả lưu trữ
            </label>
            <p className="text-xs text-muted-foreground">Tổng: {(q.data ?? []).length}</p>
          </div>

          {q.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : q.error ? (
            <ErrorState message="Không tải được." onRetry={() => q.refetch()} />
          ) : (q.data ?? []).length === 0 ? (
            <EmptyState title="Chưa có lựa chọn nào" />
          ) : (
            <div className="rounded-md border">
              {(q.data ?? []).map((opt, idx) => (
                <OptionRow
                  key={opt.id}
                  option={opt}
                  isFirst={idx === 0}
                  isLast={idx === (q.data?.length ?? 0) - 1}
                  onMoveUp={() => move(idx, -1)}
                  onMoveDown={() => move(idx, 1)}
                  onArchive={() => statusMut.mutate({ id: opt.id, status: "archived" })}
                  onRestore={() => statusMut.mutate({ id: opt.id, status: "active" })}
                  onSaved={invalidate}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OptionRow({
  option, isFirst, isLast, onMoveUp, onMoveDown, onArchive, onRestore, onSaved,
}: {
  option: FieldOptionRow;
  isFirst: boolean; isLast: boolean;
  onMoveUp: () => void; onMoveDown: () => void;
  onArchive: () => void; onRestore: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(option.option_label);
  const [dirty, setDirty] = useState(false);
  const color = (option.metadata as { color?: string } | null)?.color;

  const mut = useMutation({
    mutationFn: () => updateFieldOption(option.id, { option_label: label.trim() }),
    onSuccess: () => { toast.success("Đã lưu"); setDirty(false); onSaved(); },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lưu thất bại"),
  });

  return (
    <div className={`flex items-center gap-2 border-b px-3 py-2 last:border-b-0 ${option.status === "archived" ? "opacity-50" : ""}`}>
      <div className="flex flex-col">
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onMoveUp} disabled={isFirst}><ArrowUp className="h-3 w-3" /></Button>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onMoveDown} disabled={isLast}><ArrowDown className="h-3 w-3" /></Button>
      </div>
      <code className="rounded bg-muted px-2 py-1 text-xs">{option.option_value}</code>
      <Input
        value={label}
        onChange={(e) => { setLabel(e.target.value); setDirty(true); }}
        className="max-w-xs"
      />
      {color ? (
        <span className="inline-block h-4 w-4 rounded border" style={{ backgroundColor: color }} title={color} />
      ) : null}
      {option.status === "archived" ? <Badge variant="secondary">Lưu trữ</Badge> : null}
      <div className="ml-auto flex gap-1">
        {dirty ? (
          <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>Lưu</Button>
        ) : null}
        {option.status === "active" ? (
          <Button size="icon" variant="ghost" onClick={onArchive} title="Lưu trữ"><Archive className="h-4 w-4" /></Button>
        ) : (
          <Button size="icon" variant="ghost" onClick={onRestore} title="Khôi phục"><RotateCcw className="h-4 w-4" /></Button>
        )}
      </div>
    </div>
  );
}

// unused
void Trash2;
