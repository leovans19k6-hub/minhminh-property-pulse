import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Share2, Phone, MessageCircle, ImageOff, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/mobile/PageHeader";
import { MobileShell } from "@/components/mobile/MobileShell";
import {
  MobileListSkeleton,
  MobileQueryErrorState,
} from "@/components/mobile/MobileStates";
import { useMobileProductDetail } from "@/features/products/queries";
import {
  useAddMobileFavorite,
  useRemoveMobileFavorite,
} from "@/features/favorites/queries";
import type {
  MobileProductCustomField,
  MobileProductDetail,
} from "@/services/mobile/products.service";
import { formatVND, formatDate, formatDateTime } from "@/utils/format";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { ServiceError } from "@/services/_helpers";

export const Route = createFileRoute("/products/$productId")({
  component: ProductDetailPage,
  notFoundComponent: () => (
    <MobileShell title="Sản phẩm">
      <div className="p-6 text-sm text-muted-foreground">Không tìm thấy sản phẩm.</div>
    </MobileShell>
  ),
  errorComponent: () => (
    <MobileShell title="Sản phẩm">
      <div className="p-6 text-sm text-muted-foreground">Có lỗi khi tải sản phẩm.</div>
    </MobileShell>
  ),
});

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const { data, isLoading, isError, error, refetch } = useMobileProductDetail(productId);
  const qc = useQueryClient();

  // Realtime: invalidate on relevant table changes for this product/project.
  useEffect(() => {
    if (!data) return;
    const pid = data.product.id;
    const projId = data.product.project_id;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const invalidate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        qc.invalidateQueries({ queryKey: queryKeys.mobileProductDetail(pid) });
      }, 700);
    };
    const channel = supabase
      .channel(`mobile-product-${pid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products", filter: `id=eq.${pid}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_price_options", filter: `product_id=eq.${pid}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_custom_values", filter: `product_id=eq.${pid}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales_policies", filter: `project_id=eq.${projId}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vouchers", filter: `project_id=eq.${projId}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events", filter: `project_id=eq.${projId}` },
        invalidate,
      )
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [data, qc]);

  if (isLoading) {
    return (
      <MobileShell title="Sản phẩm">
        <MobileListSkeleton count={1} />
      </MobileShell>
    );
  }
  if (isError || !data) {
    const msg = error instanceof ServiceError ? error.message : undefined;
    return (
      <MobileShell title="Sản phẩm">
        <MobileQueryErrorState message={msg} onRetry={() => refetch()} />
      </MobileShell>
    );
  }

  return <ProductBody data={data} />;
}

