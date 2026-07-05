import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import type { Product } from "@/types/models";
import { StatusBadge } from "./StatusBadge";
import { formatVND } from "@/utils/format";
import { useFavorites } from "@/hooks/useFavorites";

export function ProductCard({ product, compact }: { product: Product; compact?: boolean }) {
  const { has, toggle } = useFavorites();
  const fav = has(product.id);
  const area = product.category === "apartment" ? product.netArea : product.landArea;
  const areaLabel = product.category === "apartment" ? "m² TT" : "m² đất";
  return (
    <Link
      to="/products/$productId"
      params={{ productId: product.id }}
      className={
        "block overflow-hidden rounded-2xl border border-border bg-card shadow-sm " +
        (compact ? "w-[240px] shrink-0" : "w-full")
      }
    >
      <div className="relative aspect-[4/3] bg-muted">
        <img
          src={product.images[0]}
          alt={product.code}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <div className="absolute left-2 top-2">
          <StatusBadge status={product.status} />
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggle(product.id);
          }}
          aria-label="Yêu thích"
          className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-background/90 shadow-sm"
        >
          <Heart
            className={"h-4 w-4 " + (fav ? "fill-rose-500 text-rose-500" : "text-foreground")}
          />
        </button>
      </div>
      <div className="space-y-1 p-3">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-bold tracking-tight text-[var(--brand-navy)]">
            {product.code}
          </p>
          <span className="text-xs text-muted-foreground">{product.type}</span>
        </div>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {product.projectName} · {product.subzone}
          {product.tower ? ` · ${product.tower}` : ""}
          {product.floor ? ` · T${product.floor}` : ""}
        </p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            {area} {areaLabel} · {product.direction ?? product.balconyDirection ?? "—"}
          </span>
          <span className="text-sm font-semibold text-[var(--brand-navy)]">
            {formatVND(product.price)}
          </span>
        </div>
      </div>
    </Link>
  );
}