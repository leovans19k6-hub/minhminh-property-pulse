import { Heart } from "lucide-react";
import type { MobileProductDetail } from "@/services/mobile/products.service";
import { ProductStatusBadge } from "./ProductStatusBadge";
import { cn } from "@/lib/utils";

interface Props {
  data: MobileProductDetail;
  isFavorite: boolean;
  favoritePending: boolean;
  onToggleFavorite: () => void;
}

export function ProductIdentityCard({
  data,
  isFavorite,
  favoritePending,
  onToggleFavorite,
}: Props) {
  const p = data.product;
  const context = [
    data.product_type?.name,
    data.zone?.name,
    data.building?.name,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <section className="rounded-2xl border border-border bg-[color:var(--surface)] p-4 shadow-[var(--shadow-xs)]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-[color:var(--text-tertiary)]">
            {data.project.name}
          </p>
          <h1 className="break-words text-[22px] font-bold leading-tight tracking-tight text-[color:var(--text-primary)]">
            {p.product_code}
          </h1>
          {p.product_name && p.product_name !== p.product_code && (
            <p className="text-sm text-[color:var(--text-secondary)]">{p.product_name}</p>
          )}
          {context && (
            <p className="text-xs text-[color:var(--text-tertiary)]">{context}</p>
          )}
          <div className="pt-1">
            <ProductStatusBadge status={p.status} />
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleFavorite}
          disabled={favoritePending}
          aria-label={isFavorite ? "Bỏ yêu thích" : "Yêu thích"}
          aria-pressed={isFavorite}
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border transition",
            "disabled:opacity-60",
            isFavorite ? "bg-[color:var(--danger-soft)]" : "bg-[color:var(--surface)]",
          )}
        >
          <Heart
            className={cn(
              "h-5 w-5",
              isFavorite
                ? "fill-[color:var(--danger)] text-[color:var(--danger)]"
                : "text-[color:var(--text-secondary)]",
            )}
          />
        </button>
      </div>
    </section>
  );
}