import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";
import type { MobileProductMedia } from "@/services/mobile/products.service";
import { cn } from "@/lib/utils";

interface Props {
  media: MobileProductMedia[];
  fallbackAlt: string;
}

export function ProductMediaGallery({ media, fallbackAlt }: Props) {
  const items = media.filter(
    (m) => m.media_type === "image" || m.media_type === "floor_plan",
  );
  const [idx, setIdx] = useState(0);
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState(false);
  const total = items.length;
  const safeIdx = Math.min(idx, Math.max(total - 1, 0));
  const current = items[safeIdx];

  const go = useCallback(
    (delta: number) => {
      if (total === 0) return;
      setIdx((i) => (i + delta + total) % total);
    },
    [total],
  );

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox, go]);

  if (total === 0) {
    return (
      <div className="grid aspect-[4/3] w-full place-items-center bg-[color:var(--surface-secondary)]">
        <div className="flex flex-col items-center gap-1 text-[color:var(--text-tertiary)]">
          <ImageOff className="h-8 w-8" />
          <span className="text-xs">Chưa có hình ảnh</span>
        </div>
      </div>
    );
  }

  const isBroken = current ? broken.has(current.id) : true;

  return (
    <div className="bg-[color:var(--surface-secondary)]">
      <button
        type="button"
        onClick={() => setLightbox(true)}
        className="relative block w-full overflow-hidden"
        aria-label="Mở ảnh phóng to"
      >
        <div className="relative aspect-[4/3] w-full">
          {current && !isBroken ? (
            <img
              src={current.file_url}
              alt={current.alt_text ?? fallbackAlt}
              loading="eager"
              className="h-full w-full object-cover"
              onError={() =>
                setBroken((s) => {
                  const next = new Set(s);
                  next.add(current.id);
                  return next;
                })
              }
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-[color:var(--surface-secondary)] text-[color:var(--text-tertiary)]">
              <ImageOff className="h-8 w-8" />
            </div>
          )}
          {total > 1 && (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
              {safeIdx + 1} / {total}
            </span>
          )}
        </div>
      </button>

      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto px-3 py-2" aria-label="Danh sách ảnh">
          {items.map((m, i) => {
            const active = i === safeIdx;
            const bad = broken.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Xem ảnh ${i + 1}`}
                aria-current={active}
                className={cn(
                  "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg ring-2 transition",
                  active
                    ? "ring-[color:var(--brand-navy)]"
                    : "ring-transparent opacity-80",
                )}
              >
                {bad ? (
                  <div className="grid h-full w-full place-items-center bg-[color:var(--surface-secondary)]">
                    <ImageOff className="h-4 w-4 text-[color:var(--text-tertiary)]" />
                  </div>
                ) : (
                  <img
                    src={m.thumbnail_url ?? m.file_url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={() =>
                      setBroken((s) => {
                        const next = new Set(s);
                        next.add(m.id);
                        return next;
                      })
                    }
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {lightbox && current && (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh"
        >
          <div
            className="flex items-center justify-between px-4 py-3 text-white"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
          >
            <span className="text-sm font-medium">
              {safeIdx + 1} / {total}
            </span>
            <button
              type="button"
              onClick={() => setLightbox(false)}
              aria-label="Đóng"
              className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative flex flex-1 items-center justify-center">
            {!broken.has(current.id) ? (
              <img
                src={current.file_url}
                alt={current.alt_text ?? fallbackAlt}
                className="max-h-full max-w-full object-contain"
                onError={() =>
                  setBroken((s) => {
                    const next = new Set(s);
                    next.add(current.id);
                    return next;
                  })
                }
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-white/70">
                <ImageOff className="h-10 w-10" />
                <span className="text-sm">Không tải được ảnh</span>
              </div>
            )}
            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Ảnh trước"
                  className="absolute left-3 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Ảnh sau"
                  className="absolute right-3 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}