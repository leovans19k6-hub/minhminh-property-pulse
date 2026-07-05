import { createFileRoute } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { ProductCard } from "@/components/shared/ProductCard";
import { products } from "@/features/mock/data";
import { useFavorites } from "@/hooks/useFavorites";

export const Route = createFileRoute("/favorites")({
  component: FavoritesPage,
});

function FavoritesPage() {
  const { ids } = useFavorites();
  const list = products.filter((p) => ids.includes(p.id));
  return (
    <MobileShell title="Sản phẩm yêu thích">
      <div className="space-y-3 p-4">
        {list.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
            <Heart className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">Chưa có sản phẩm yêu thích</p>
            <p className="text-xs text-muted-foreground">
              Chạm vào biểu tượng trái tim trên sản phẩm để lưu lại.
            </p>
          </div>
        ) : (
          list.map((p) => <ProductCard key={p.id} product={p} />)
        )}
      </div>
    </MobileShell>
  );
}