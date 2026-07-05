import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { UserPlus, Ticket, MapPinned, PartyPopper } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { projects, products } from "@/features/mock/data";
import type { RegistrationType } from "@/types/models";

const searchSchema = z.object({
  type: z.enum(["consult", "voucher", "sitetour", "event"]).optional(),
  projectId: z.string().optional(),
  productId: z.string().optional(),
  voucherId: z.string().optional(),
  eventId: z.string().optional(),
});

export const Route = createFileRoute("/register")({
  validateSearch: searchSchema,
  component: RegisterPage,
  head: () => ({
    meta: [
      { title: "Đăng ký — Minh Minh Sales Hub" },
      {
        name: "description",
        content: "Đăng ký tư vấn, voucher, site tour và sự kiện cho khách hàng.",
      },
    ],
  }),
});

const typeMeta: Record<
  RegistrationType,
  { label: string; icon: typeof UserPlus; hint: string }
> = {
  consult: { label: "Đăng ký tư vấn", icon: UserPlus, hint: "KH cần chuyên viên gọi lại." },
  voucher: { label: "Đăng ký Voucher", icon: Ticket, hint: "Giữ voucher cho khách hàng." },
  sitetour: { label: "Đăng ký Site Tour", icon: MapPinned, hint: "Đăng ký lịch tham quan dự án." },
  event: { label: "Đăng ký Sự kiện", icon: PartyPopper, hint: "Đăng ký khách tham dự sự kiện." },
};

function RegisterPage() {
  const search = Route.useSearch();
  const [type, setType] = useState<RegistrationType>(search.type ?? "consult");
  const [projectId, setProjectId] = useState<string | undefined>(search.projectId);
  const [productId, setProductId] = useState<string | undefined>(search.productId);
  const [submitting, setSubmitting] = useState(false);

  const productOptions = products.filter((p) => !projectId || p.projectId === projectId);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success("Đã gửi đăng ký", {
        description: "Chúng tôi sẽ xử lý trong thời gian sớm nhất.",
      });
      (e.target as HTMLFormElement).reset();
    }, 600);
  };

  return (
    <MobileShell title="Đăng ký">
      <div className="space-y-4 p-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Loại đăng ký</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(Object.keys(typeMeta) as RegistrationType[]).map((k) => {
              const M = typeMeta[k];
              const active = type === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setType(k)}
                  className={
                    "flex items-center gap-2 rounded-2xl border p-3 text-left " +
                    (active
                      ? "border-[var(--brand-navy)] bg-[var(--brand-navy)]/5"
                      : "border-border bg-card")
                  }
                >
                  <span
                    className={
                      "grid h-9 w-9 place-items-center rounded-xl " +
                      (active
                        ? "bg-[var(--brand-navy)] text-primary-foreground"
                        : "bg-muted text-foreground")
                    }
                  >
                    <M.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{M.label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {M.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Họ tên khách hàng</Label>
            <Input id="name" name="name" required placeholder="VD: Nguyễn Văn A" className="h-11" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input id="phone" name="phone" required type="tel" placeholder="09xx xxx xxx" className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="email@..." className="h-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Dự án quan tâm</Label>
            <Select value={projectId} onValueChange={(v) => setProjectId(v)}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Chọn dự án" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Sản phẩm quan tâm</Label>
            <Select value={productId} onValueChange={(v) => setProductId(v)}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Chọn sản phẩm (tuỳ chọn)" />
              </SelectTrigger>
              <SelectContent>
                {productOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code} — {p.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea id="note" name="note" rows={3} placeholder="Nhu cầu, khung giờ liên hệ..." />
          </div>
          <Button
            type="submit"
            className="h-12 w-full bg-[var(--brand-navy)] text-primary-foreground"
            disabled={submitting}
          >
            {submitting ? "Đang gửi..." : "Gửi đăng ký"}
          </Button>
        </form>
      </div>
    </MobileShell>
  );
}