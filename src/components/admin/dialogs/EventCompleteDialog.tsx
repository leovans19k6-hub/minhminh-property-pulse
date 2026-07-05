import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ServiceError } from "@/services/_helpers";
import { completeEvent } from "@/services/admin/events.service";

export function EventCompleteDialog({ eventId, onClose, onDone }: { eventId: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const m = useMutation({
    mutationFn: () => completeEvent(eventId, reason || null),
    onSuccess: () => { toast.success("Đã kết thúc sự kiện"); onDone(); },
    onError: (e) => toast.error(e instanceof ServiceError ? e.message : String(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Kết thúc sự kiện</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Chỉ áp dụng khi thời gian kết thúc đã qua.</p>
          <div><Label>Ghi chú (tuỳ chọn)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          <Button disabled={m.isPending} onClick={() => m.mutate()}>Kết thúc</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}