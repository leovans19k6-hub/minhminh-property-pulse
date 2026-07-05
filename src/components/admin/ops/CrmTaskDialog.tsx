import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEAD_PRIORITIES, LEAD_PRIORITY_LABELS } from "@/lib/registrationDomain";

export function CrmTaskDialog({
  open, onOpenChange, onSubmit, leadId, registrationId,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onSubmit: (v: { title: string; description?: string; priority: string; dueAt?: string; assignedTo?: string }) => Promise<void> | void;
  leadId?: string | null; registrationId?: string | null;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [dueAt, setDueAt] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [busy, setBusy] = useState(false);
  void leadId; void registrationId;
  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await onSubmit({ title: title.trim(), description: description || undefined, priority, dueAt: dueAt || undefined, assignedTo: assignedTo || undefined });
      setTitle(""); setDescription(""); setPriority("normal"); setDueAt(""); setAssignedTo("");
      onOpenChange(false);
    } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Tạo công việc</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Tiêu đề</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Mô tả</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ưu tiên</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{LEAD_PRIORITY_LABELS[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Hạn</Label><Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
          </div>
          <div><Label>Người thực hiện (ID)</Label><Input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="uuid (tùy chọn)" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={submit} disabled={busy || !title.trim()}>{busy ? "Đang tạo…" : "Tạo"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}