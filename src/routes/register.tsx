import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Loader2, PartyPopper, Ticket, MapPinned, UserPlus } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { registerForVoucher } from "@/services/vouchers.service";
import { registerForEvent } from "@/services/events.service";
import { RegisterUnavailableState } from "@/components/mobile/register/RegisterUnavailableState";
import { RegisterSuccessState } from "@/components/mobile/register/RegisterSuccessState";

const searchSchema = z.object({
  type: z.enum(["voucher", "event", "site_tour", "consultation"]).optional(),
  projectId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  productTypeId: z.string().uuid().optional(),
  policyId: z.string().uuid().optional(),
  voucherId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/register")({
  validateSearch: searchSchema,
  component: RegisterPage,
  head: () => ({
    meta: [
      { title: "Đăng ký — Minh Minh Sales Hub" },
      {
        name: "description",
        content: "Đăng ký voucher, sự kiện và site tour cho khách hàng.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type SuccessData = { code: string | null; title: string; description?: string };

function RegisterPage() {
  const search = Route.useSearch();
  const [note, setNote] = useState("");
  const [success, setSuccess] = useState<SuccessData | null>(null);

  const voucherMut = useMutation({
    mutationFn: (payload: { voucherId: string; note: string | null }) =>
      registerForVoucher(payload.voucherId, {
        productId: search.productId ?? null,
        productTypeId: search.productTypeId ?? null,
        policyId: search.policyId ?? null,
        note: payload.note,
      }),
    onSuccess: (data) => {
      setSuccess({
        code: data.registration_code,
        title: "Đã đăng ký voucher thành công",
        description: "Chúng tôi sẽ liên hệ xác nhận trong thời gian sớm nhất.",
      });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Không thể đăng ký voucher."),
  });

  const eventMut = useMutation({
    mutationFn: (payload: { eventId: string; note: string | null }) =>
      registerForEvent(payload.eventId, {
        productId: search.productId ?? null,
        productTypeId: search.productTypeId ?? null,
        policyId: search.policyId ?? null,
        voucherId: search.voucherId ?? null,
        note: payload.note,
      }),
    onSuccess: (data) => {
      setSuccess({
        code: data.registration_code,
        title:
          data.event_type === "site_tour"
            ? "Đã đăng ký Site Tour thành công"
            : "Đã đăng ký sự kiện thành công",
        description: "Vui lòng theo dõi thông báo để nhận cập nhật.",
      });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Không thể đăng ký sự kiện."),
  });

  if (success) {
    return (
      <MobileShell title="Đăng ký">
        <RegisterSuccessState
          title={success.title}
          description={success.description}
          registrationCode={success.code}
        />
      </MobileShell>
    );
  }

  // Consultation is not yet available on mobile — no canonical mobile RPC.
  if (search.type === "consultation") {
    return (
      <MobileShell title="Đăng ký tư vấn">
        <RegisterUnavailableState
          title="Đăng ký tư vấn chưa sẵn sàng"
          description="Luồng đăng ký tư vấn sẽ được kích hoạt khi API mobile chuyên dụng hoàn tất."
        />
      </MobileShell>
    );
  }

  if (search.type === "voucher" && search.voucherId) {
    return (
      <VoucherRegisterForm
        voucherId={search.voucherId}
        note={note}
        setNote={setNote}
        pending={voucherMut.isPending}
        onSubmit={(n) => voucherMut.mutate({ voucherId: search.voucherId!, note: n || null })}
      />
    );
  }

  if ((search.type === "event" || search.type === "site_tour") && search.eventId) {
    return (
      <EventRegisterForm
        eventId={search.eventId}
        kind={search.type}
        note={note}
        setNote={setNote}
        pending={eventMut.isPending}
        onSubmit={(n) => eventMut.mutate({ eventId: search.eventId!, note: n || null })}
      />
    );
  }

  // Missing/invalid intent.
  return (
    <MobileShell title="Đăng ký">
      <RegisterUnavailableState
        title="Liên kết đăng ký không hợp lệ"
        description="Vui lòng mở đăng ký từ sản phẩm, voucher hoặc sự kiện cụ thể."
      />

      <div className="px-4 pb-4">
        <div className="rounded-2xl border border-border bg-[color:var(--surface)] p-4">
          <p className="text-[13px] font-semibold text-[color:var(--text-primary)]">
            Các loại đăng ký hiện có
          </p>
          <ul className="mt-2 space-y-2 text-[12.5px] text-[color:var(--text-secondary)]">
            <IntentHint icon={Ticket} label="Voucher" hint="Mở từ trang voucher cụ thể" />
            <IntentHint icon={PartyPopper} label="Sự kiện" hint="Mở từ trang sự kiện cụ thể" />
            <IntentHint icon={MapPinned} label="Site tour" hint="Mở từ sự kiện tham quan" />
            <IntentHint icon={UserPlus} label="Tư vấn" hint="Chưa mở trên bản mobile" />
          </ul>
        </div>
      </div>
    </MobileShell>
  );
}

function IntentHint({
  icon: Icon,
  label,
  hint,
}: {
  icon: typeof Ticket;
  label: string;
  hint: string;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[color:var(--brand-navy-soft)] text-[color:var(--brand-navy)]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-[color:var(--text-primary)]">{label}</span>
        <span className="block text-[11px] text-[color:var(--text-tertiary)]">{hint}</span>
      </span>
    </li>
  );
}

function VoucherRegisterForm({
  voucherId,
  note,
  setNote,
  pending,
  onSubmit,
}: {
  voucherId: string;
  note: string;
  setNote: (v: string) => void;
  pending: boolean;
  onSubmit: (note: string) => void;
}) {
  return (
    <MobileShell title="Đăng ký voucher">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(note.trim());
        }}
        className="space-y-4 p-4"
      >
        <div className="rounded-2xl border border-border bg-[color:var(--surface)] p-4">
          <div className="flex items-center gap-2 text-[color:var(--brand-navy)]">
            <Ticket className="h-4 w-4" />
            <p className="text-[13px] font-semibold">Đăng ký voucher</p>
          </div>
          <p className="mt-1 text-[11.5px] text-[color:var(--text-tertiary)]">
            Voucher ID: <span className="font-mono">{voucherId.slice(0, 8)}…</span>
          </p>
        </div>

        <div className="space-y-2 rounded-2xl border border-border bg-[color:var(--surface)] p-4">
          <Label htmlFor="note" className="text-[12.5px]">Ghi chú (tuỳ chọn)</Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Nhu cầu, khung giờ liên hệ..."
            maxLength={500}
          />
          <p className="text-[10.5px] text-[color:var(--text-tertiary)]">
            Thông tin cá nhân được lấy từ hồ sơ tài khoản.
          </p>
        </div>

        <SubmitButton pending={pending} label="Đăng ký voucher" />
      </form>
    </MobileShell>
  );
}

function EventRegisterForm({
  eventId,
  kind,
  note,
  setNote,
  pending,
  onSubmit,
}: {
  eventId: string;
  kind: "event" | "site_tour";
  note: string;
  setNote: (v: string) => void;
  pending: boolean;
  onSubmit: (note: string) => void;
}) {
  const isTour = kind === "site_tour";
  const Icon = isTour ? MapPinned : PartyPopper;
  return (
    <MobileShell title={isTour ? "Đăng ký Site Tour" : "Đăng ký sự kiện"}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(note.trim());
        }}
        className="space-y-4 p-4"
      >
        <div className="rounded-2xl border border-border bg-[color:var(--surface)] p-4">
          <div className="flex items-center gap-2 text-[color:var(--brand-navy)]">
            <Icon className="h-4 w-4" />
            <p className="text-[13px] font-semibold">
              {isTour ? "Đăng ký tham quan dự án" : "Đăng ký tham dự sự kiện"}
            </p>
          </div>
          <p className="mt-1 text-[11.5px] text-[color:var(--text-tertiary)]">
            Event ID: <span className="font-mono">{eventId.slice(0, 8)}…</span>
          </p>
        </div>

        <div className="space-y-2 rounded-2xl border border-border bg-[color:var(--surface)] p-4">
          <Label htmlFor="note" className="text-[12.5px]">Ghi chú (tuỳ chọn)</Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Số lượng khách, yêu cầu đặc biệt..."
            maxLength={500}
          />
          <p className="text-[10.5px] text-[color:var(--text-tertiary)]">
            Thông tin cá nhân được lấy từ hồ sơ tài khoản.
          </p>
        </div>

        <SubmitButton
          pending={pending}
          label={isTour ? "Đăng ký Site Tour" : "Đăng ký sự kiện"}
        />
      </form>
    </MobileShell>
  );
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <Button
      type="submit"
      className="h-12 w-full rounded-xl bg-[color:var(--brand-navy)] text-[color:var(--primary-foreground)]"
      disabled={pending}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang gửi...
        </span>
      ) : (
        label
      )}
    </Button>
  );
}