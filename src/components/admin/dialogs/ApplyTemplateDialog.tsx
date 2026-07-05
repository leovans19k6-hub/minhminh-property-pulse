import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/queryKeys";
import { ServiceError } from "@/services/_helpers";
import { listTemplates, applyTemplate } from "@/services/admin/inventoryTemplates.service";

export function ApplyTemplateDialog({
  projectId,
  onClose,
  onApplied,
}: {
  projectId: string;
  onClose: () => void;
  onApplied?: () => void;
}) {
  const qc = useQueryClient();
  const [templateId, setTemplateId] = useState<string>("");
  const [includeFields, setIncludeFields] = useState(true);
  const [includeViews, setIncludeViews] = useState(true);
  const [overwrite, setOverwrite] = useState(false);

  const listQ = useQuery({
    queryKey: queryKeys.adminInventoryTemplates(),
    queryFn: () => listTemplates(),
  });

  const mut = useMutation({
    mutationFn: () =>
      applyTemplate(templateId, projectId, { overwrite, includeFields, includeViews }),
    onSuccess: (res) => {
      toast.success(
        `Đã áp dụng: fields +${res.fields_created}/~${res.fields_updated}/skip ${res.fields_skipped} · views +${res.views_created}/~${res.views_updated}/skip ${res.views_skipped}`,
      );
      qc.invalidateQueries({ queryKey: ["admin", "projects", projectId] });
      onApplied?.();
      onClose();
    },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lỗi"),
  });

  return (
    <Dialog open onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Áp dụng template</DialogTitle>
          <DialogDescription>Sao chép fields và views từ template vào dự án.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Template</Label>
            {listQ.isLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder="Chọn template…" /></SelectTrigger>
                <SelectContent>
                  {(listQ.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} <span className="text-muted-foreground">({t.code})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Label className="cursor-pointer" htmlFor="incl-fields">Sao chép trường tuỳ chỉnh</Label>
            <Switch id="incl-fields" checked={includeFields} onCheckedChange={setIncludeFields} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="cursor-pointer" htmlFor="incl-views">Sao chép bảng hiển thị</Label>
            <Switch id="incl-views" checked={includeViews} onCheckedChange={setIncludeViews} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="cursor-pointer" htmlFor="ov">Ghi đè nếu trùng key/code</Label>
            <Switch id="ov" checked={overwrite} onCheckedChange={setOverwrite} />
          </div>
          <p className="text-xs text-muted-foreground">
            Idempotent theo <code>field_key</code> và <code>view code</code>. Không xoá dữ liệu products.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={!templateId || mut.isPending || (!includeFields && !includeViews)}
          >
            {mut.isPending ? "Đang áp dụng…" : "Áp dụng"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}