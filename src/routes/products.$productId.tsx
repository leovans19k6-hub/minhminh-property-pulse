import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { Copy, Heart, Phone, Share2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/mobile/PageHeader";
import { MobileShell } from "@/components/mobile/MobileShell";
import { MobileQueryErrorState } from "@/components/mobile/MobileStates";
import { SectionCard } from "@/components/mobile/SectionCard";
import { StickyActionBar } from "@/components/mobile/StickyActionBar";
import { ProductMediaGallery } from "@/components/mobile/product-detail/ProductMediaGallery";
import { ProductIdentityCard } from "@/components/mobile/product-detail/ProductIdentityCard";
import { ProductSpecsCard } from "@/components/mobile/product-detail/ProductSpecsCard";
import { ProductPriceOptions } from "@/components/mobile/product-detail/ProductPriceOptions";
import { ProductCustomFields } from "@/components/mobile/product-detail/ProductCustomFields";
import {
  ProductPriceHistoryCard,
  ProductStatusHistoryCard,
} from "@/components/mobile/product-detail/ProductHistorySummary";
import {
  EventsPreview,
  PoliciesPreview,
  VouchersPreview,
} from "@/components/mobile/product-detail/ProductPreviewSections";
import { PrimaryContactCard } from "@/components/mobile/PrimaryContactCard";
import { ProductDetailSkeleton } from "@/components/mobile/product-detail/ProductDetailSkeleton";
import { useMobileProductDetail } from "@/features/products/queries";
import {
  useAddMobileFavorite,
  useRemoveMobileFavorite,
} from "@/features/favorites/queries";
import type { MobileProductDetail } from "@/services/mobile/products.service";
import { formatVND } from "@/utils/format";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { ServiceError } from "@/services/_helpers";

export const Route = createFileRoute("/products/$productId")({
  component: ProductDetailPage,
  notFoundComponent: () => (
    <MobileShell title="Sản phẩm">
      <MobileQueryErrorState message="Không tìm thấy sản phẩm." />
    </MobileShell>
  ),
  errorComponent: () => (
    <MobileShell title="Sản phẩm">
      <MobileQueryErrorState message="Có lỗi khi tải sản phẩm." />
    </MobileShell>
  ),
});

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useMobileProductDetail(productId);
  const qc = useQueryClient();

  const currentProductId = data?.product.id;
  useEffect(() => {
    if (!currentProductId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const invalidate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        qc.invalidateQueries({ queryKey: queryKeys.mobileProductDetail(currentProductId) });
      }, 700);
    };
    const channel = supabase
      .channel(`mobile-product-${currentProductId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products", filter: `id=eq.${currentProductId}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_price_options",
          filter: `product_id=eq.${currentProductId}`,
        },
        invalidate,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_custom_values",
          filter: `product_id=eq.${currentProductId}`,
        },
        invalidate,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_media",
          filter: `product_id=eq.${currentProductId}`,
        },
        invalidate,
      )
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [currentProductId, qc]);

  const handleShare = async (data: MobileProductDetail) => {
    const p = data.product;
    const shareData = {
      title: `${p.product_code} — ${data.project.name}`,
      url: typeof window !== "undefined" ? window.location.href : "",
    };
    try {
      const nav: Navigator | undefined =
        typeof navigator !== "undefined" ? navigator : undefined;
      if (nav && typeof nav.share === "function") {
        await nav.share(shareData);
      } else if (nav?.clipboard && shareData.url) {
        await nav.clipboard.writeText(shareData.url);
        toast.success("Đã sao chép liên kết");
      }
    } catch {
      /* user dismissed */
    }
  };

  if (isLoading) {
    return (
      <MobileShell title="Chi tiết sản phẩm" showBottomNav={false}>
        <PageHeader title="Chi tiết sản phẩm" />
        <ProductDetailSkeleton />
      </MobileShell>
    );
  }
  if (isError || !data) {
    const msg = error instanceof ServiceError ? error.message : undefined;
    return (
      <MobileShell title="Chi tiết sản phẩm" showBottomNav={false}>
        <PageHeader title="Chi tiết sản phẩm" />
        <MobileQueryErrorState message={msg} onRetry={() => refetch()} />
        <div className="px-4">
          <button
            type="button"
            onClick={() => router.navigate({ to: "/inventory" })}
            className="w-full rounded-xl border border-border bg-[color:var(--surface)] py-3 text-sm font-semibold text-[color:var(--text-primary)]"
          >
            Quay lại bảng hàng
          </button>
        </div>
      </MobileShell>
    );
  }

  return <ProductBody data={data} onShare={() => handleShare(data)} />;
}

