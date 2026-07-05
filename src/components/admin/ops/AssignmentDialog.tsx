import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function AssignmentDialog({
  open, onOpenChange, currentAssignee, onAssign, title = "Phân công",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentAssignee?: string | null;
  onAssign: (userId: string | null) => Promise<void> | void;
  title?: string;
}) {
  const [value, setValue] = useState(currentAssignee ?? "");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await onAssign(value.trim() === "" ? null : value.trim());
      onOpenChange(false);
    } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>ID người dùng (để trống = bỏ phân công)</Label>
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="uuid" />
          <p className="text-xs text-muted-foreground">Dán ID người dùng đang hoạt động thuộc dự án.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Đang lưu…" : "Xác nhận"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}