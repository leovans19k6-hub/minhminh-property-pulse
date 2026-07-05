import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ServiceError } from "@/services/_helpers";
import { cloneVoucher, slugify, validateVoucherSlug } from "@/services/admin/vouchers.service";

export function VoucherCloneDialog({
  voucherId, sourceTitle, sourceSlug, onClose, onDone,
}: { voucherId: string; sourceTitle: string; sourceSlug: string; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState(sourceTitle + " (Bản sao)");
  const [slug, setSlug] = useState(slugify(sourceSlug + "-copy"));
  const [code, setCode] = useState("");
  const slugErr = validateVoucherSlug(slug);
  const m = useMutation({
    mutationFn: () => cloneVoucher(voucherId, slug, code || null, title || null),
    onSuccess: () => { toast.success("Đã nhân bản"); onDone(); },
    onError: (e) => toast.error(e instanceof ServiceError ? e.message : String(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nhân bản voucher</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tiêu đề mới</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Slug mới</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} />
            {slugErr && <p className="text-xs text-destructive">{slugErr}</p>}
          </div>
          <div>
            <Label>Mã voucher (tuỳ chọn)</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="VOUCHER-2026" />
          </div>
          <p className="text-xs text-muted-foreground">
            Bản sao ở trạng thái Nháp. Không sao chép đăng ký. Sao chép quyền lợi, điều kiện, phạm vi áp dụng, ngày tháng, số lượng.
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