function ProductBody({
  data,
  onShare,
}: {
  data: MobileProductDetail;
  onShare: () => void;
}) {
  const p = data.product;
  const primaryPrice =
    data.price_options.find((x) => x.is_primary) ?? data.price_options[0] ?? null;
  const otherPrices = data.price_options.filter((x) => x !== primaryPrice);

  const add = useAddMobileFavorite();
  const remove = useRemoveMobileFavorite();
  const isFav = data.permissions.is_favorite;
  const favoritePending = add.isPending || remove.isPending;
  const toggleFav = () => {
    if (favoritePending) return;
    if (isFav) remove.mutate(p.id);
    else add.mutate(p.id);
  };

  const contact = data.primary_contact;
  const phoneDigits = contact?.phone?.replace(/\s/g, "") ?? "";

  const copyPhone = async () => {
    if (!contact?.phone) return;
    try {
      if (!navigator.clipboard) throw new Error("no-clipboard");
      await navigator.clipboard.writeText(contact.phone);
      toast.success("Đã sao chép số điện thoại");
    } catch {
      toast.error("Không thể sao chép. Vui lòng thử lại.");
    }
  };

  return (
    <MobileShell title="Chi tiết sản phẩm" showBottomNav={false} bottomPadding={72}>
      <PageHeader
        title="Chi tiết sản phẩm"
        subtitle={p.product_code}
        right={
          <button
            type="button"
            onClick={onShare}
            aria-label="Chia sẻ"
            className="grid h-10 w-10 place-items-center rounded-full hover:bg-muted"
          >
            <Share2 className="h-5 w-5" />
          </button>
        }
      />
      <ProductMediaGallery media={data.media} fallbackAlt={p.product_code} />

      <div className="space-y-3 p-4">
        <ProductIdentityCard
          data={data}
          isFavorite={isFav}
          favoritePending={favoritePending}
          onToggleFavorite={toggleFav}
        />

        {primaryPrice ? (
          <section className="rounded-2xl bg-[color:var(--brand-navy)] p-4 text-white shadow-[var(--shadow-sm)]">
            <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">
              {primaryPrice.price_name || "Giá bán"}
            </p>
            <p className="mt-1 text-[26px] font-bold leading-tight tracking-tight">
              {formatVND(primaryPrice.amount)}
            </p>
            {primaryPrice.price_per_sqm ? (
              <p className="mt-0.5 text-xs opacity-80">
                ≈ {formatVND(primaryPrice.price_per_sqm)} / m²
              </p>
            ) : null}
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-border bg-[color:var(--surface)] p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--text-tertiary)]">
              Giá bán
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
              Chưa cập nhật giá bán
            </p>
          </section>
        )}

        <ProductSpecsCard
          product={p}
          floor={data.floor}
          building={data.building}
          zone={data.zone}
        />

        <ProductPriceOptions options={otherPrices} />

        {p.description && (
          <SectionCard title="Mô tả">
            <p className="whitespace-pre-line text-sm leading-relaxed text-[color:var(--text-primary)]">
              {p.description}
            </p>
          </SectionCard>
        )}

        <ProductCustomFields fields={data.custom_fields} />

        <ProductPriceHistoryCard s={data.price_history_summary} />
        <ProductStatusHistoryCard s={data.status_history_summary} />

        <PoliciesPreview items={data.applicable_policies} productId={data.product.id} />
        <VouchersPreview items={data.project_vouchers} productId={data.product.id} />
        <EventsPreview items={data.upcoming_events} />

        {contact && <PrimaryContactCard contact={contact} />}
      </div>

      <StickyActionBar>
        <button
          type="button"
          onClick={toggleFav}
          disabled={favoritePending}
          aria-label={isFav ? "Bỏ yêu thích" : "Yêu thích"}
          aria-pressed={isFav}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border disabled:opacity-60"
        >
          <Heart
            className={
              "h-5 w-5 " +
              (isFav
                ? "fill-[color:var(--danger)] text-[color:var(--danger)]"
                : "text-[color:var(--text-secondary)]")
            }
          />
        </button>
        {contact?.phone ? (
          <>
            <button
              type="button"
              onClick={copyPhone}
              aria-label="Sao chép số điện thoại"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border"
            >
              <Copy className="h-5 w-5 text-[color:var(--text-secondary)]" />
            </button>
            <a
              href={`tel:${phoneDigits}`}
              className="grid h-11 flex-1 place-items-center rounded-xl bg-[color:var(--brand-navy)] text-sm font-semibold text-white"
            >
              <span className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Gọi tư vấn
              </span>
            </a>
          </>
        ) : (
          <div className="grid h-11 flex-1 place-items-center rounded-xl bg-[color:var(--surface-secondary)] text-xs text-[color:var(--text-tertiary)]">
            Chưa có phụ trách
          </div>
        )}
      </StickyActionBar>
    </MobileShell>
  );
}