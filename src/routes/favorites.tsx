import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/mobile/MobileShell";
import { MobileInventoryCard } from "@/components/shared/MobileInventoryCard";
import {
  MobileQueryErrorState,
  MobileInlineLoader,
} from "@/components/mobile/MobileStates";
import { InventoryListSkeleton } from "@/components/mobile/inventory/InventoryListSkeleton";
import { useMobileFavorites, useRemoveMobileFavorite } from "@/features/favorites/queries";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/favorites")({
  component: FavoritesPage,
  head: () => ({
    meta: [
      { title: "Sản phẩm yêu thích — Minh Minh Sales Hub" },
      { name: "description", content: "Danh sách sản phẩm bạn đã lưu để xem lại nhanh." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const PAGE_SIZE = 30;

function FavoritesPage() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, error, refetch, isFetching } = useMobileFavorites(
    PAGE_SIZE,
    offset,
  );
  const remove = useRemoveMobileFavorite();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleRemove = (productId: string) => {
    setPendingId(productId);
    remove.mutate(productId, {
      onSuccess: () => toast.success("Đã bỏ khỏi danh sách yêu thích"),
      onError: (e) =>
        toast.error(e instanceof Error ? e.message : "Không thể cập nhật. Vui lòng thử lại."),
      onSettled: () => setPendingId((p) => (p === productId ? null : p)),
    });
  };

  return (
    <MobileShell title="Sản phẩm yêu thích">
      {isLoading && <InventoryListSkeleton count={4} />}

      {isError && (
        <MobileQueryErrorState
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && (!data || data.items.length === 0) && offset === 0 && (
        <EmptyFavorites />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <div className="px-4 pb-4 pt-3">
          <p className="mb-3 text-[12.5px] text-[color:var(--text-secondary)]">
            Đã tải{" "}
            <span className="font-semibold text-[color:var(--text-primary)]">
              {data.items.length}
            </span>{" "}
            sản phẩm
          </p>
          <div className="space-y-2.5">
            {data.items.map((f) => {
              const busy = pendingId === f.product_id && remove.isPending;
              return (
                <div key={f.product_id} className="relative">
                  <MobileInventoryCard item={f} />
                  <button
                    type="button"
                    aria-label="Xóa khỏi yêu thích"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (busy) return;
                      handleRemove(f.product_id);
                    }}
                    disabled={busy}
                    className="absolute right-1.5 top-1.5 z-10 grid h-11 w-11 place-items-center rounded-full bg-[color:var(--surface)]/95 text-[color:var(--danger)] shadow-[var(--shadow-sm)] ring-1 ring-border transition-colors hover:bg-[color:var(--danger-soft)] disabled:opacity-60"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
          {data.has_more && (
            <Button
              variant="outline"
              className="mt-3 h-11 w-full rounded-xl"
              disabled={isFetching}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              Xem thêm sản phẩm
            </Button>
          )}
          {isFetching && <MobileInlineLoader />}
          {!data.has_more && data.items.length > 6 && (
            <p className="pt-2 text-center text-[11.5px] text-[color:var(--text-tertiary)]">
              Bạn đã xem hết danh sách.
            </p>
          )}
        </div>
      )}
    </MobileShell>
  );
}

function EmptyFavorites() {
  return (
    <div className="m-4 rounded-2xl border border-dashed border-border bg-[color:var(--surface)] p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[color:var(--brand-navy-soft)]">
        <Heart className="h-6 w-6 text-[color:var(--brand-navy)]" />
      </div>
      <p className="mt-3 text-sm font-semibold text-[color:var(--text-primary)]">
        Chưa có sản phẩm yêu thích
      </p>
      <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
        Lưu các sản phẩm bạn quan tâm để xem lại nhanh hơn.
      </p>
      <Link
        to="/inventory"
        className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[color:var(--brand-navy)] px-4 text-sm font-semibold text-[color:var(--primary-foreground)]"
      >
        Xem bảng hàng
      </Link>
    </div>
  );
}