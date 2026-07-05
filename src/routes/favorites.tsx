import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, X } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { MobileInventoryCard } from "@/components/shared/MobileInventoryCard";
import {
  MobileListSkeleton,
  MobileQueryErrorState,
  MobileEmptyState,
  MobileInlineLoader,
} from "@/components/mobile/MobileStates";
import { useMobileFavorites, useRemoveMobileFavorite } from "@/features/favorites/queries";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/favorites")({
  component: FavoritesPage,
});

function FavoritesPage() {
  const [limit] = useState(30);
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, refetch, isFetching } = useMobileFavorites(limit, offset);
  const remove = useRemoveMobileFavorite();

  return (
    <MobileShell title="Sản phẩm yêu thích">
      {isLoading ? (
        <MobileListSkeleton count={3} />
      ) : isError ? (
        <MobileQueryErrorState onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <div className="mt-6 px-4">
          <MobileEmptyState
            title="Chưa có sản phẩm yêu thích"
            hint="Chạm biểu tượng trái tim trên sản phẩm để lưu lại."
          />
          <div className="mx-auto mt-2 grid place-items-center">
            <Heart className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
      ) : (
        <div className="space-y-3 p-4 pb-24">
          {data.items.map((f) => (
            <div key={f.product_id} className="relative">
              <MobileInventoryCard item={f} />
              <button
                type="button"
                aria-label="Bỏ yêu thích"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  remove.mutate(f.product_id);
                }}
                disabled={remove.isPending}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/90 shadow"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {data.has_more && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={isFetching}
                onClick={() => setOffset((o) => o + limit)}
              >
                Tải thêm
              </Button>
            </div>
          )}
          {isFetching && <MobileInlineLoader />}
        </div>
      )}
    </MobileShell>
  );
}