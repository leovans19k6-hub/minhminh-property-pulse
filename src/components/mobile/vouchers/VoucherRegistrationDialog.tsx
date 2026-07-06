import { useState } from "react";
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
import { formatDate } from "@/utils/format";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  detail: MobileVoucherDetail;
  contextProductCode?: string | null;
  contextPolicyTitle?: string | null;
  pending: boolean;
  onConfirm: () => void;
}

export function VoucherRegistrationDialog({
  open,
  onOpenChange,
  detail,
  contextProductCode,
  contextPolicyTitle,
  pending,
  onConfirm,
}: Props) {
  const [ack, setAck] = useState(false);
  const v = detail.voucher;
  const eligible = detail.eligibility.eligible;
  return (
    <Dialog open={open} onOpenChange={(o) => (!pending ? onOpenChange(o) : undefined)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Xác nhận đăng ký voucher</DialogTitle>
          <DialogDescription>
            Vui lòng kiểm tra thông tin trước khi đăng ký.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="rounded-xl border border-border bg-[color:var(--surface)] p-3">
            <p className="font-semibold text-[color:var(--text-primary)]">{v.title}</p>
            {detail.project && (
              <p className="text-xs text-[color:var(--text-tertiary)]">{detail.project.name}</p>
            )}
          </div>
          <ul className="space-y-1 text-[13px] text-[color:var(--text-secondary)]">
            {v.registration_deadline && (
              <li>Hạn đăng ký: {formatDate(v.registration_deadline)}</li>
            )}
            {!v.is_unlimited && v.capacity_remaining != null && (
              <li>Số lượng còn: {v.capacity_remaining} suất</li>
            )}
            {v.per_user_limit > 1 && (
              <li>Giới hạn cá nhân: {v.per_user_limit} lượt</li>
            )}
            {contextProductCode && <li>Sản phẩm: {contextProductCode}</li>}
            {contextPolicyTitle && <li>Chính sách: {contextPolicyTitle}</li>}
          </ul>
        </div>
        {!eligible && (
          <p className="rounded-lg bg-[color:var(--danger-soft,#fee2e2)] px-3 py-2 text-[13px] text-[color:var(--danger,#991b1b)]">
            {detail.eligibility.message ?? "Bạn hiện không đủ điều kiện đăng ký."}
          </p>
        )}
        {eligible && (
          <label className="flex items-start gap-2 text-[12.5px] text-[color:var(--text-secondary)]">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[color:var(--brand-navy)]"
            />
            Tôi xác nhận thông tin cá nhân đã được cập nhật đúng và đồng ý đăng ký voucher.
          </label>
        )}
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Để sau
          </Button>
          <Button
            type="button"
            disabled={!eligible || !ack || pending}
            onClick={onConfirm}
          >
            {pending ? "Đang đăng ký…" : "Đăng ký voucher"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}