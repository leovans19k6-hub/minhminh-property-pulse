import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ServiceError } from "@/services/_helpers";
import { cloneEvent, slugify, validateEventSlug } from "@/services/admin/events.service";

export function EventCloneDialog({
  eventId, sourceTitle, sourceSlug, onClose, onDone,
}: { eventId: string; sourceTitle: string; sourceSlug: string; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState(sourceTitle + " (Bản sao)");
  const [slug, setSlug] = useState(slugify(sourceSlug + "-copy"));
  const [shift, setShift] = useState("");
  const slugErr = validateEventSlug(slug);
  const m = useMutation({
    mutationFn: () => cloneEvent(eventId, slug, title || null, shift ? new Date(shift).toISOString() : null),
    onSuccess: () => { toast.success("Đã nhân bản"); onDone(); },
    onError: (e) => toast.error(e instanceof ServiceError ? e.message : String(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nhân bản sự kiện</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Tiêu đề mới</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Slug mới</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} />
            {slugErr && <p className="text-xs text-destructive">{slugErr}</p>}</div>
          <div><Label>Dời thời gian bắt đầu (tuỳ chọn)</Label>
            <Input type="datetime-local" value={shift} onChange={(e) => setShift(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Nếu điền, phiên và thời gian kết thúc dời cùng khoảng.</p></div>
          <p className="text-xs text-muted-foreground">
            Bản sao ở trạng thái Nháp. Không sao chép đăng ký, không sao chép cửa sổ đăng ký.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button disabled={!!slugErr || m.isPending} onClick={() => m.mutate()}>Nhân bản</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}