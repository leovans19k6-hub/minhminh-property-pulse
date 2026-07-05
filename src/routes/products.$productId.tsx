import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Heart, Share2, Phone, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/mobile/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ProductCard } from "@/components/shared/ProductCard";
import {
  getProduct,
  getProject,
  productsByProject,
  policiesByProject,
  vouchersByProject,
} from "@/features/mock/data";
import { formatVND, formatDate } from "@/utils/format";
import { useFavorites } from "@/hooks/useFavorites";

export const Route = createFileRoute("/products/$productId")({
  loader: ({ params }) => {
    const product = getProduct(params.productId);
    if (!product) throw notFound();
    return { product };
  },
  component: ProductDetailPage,
  notFoundComponent: () => (
    <div className="p-6 text-sm text-muted-foreground">Không tìm thấy sản phẩm.</div>
  ),
  errorComponent: () => (
    <div className="p-6 text-sm text-muted-foreground">Có lỗi khi tải sản phẩm.</div>
  ),
});

function ProductDetailPage() {
  const { product } = Route.useLoaderData();
  const project = getProject(product.projectId);
  const related = productsByProject(product.projectId).filter((p) => p.id !== product.id);
  const pol = policiesByProject(product.projectId);
  const vs = vouchersByProject(product.projectId);
  const { has, toggle } = useFavorites();
  const fav = has(product.id);

  const specs =
    product.category === "apartment"
      ? [
          ["Tầng", product.floor ?? "—"],
          ["Loại căn", product.type],
          ["DT thông thuỷ", `${product.netArea ?? "—"} m²`],
          ["DT tim tường", `${product.grossArea ?? "—"} m²`],
          ["Hướng cửa", product.doorDirection ?? "—"],
          ["Hướng ban công", product.balconyDirection ?? "—"],
          ["View", product.view ?? "—"],
          ["Phòng ngủ", product.bedrooms ?? "—"],
          ["Phòng tắm", product.bathrooms ?? "—"],
        ]
      : [
          ["DT đất", `${product.landArea ?? "—"} m²`],
          ["DT xây dựng", `${product.buildingArea ?? "—"} m²`],
          ["Mặt tiền", `${product.frontage ?? "—"} m`],
          ["Số tầng", product.floors ?? "—"],
          ["Hướng", product.direction ?? "—"],
          ["Tình trạng", product.constructionStatus ?? "—"],
        ];

  return (
    <div className="mx-auto min-h-screen w-full max-w-[520px] bg-background md:max-w-[640px]">
      <PageHeader
        title={product.code}
        subtitle={`${product.projectName} · ${product.subzone}${product.tower ? ` · ${product.tower}` : ""}`}
      />

      {/* Image gallery */}
      <div
        className="flex snap-x snap-mandatory gap-1 overflow-x-auto bg-muted"
        aria-label="Ảnh sản phẩm"
      >
        {product.images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`${product.code} ${i + 1}`}
            className="aspect-[4/3] w-full snap-start object-cover"
          />
        ))}
      </div>

      <div className="space-y-4 p-4 pb-32">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase text-muted-foreground">{product.type}</p>
            <h1 className="text-lg font-bold tracking-tight">{product.code}</h1>
            <p className="text-xs text-muted-foreground">{project?.name}</p>
          </div>
          <StatusBadge status={product.status} />
        </div>

        {/* Price */}
        <div className="rounded-2xl bg-[var(--brand-navy)] p-4 text-primary-foreground">
          <p className="text-xs opacity-80">Giá bán</p>
          <p className="text-2xl font-bold tracking-tight">{formatVND(product.price)}</p>
          <p className="mt-0.5 text-[11px] opacity-80">
            ≈ {Math.round(product.price / 1_000_000).toLocaleString("vi-VN")} triệu VND
          </p>
        </div>

        {/* Specs */}
        <div className="grid grid-cols-2 gap-2">
          {specs.map(([k, v]) => (
            <div key={String(k)} className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] uppercase text-muted-foreground">{k}</p>
              <p className="text-sm font-semibold">{v}</p>
            </div>
          ))}
        </div>

        {/* Policies */}
        {pol.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Chính sách áp dụng</h2>
            {pol.map((x) => (
              <div key={x.id} className="rounded-xl border border-border bg-card p-3">
                <p className="text-sm font-semibold">{x.title}</p>
                <p className="text-xs text-muted-foreground">{x.summary}</p>
              </div>
            ))}
          </section>
        )}

        {/* Vouchers */}
        {vs.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Voucher áp dụng</h2>
            {vs.map((v) => (
              <div
                key={v.id}
                className="rounded-xl border border-dashed border-[var(--brand-gold)] bg-[var(--brand-gold)]/10 p-3"
              >
                <p className="text-sm font-semibold">{v.title}</p>
                <p className="text-lg font-bold text-[var(--brand-navy)]">{v.value}</p>
                <p className="text-[11px] text-muted-foreground">HSD {formatDate(v.expiresAt)}</p>
              </div>
            ))}
          </section>
        )}

        {/* Related */}
        {related.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Sản phẩm tương tự</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {related.slice(0, 6).map((p) => (
                <ProductCard key={p.id} product={p} compact />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Sticky action bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[520px] border-t border-border bg-background/95 backdrop-blur md:max-w-[640px]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 p-3">
          <button
            type="button"
            onClick={() => toggle(product.id)}
            aria-label="Yêu thích"
            className="grid h-11 w-11 place-items-center rounded-xl border border-border"
          >
            <Heart className={"h-5 w-5 " + (fav ? "fill-rose-500 text-rose-500" : "")} />
          </button>
          <button
            type="button"
            aria-label="Chia sẻ"
            onClick={() => {
              if (typeof navigator !== "undefined" && "share" in navigator) {
                void navigator.share({
                  title: `${product.code} — ${product.projectName}`,
                  text: `${product.type} · ${formatVND(product.price)}`,
                  url: typeof window !== "undefined" ? window.location.href : undefined,
                });
              }
            }}
            className="grid h-11 w-11 place-items-center rounded-xl border border-border"
          >
            <Share2 className="h-5 w-5" />
          </button>
          <Link
            to="/register"
            search={{ type: "consult", productId: product.id }}
            className="grid h-11 place-items-center rounded-xl bg-[var(--brand-navy)] text-sm font-semibold text-primary-foreground"
          >
            Đăng ký tư vấn
          </Link>
          {project && (
            <a
              href={`tel:${project.saleManager.phone.replace(/\s/g, "")}`}
              aria-label="Gọi phụ trách"
              className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-600 text-white"
            >
              <Phone className="h-5 w-5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}