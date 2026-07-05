import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ServiceError } from "@/services/_helpers";
import { snapshotTemplateFromProject, validateTemplateCode } from "@/services/admin/inventoryTemplates.service";

export function SnapshotTemplateDialog({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string;
  onClose: () => void;
  onCreated?: (templateId: string) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      snapshotTemplateFromProject({
        projectId,
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || null,
        projectCategory: category.trim() || null,
      }),
    onSuccess: (id) => {
      toast.success("Đã tạo template từ dự án");
      onCreated?.(id);
      onClose();
    },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lỗi"),
  });

  const codeErr = code ? validateTemplateCode(code) : null;

  return (
    <Dialog open onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Chụp template từ dự án</DialogTitle>
          <DialogDescription>Chỉ super_admin/admin. Sao chép trường & view active của dự án thành template mới.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Tên template</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Chung cư cao tầng chuẩn" />
          </div>
          <div className="space-y-1">
            <Label>Mã code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="apartment_standard" />
            {codeErr ? <p className="text-xs text-destructive">{codeErr}</p> : null}
          </div>
          <div className="space-y-1">
            <Label>Nhóm dự án (tuỳ chọn)</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="apartment / villa / land / shophouse" />
          </div>
          <div className="space-y-1">
            <Label>Mô tả</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={!name.trim() || !code.trim() || !!codeErr || mut.isPending}
          >
            {mut.isPending ? "Đang tạo…" : "Tạo template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}