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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { MobileEventDetail } from "@/services/mobile/events.service";
import { formatDateTime } from "@/utils/format";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  detail: MobileEventDetail;
  pending: boolean;
  onConfirm: (note: string | null) => void;
}

export function EventRegistrationDialog({ open, onOpenChange, detail, pending, onConfirm }: Props) {
  const [ack, setAck] = useState(false);
  const [note, setNote] = useState("");
  const e = detail.event;
  const eligible = detail.eligibility.eligible;
  const isTour = e.event_type === "site_tour";
  return (
    <Dialog open={open} onOpenChange={(o) => (!pending ? onOpenChange(o) : undefined)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isTour ? "Xác nhận đăng ký Site Tour" : "Xác nhận đăng ký sự kiện"}</DialogTitle>
          <DialogDescription>Vui lòng kiểm tra thông tin trước khi đăng ký.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="rounded-xl border border-border bg-[color:var(--surface)] p-3">
            <p className="font-semibold text-[color:var(--text-primary)]">{e.title}</p>
            {detail.project && (
              <p className="text-xs text-[color:var(--text-tertiary)]">{detail.project.name}</p>
            )}
          </div>
          <ul className="space-y-1 text-[13px] text-[color:var(--text-secondary)]">
            {e.start_at && <li>Thời gian: {formatDateTime(e.start_at)}</li>}
            {e.location_name && <li>Địa điểm: {e.location_name}</li>}
            {e.registration_deadline && (
              <li>Hạn đăng ký: {formatDateTime(e.registration_deadline)}</li>
            )}
            {!e.is_unlimited && e.capacity_remaining != null && (
              <li>Số suất còn: {e.capacity_remaining}</li>
            )}
          </ul>
          <div className="space-y-1">
            <Label htmlFor="event-note" className="text-[12.5px]">
              Ghi chú (tuỳ chọn)
            </Label>
            <Textarea
              id="event-note"
              value={note}
              onChange={(ev) => setNote(ev.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Yêu cầu đặc biệt, số lượng khách..."
            />
          </div>
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
              onChange={(ev) => setAck(ev.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[color:var(--brand-navy)]"
            />
            Tôi xác nhận thông tin cá nhân đã cập nhật đúng và đồng ý tham dự sự kiện.
          </label>
        )}
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Để sau
          </Button>
          <Button
            type="button"
            disabled={!eligible || !ack || pending}
            onClick={() => onConfirm(note.trim() || null)}
          >
            {pending ? "Đang đăng ký…" : isTour ? "Đăng ký Site Tour" : "Đăng ký sự kiện"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}