function ProductBody({ data }: { data: MobileProductDetail }) {
  const p = data.product;
  const primaryPrice = data.price_options.find((x) => x.is_primary) ?? data.price_options[0];
  const otherPrices = data.price_options.filter((x) => x !== primaryPrice);
  const isApt = p.category === "apartment" || p.category === "high_rise";
  const subtitleParts = [
    data.project.name,
    data.zone?.name,
    data.building?.name,
  ].filter(Boolean);
  const add = useAddMobileFavorite();
  const remove = useRemoveMobileFavorite();
  const isFav = data.permissions.is_favorite;

  const toggleFav = () => {
    if (isFav) remove.mutate(p.id);
    else add.mutate(p.id);
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[520px] bg-background md:max-w-[640px]">
      <PageHeader title={p.product_code} subtitle={subtitleParts.join(" · ")} />
      <MediaGallery data={data} />

      <div className="space-y-4 p-4 pb-32">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase text-muted-foreground">
              {data.product_type?.name ?? p.category}
            </p>
            <h1 className="text-lg font-bold tracking-tight">
              {p.product_name ?? p.product_code}
            </h1>
            <p className="text-xs text-muted-foreground">{data.project.name}</p>
          </div>
          <StatusChip status={p.status} />
        </div>

        {/* Price */}
        {primaryPrice ? (
          <div className="rounded-2xl bg-[var(--brand-navy)] p-4 text-primary-foreground">
            <p className="text-xs opacity-80">{primaryPrice.price_name || "Giá bán"}</p>
            <p className="text-2xl font-bold tracking-tight">{formatVND(primaryPrice.amount)}</p>
            {primaryPrice.price_per_sqm ? (
              <p className="mt-0.5 text-[11px] opacity-80">
                ≈ {formatVND(primaryPrice.price_per_sqm)}/m²
              </p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Giá bán liên hệ.
          </div>
        )}

        {otherPrices.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Các gói giá khác</h2>
            {otherPrices.map((op) => (
              <div key={op.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div>
                  <p className="text-sm font-medium">{op.price_name}</p>
                  {(op.effective_from || op.effective_to) && (
                    <p className="text-[11px] text-muted-foreground">
                      {op.effective_from ? formatDate(op.effective_from) : "—"} →{" "}
                      {op.effective_to ? formatDate(op.effective_to) : "—"}
                    </p>
                  )}
                </div>
                <p className="text-sm font-semibold">{formatVND(op.amount)}</p>
              </div>
            ))}
          </section>
        )}

        {/* Specs */}
        <SpecsGrid p={p} isApartment={isApt} />

        {/* Description */}
        {p.description && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Mô tả</h2>
            <p className="whitespace-pre-line text-sm text-foreground/80">{p.description}</p>
          </section>
        )}

        {/* Custom fields grouped */}
        <CustomFieldsSection fields={data.custom_fields} />

        {/* Price history summary */}
        {data.price_history_summary.can_view && data.price_history_summary.has_history && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Lịch sử giá</h2>
            <div className="rounded-xl border border-border bg-card p-3 text-sm">
              <p className="text-muted-foreground text-[11px]">
                {data.price_history_summary.change_count} lần thay đổi
                {data.price_history_summary.latest_change_at &&
                  ` · lần cuối ${formatDateTime(data.price_history_summary.latest_change_at)}`}
              </p>
              {typeof data.price_history_summary.percentage_change === "number" && (
                <p className="mt-1 text-sm font-semibold">
                  {data.price_history_summary.percentage_change > 0 ? "▲" : data.price_history_summary.percentage_change < 0 ? "▼" : "="}{" "}
                  {Math.abs(data.price_history_summary.percentage_change)}%
                </p>
              )}
            </div>
          </section>
        )}

        {/* Status history */}
        {data.status_history_summary.can_view && (data.status_history_summary.change_count ?? 0) > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Lịch sử trạng thái</h2>
            <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
              {data.status_history_summary.change_count} lần cập nhật
              {data.status_history_summary.latest_status &&
                ` · gần nhất: ${data.status_history_summary.latest_status}`}
            </div>
          </section>
        )}

        {/* Policies */}
        {data.applicable_policies.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Chính sách áp dụng</h2>
            {data.applicable_policies.map((x) => (
              <div key={x.id} className="rounded-xl border border-border bg-card p-3">
                <p className="text-sm font-semibold">{x.title}</p>
                {x.summary && <p className="text-xs text-muted-foreground">{x.summary}</p>}
                {x.effective_to && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Hiệu lực đến {formatDate(x.effective_to)}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Vouchers */}
        {data.project_vouchers.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Voucher</h2>
            {data.project_vouchers.map((v) => (
              <div
                key={v.id}
                className="rounded-xl border border-dashed border-[var(--brand-gold)] bg-[var(--brand-gold)]/10 p-3"
              >
                <p className="text-sm font-semibold">{v.title}</p>
                {v.summary && <p className="text-xs text-muted-foreground">{v.summary}</p>}
                {(v.value_amount || v.value_percent) && (
                  <p className="mt-1 text-lg font-bold text-[var(--brand-navy)]">
                    {v.value_amount ? formatVND(v.value_amount) : `${v.value_percent}%`}
                  </p>
                )}
                {v.effective_to && (
                  <p className="text-[11px] text-muted-foreground">HSD {formatDate(v.effective_to)}</p>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Events */}
        {data.upcoming_events.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Sự kiện sắp diễn ra</h2>
            {data.upcoming_events.map((e) => (
              <div key={e.id} className="rounded-xl border border-border bg-card p-3">
                <p className="text-[11px] uppercase text-muted-foreground">
                  {e.event_type === "site_tour" ? "Tham quan dự án" : "Sự kiện"}
                </p>
                <p className="text-sm font-semibold">{e.title}</p>
                {e.start_at && (
                  <p className="text-xs text-muted-foreground">{formatDateTime(e.start_at)}</p>
                )}
                {e.location_name && (
                  <p className="text-[11px] text-muted-foreground">{e.location_name}</p>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Primary contact */}
        {data.primary_contact && <ContactCard c={data.primary_contact} />}
      </div>

      {/* Sticky action bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[520px] border-t border-border bg-background/95 backdrop-blur md:max-w-[640px]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 p-3">
          <button
            type="button"
            onClick={toggleFav}
            disabled={add.isPending || remove.isPending}
            aria-label={isFav ? "Bỏ yêu thích" : "Yêu thích"}
            className="grid h-11 w-11 place-items-center rounded-xl border border-border disabled:opacity-60"
          >
            <Heart className={"h-5 w-5 " + (isFav ? "fill-rose-500 text-rose-500" : "")} />
          </button>
          <button
            type="button"
            aria-label="Chia sẻ"
            onClick={() => {
              if (typeof navigator !== "undefined" && "share" in navigator) {
                void navigator.share({
                  title: `${p.product_code} — ${data.project.name}`,
                  url: typeof window !== "undefined" ? window.location.href : undefined,
                });
              }
            }}
            className="grid h-11 w-11 place-items-center rounded-xl border border-border"
          >
            <Share2 className="h-5 w-5" />
          </button>
          {data.primary_contact?.phone ? (
            <a
              href={`tel:${data.primary_contact.phone.replace(/\s/g, "")}`}
              className="grid h-11 place-items-center rounded-xl bg-[var(--brand-navy)] text-sm font-semibold text-primary-foreground"
            >
              Liên hệ tư vấn
            </a>
          ) : (
            <div className="grid h-11 place-items-center rounded-xl bg-muted text-xs text-muted-foreground">
              Chưa có phụ trách
            </div>
          )}
          {data.primary_contact?.phone && (
            <a
              href={`tel:${data.primary_contact.phone.replace(/\s/g, "")}`}
              aria-label="Gọi"
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

function MediaGallery({ data }: { data: MobileProductDetail }) {
  const media = data.media.filter((m) => m.media_type === "image" || m.media_type === "floor_plan");
  const [idx, setIdx] = useState(0);
  if (media.length === 0) {
    return (
      <div className="grid aspect-[4/3] w-full place-items-center bg-muted">
        <ImageOff className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="bg-muted">
      <div
        className="flex snap-x snap-mandatory overflow-x-auto"
        aria-label="Ảnh sản phẩm"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIdx(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {media.map((m) => (
          <img
            key={m.id}
            src={m.file_url}
            alt={m.alt_text ?? data.product.product_code}
            className="aspect-[4/3] w-full flex-none snap-start object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ))}
      </div>
      {media.length > 1 && (
        <div className="flex items-center justify-center gap-1 py-2">
          {media.map((_, i) => (
            <span
              key={i}
              className={
                "h-1.5 rounded-full transition-all " +
                (i === idx ? "w-4 bg-[var(--brand-navy)]" : "w-1.5 bg-muted-foreground/30")
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SpecsGrid({
  p,
  isApartment,
}: {
  p: MobileProductDetail["product"];
  isApartment: boolean;
}) {
  const items: [string, string | number | null][] = isApartment
    ? [
        ["Tầng", p.floor_number],
        ["Hướng cửa", p.door_direction],
        ["Hướng ban công", p.balcony_direction],
        ["DT thông thuỷ", p.carpet_area ? `${p.carpet_area} m²` : null],
        ["DT tim tường", p.built_up_area ? `${p.built_up_area} m²` : null],
        ["Phòng ngủ", p.bedrooms],
        ["Phòng tắm", p.bathrooms],
        ["View", p.view_text],
      ]
    : [
        ["DT đất", p.land_area ? `${p.land_area} m²` : null],
        ["DT xây dựng", p.construction_area ? `${p.construction_area} m²` : null],
        ["Mặt tiền", p.frontage ? `${p.frontage} m` : null],
        ["Số tầng", p.number_of_floors],
        ["Hướng", p.direction],
        ["Tình trạng XD", p.construction_status],
      ];
  const shown = items.filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (shown.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {shown.map(([k, v]) => (
        <div key={k} className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase text-muted-foreground">{k}</p>
          <p className="text-sm font-semibold">{String(v)}</p>
        </div>
      ))}
    </div>
  );
}

function CustomFieldsSection({ fields }: { fields: MobileProductCustomField[] }) {
  const nonEmpty = fields.filter(
    (f) =>
      f.value !== null &&
      f.value !== undefined &&
      f.value !== "" &&
      !(Array.isArray(f.value) && f.value.length === 0),
  );
  if (nonEmpty.length === 0) return null;
  const groups = new Map<string, MobileProductCustomField[]>();
  for (const f of nonEmpty) {
    const g = f.field_group ?? "Thông tin khác";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(f);
  }
  return (
    <div className="space-y-3">
      {Array.from(groups.entries()).map(([group, list]) => (
        <section key={group} className="space-y-2">
          <h2 className="text-sm font-semibold">{group}</h2>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {list.map((f) => (
              <div key={f.definition_id} className="flex items-start justify-between gap-3 p-3">
                <span className="text-xs text-muted-foreground">{f.label}</span>
                <span className="text-right text-sm font-medium">
                  {renderFieldValue(f)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function renderFieldValue(f: MobileProductCustomField) {
  if (f.display_value) return f.display_value + (f.unit ? ` ${f.unit}` : "");
  const v = f.value;
  if (v === null || v === undefined) return "—";
  if (f.data_type === "boolean") return v ? "Có" : "Không";
  if (f.data_type === "date" && typeof v === "string") return formatDate(v);
  if (f.data_type === "datetime" && typeof v === "string") return formatDateTime(v);
  if (f.data_type === "url" && typeof v === "string") {
    return (
      <a
        href={v}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1 text-[var(--brand-navy)] underline"
      >
        Mở <ExternalLink className="h-3 w-3" />
      </a>
    );
  }
  if (f.data_type === "phone" && typeof v === "string") {
    return <a href={`tel:${v.replace(/\s/g, "")}`} className="text-[var(--brand-navy)] underline">{v}</a>;
  }
  if (Array.isArray(v)) return v.join(", ");
  const s = String(v);
  return s + (f.unit ? ` ${f.unit}` : "");
}

function ContactCard({ c }: { c: NonNullable<MobileProductDetail["primary_contact"]> }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">Phụ trách kinh doanh</h2>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
        {c.avatar_url ? (
          <img src={c.avatar_url} alt={c.full_name ?? ""} className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-sm font-semibold">
            {(c.full_name ?? "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{c.full_name ?? "—"}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {[c.position, c.branch].filter(Boolean).join(" · ") || "Sale"}
          </p>
          {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
        </div>
        <div className="flex items-center gap-1">
          {c.phone && (
            <a
              href={`tel:${c.phone.replace(/\s/g, "")}`}
              aria-label="Gọi"
              className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-600 text-white"
            >
              <Phone className="h-4 w-4" />
            </a>
          )}
          {c.zalo_url && (
            <a
              href={c.zalo_url}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Zalo"
              className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--brand-navy)] text-white"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    available: "bg-emerald-100 text-emerald-800",
    reserved: "bg-amber-100 text-amber-800",
    booked: "bg-blue-100 text-blue-800",
    sold: "bg-slate-200 text-slate-700",
    locked: "bg-rose-100 text-rose-800",
    unavailable: "bg-slate-100 text-slate-500",
  };
  const label: Record<string, string> = {
    available: "Còn hàng",
    reserved: "Đang giữ",
    booked: "Đã cọc",
    sold: "Đã bán",
    locked: "Khoá",
    unavailable: "Ngưng bán",
  };
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium " +
        (map[status] ?? "bg-muted text-muted-foreground")
      }
    >
      {label[status] ?? status}
    </span>
  );
}