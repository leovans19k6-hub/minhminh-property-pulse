import { Copy, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import type { MobilePrimaryContact } from "@/services/mobile/products.service";
import { SectionCard } from "@/components/mobile/SectionCard";

interface Props {
  contact: MobilePrimaryContact;
  title?: string;
}

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1] ?? "";
  return (last[0] ?? "?").toUpperCase();
}

export function PrimaryContactCard({ contact: c, title = "Phụ trách kinh doanh" }: Props) {
  const phoneDigits = c.phone?.replace(/\s/g, "") ?? "";
  const meta = [c.position, c.branch, c.department].filter(Boolean).join(" · ");

  const copy = async () => {
    if (!c.phone) return;
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(c.phone);
      else throw new Error("no-clipboard");
      toast.success("Đã sao chép số điện thoại");
    } catch {
      toast.error("Không thể sao chép. Vui lòng thử lại.");
    }
  };

  return (
    <SectionCard title={title}>
      <div className="flex items-start gap-3">
        {c.avatar_url ? (
          <img
            src={c.avatar_url}
            alt={c.full_name ?? ""}
            className="h-12 w-12 shrink-0 rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[color:var(--brand-navy-soft)] text-sm font-bold text-[color:var(--brand-navy)]">
            {initials(c.full_name)}
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-sm font-semibold text-[color:var(--text-primary)]">
            {c.full_name ?? "Chưa cập nhật"}
          </p>
          {meta && (
            <p className="truncate text-[11px] text-[color:var(--text-tertiary)]">{meta}</p>
          )}
          {c.phone && (
            <p className="text-xs font-medium tabular-nums text-[color:var(--text-secondary)]">
              {c.phone}
            </p>
          )}
        </div>
      </div>
      {(c.phone || c.zalo_url) && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {c.phone ? (
            <a
              href={`tel:${phoneDigits}`}
              aria-label="Gọi điện"
              className="grid h-11 place-items-center rounded-xl bg-[color:var(--brand-navy)] text-xs font-semibold text-white"
            >
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-4 w-4" />
                Gọi
              </span>
            </a>
          ) : (
            <div />
          )}
          {c.phone ? (
            <button
              type="button"
              onClick={copy}
              aria-label="Sao chép số điện thoại"
              className="grid h-11 place-items-center rounded-xl border border-border bg-[color:var(--surface)] text-xs font-semibold text-[color:var(--text-primary)]"
            >
              <span className="inline-flex items-center gap-1.5">
                <Copy className="h-4 w-4" />
                Sao chép
              </span>
            </button>
          ) : (
            <div />
          )}
          {c.zalo_url ? (
            <a
              href={c.zalo_url}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Mở Zalo"
              className="grid h-11 place-items-center rounded-xl border border-border bg-[color:var(--surface)] text-xs font-semibold text-[color:var(--brand-navy)]"
            >
              <span className="inline-flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4" />
                Zalo
              </span>
            </a>
          ) : (
            <div />
          )}
        </div>
      )}
    </SectionCard>
  );
}