import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, List, Table as TableIcon, X, Heart } from "lucide-react";
import { z } from "zod";
import { MobileShell } from "@/components/mobile/MobileShell";
import { ProductCard } from "@/components/shared/ProductCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { products, projects } from "@/features/mock/data";
import { formatVND } from "@/utils/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";

const searchSchema = z.object({
  projectId: z.string().optional(),
  focus: z.enum(["code"]).optional(),
});

export const Route = createFileRoute("/inventory")({
  validateSearch: searchSchema,
  component: InventoryPage,
  head: () => ({
    meta: [
      { title: "Bảng hàng — Minh Minh Sales Hub" },
      { name: "description", content: "Tra cứu bảng hàng bất động sản theo thời gian thực." },
    ],
  }),
});

type View = "list" | "table";

function InventoryPage() {
  const { projectId: initialProject } = Route.useSearch();
  const [q, setQ] = useState("");
  const [projectId, setProjectId] = useState<string | undefined>(initialProject);
  const [type, setType] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [view, setView] = useState<View>("list");
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => {
      if (projectId && p.projectId !== projectId) return false;
      if (type && p.type !== type) return false;
      if (status && p.status !== status) return false;
      if (t && !p.code.toLowerCase().includes(t) && !p.projectName.toLowerCase().includes(t))
        return false;
      return true;
    });
  }, [q, projectId, type, status]);

  const allTypes = Array.from(new Set(products.map((p) => p.type)));
  const allStatuses = ["Còn hàng", "Đã đặt cọc", "Đã bán", "Khoá"];

  const activeCount = [projectId, type, status].filter(Boolean).length;

  return (
    <MobileShell title="Bảng hàng">
      {/* Sticky filter bar */}
      <div className="sticky top-14 z-30 space-y-2 border-b border-border bg-background/95 p-3 backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus={Route.useSearch().focus === "code"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm mã căn, dự án..."
            className="h-11 pl-9"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" className="h-9 shrink-0 gap-1">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Bộ lọc {activeCount ? `(${activeCount})` : ""}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>Bộ lọc bảng hàng</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 py-4">
                <FilterGroup
                  label="Dự án"
                  value={projectId}
                  onChange={setProjectId}
                  options={projects.map((p) => ({ v: p.id, l: p.name }))}
                />
                <FilterGroup
                  label="Loại sản phẩm"
                  value={type}
                  onChange={setType}
                  options={allTypes.map((t) => ({ v: t, l: t }))}
                />
                <FilterGroup
                  label="Trạng thái"
                  value={status}
                  onChange={setStatus}
                  options={allStatuses.map((s) => ({ v: s, l: s }))}
                />
              </div>
              <SheetFooter className="flex-row gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setProjectId(undefined);
                    setType(undefined);
                    setStatus(undefined);
                  }}
                >
                  Xoá bộ lọc
                </Button>
                <Button className="flex-1" onClick={() => setSheetOpen(false)}>
                  Áp dụng
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setProjectId(undefined);
                setType(undefined);
                setStatus(undefined);
              }}
              className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-border px-3 text-xs text-muted-foreground"
            >
              <X className="h-3 w-3" /> Xoá
            </button>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-1 rounded-full border border-border p-0.5">
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label="List view"
              className={
                "grid h-8 w-8 place-items-center rounded-full " +
                (view === "list" ? "bg-[var(--brand-navy)] text-primary-foreground" : "text-muted-foreground")
              }
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              aria-label="Table view"
              className={
                "grid h-8 w-8 place-items-center rounded-full " +
                (view === "table" ? "bg-[var(--brand-navy)] text-primary-foreground" : "text-muted-foreground")
              }
            >
              <TableIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Tìm thấy <span className="font-semibold text-foreground">{filtered.length}</span> sản phẩm
        </p>
      </div>

      {view === "list" ? (
        <div className="space-y-3 p-4">
          {filtered.length === 0 && <EmptyState />}
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="p-2">
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="bg-muted/60 text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Mã căn</th>
                  <th className="px-3 py-2">Loại</th>
                  <th className="px-3 py-2">DT</th>
                  <th className="px-3 py-2">Hướng</th>
                  <th className="px-3 py-2">Giá</th>
                  <th className="px-3 py-2">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-3 py-2 font-semibold text-[var(--brand-navy)]">
                      <Link to="/products/$productId" params={{ productId: p.id }}>
                        {p.code}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{p.type}</td>
                    <td className="px-3 py-2">
                      {p.category === "apartment" ? p.netArea : p.landArea}m²
                    </td>
                    <td className="px-3 py-2">
                      {p.direction ?? p.balconyDirection ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-semibold">{formatVND(p.price)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </MobileShell>
  );
}

function FilterGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o.v;
          return (
            <button
              key={o.v}
              type="button"
              onClick={() => onChange(active ? undefined : o.v)}
              className={
                "rounded-full border px-3 py-1.5 text-xs " +
                (active
                  ? "border-[var(--brand-navy)] bg-[var(--brand-navy)] text-primary-foreground"
                  : "border-border bg-card text-foreground")
              }
            >
              {o.l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
      <Heart className="mx-auto h-6 w-6 text-muted-foreground" />
      <p className="mt-2 text-sm font-medium">Không có sản phẩm phù hợp</p>
      <p className="text-xs text-muted-foreground">Thử điều chỉnh bộ lọc hoặc từ khoá.</p>
    </div>
  );
}