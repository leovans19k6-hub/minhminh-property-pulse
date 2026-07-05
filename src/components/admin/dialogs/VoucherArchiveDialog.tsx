import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ServiceError } from "@/services/_helpers";
import { archiveVoucher } from "@/services/admin/vouchers.service";

export function VoucherArchiveDialog({ voucherId, onClose, onDone }: { voucherId: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const m = useMutation({
    mutationFn: () => archiveVoucher(voucherId, reason || null),
    onSuccess: () => { toast.success("Đã lưu trữ voucher"); onDone(); },
    onError: (e) => toast.error(e instanceof ServiceError ? e.message : String(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Lưu trữ voucher</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-amber-600">Voucher đã lưu trữ sẽ không nhận thêm đăng ký. Các đăng ký hiện có vẫn được giữ.</p>
          <div>
            <Label>Lý do (tuỳ chọn)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button variant="destructive" disabled={m.isPending} onClick={() => m.mutate()}>Lưu trữ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}