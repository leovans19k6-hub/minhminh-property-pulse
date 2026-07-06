import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { MobileVoucherDetail } from "@/services/mobile/vouchers.service";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  detail: MobileVoucherDetail;
  pending: boolean;
  onConfirm: () => void;
}

export function VoucherCancelRegistrationDialog({
  open,
  onOpenChange,
  detail,
  pending,
  onConfirm,
}: Props) {
  const v = detail.voucher;
  return (
    <Dialog open={open} onOpenChange={(o) => (!pending ? onOpenChange(o) : undefined)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Huỷ đăng ký voucher</DialogTitle>
          <DialogDescription>
            Bạn có chắc muốn huỷ đăng ký voucher này? Suất đăng ký sẽ được trả lại cho người khác.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-border bg-[color:var(--surface)] p-3 text-sm">
          <p className="font-semibold text-[color:var(--text-primary)]">{v.title}</p>
          {detail.project && (
            <p className="text-xs text-[color:var(--text-tertiary)]">{detail.project.name}</p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Quay lại
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Đang huỷ…" : "Huỷ đăng ký"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}