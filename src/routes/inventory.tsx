import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { MobileShell } from "@/components/mobile/MobileShell";
import { MobileInventoryCard } from "@/components/shared/MobileInventoryCard";
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
import { useMobileInventory, useMobileInventoryFilters } from "@/features/inventory/queries";
import {
  MobileListSkeleton,
  MobileQueryErrorState,
  MobileEmptyState,
  MobileInlineLoader,
} from "@/components/mobile/MobileStates";
import { subscribeToInventory } from "@/services/realtime.service";
import { queryKeys } from "@/lib/queryKeys";

const searchSchema = z.object({
  projectId: z.string().uuid().optional(),
  focus: z.enum(["code"]).optional(),
  q: z.string().optional(),
  category: z.string().optional(),
  zoneId: z.string().uuid().optional(),
  buildingId: z.string().uuid().optional(),
  productTypeId: z.string().uuid().optional(),
  status: z.string().optional(),
  direction: z.string().optional(),
  floorMin: z.coerce.number().optional(),
  floorMax: z.coerce.number().optional(),
  areaMin: z.coerce.number().optional(),
  areaMax: z.coerce.number().optional(),
  priceMin: z.coerce.number().optional(),
  priceMax: z.coerce.number().optional(),
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

function InventoryPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/inventory" });
  const queryClient = useQueryClient();

  // Debounced query
  const [qDraft, setQDraft] = useState(search.q ?? "");
  useEffect(() => {
    const t = setTimeout(() => {
      if ((search.q ?? "") !== qDraft) {
        navigate({
          search: ((prev: SearchState) => ({ ...prev, q: qDraft || undefined })) as never,
        });
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDraft]);

  const filters = useMemo(
    () => ({
      projectId: search.projectId ?? null,
      query: search.q ?? null,
      category: search.category ?? null,
      zoneId: search.zoneId ?? null,
      buildingId: search.buildingId ?? null,
      productTypeId: search.productTypeId ?? null,
      status: search.status ?? null,
      direction: search.direction ?? null,
      floorMin: search.floorMin ?? null,
      floorMax: search.floorMax ?? null,
      areaMin: search.areaMin ?? null,
      areaMax: search.areaMax ?? null,
      priceMin: search.priceMin ?? null,
      priceMax: search.priceMax ?? null,
    }),
    [search],
  );

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useMobileInventory(filters);

  const filterOpts = useMobileInventoryFilters(search.projectId ?? null);

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const total = data?.pages[0]?.total_count ?? 0;

  // Realtime — scoped debounced invalidation.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!search.projectId) return;
    const invalidate = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["mobile", "inventory"] });
        queryClient.invalidateQueries({ queryKey: queryKeys.mobileProjectDetail(search.projectId!) });
      }, 700);
    };
    const unsub = subscribeToInventory({
      table: "products",
      filter: `project_id=eq.${search.projectId}`,
      onChange: invalidate,
    });
    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [search.projectId, queryClient]);

  const activeCount = [
    search.projectId,
    search.category,
    search.zoneId,
    search.buildingId,
    search.productTypeId,
    search.status,
    search.direction,
  ].filter(Boolean).length;

  const clearFilters = () =>
    navigate({
      search: ((prev: SearchState) => ({
        projectId: prev.projectId,
        focus: prev.focus,
        q: prev.q,
      })) as never,
    });

  return (
    <MobileShell title="Bảng hàng">
      <div className="sticky top-14 z-30 space-y-2 border-b border-border bg-background/95 p-3 backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus={search.focus === "code"}
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Tìm mã căn, dự án..."
            className="h-11 pl-9"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <FilterSheet
            search={search}
            navigate={navigate}
            options={filterOpts.data}
            optionsLoading={filterOpts.isLoading}
          >
            <Button size="sm" variant="outline" className="h-9 shrink-0 gap-1">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Bộ lọc {activeCount ? `(${activeCount})` : ""}
            </Button>
          </FilterSheet>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-border px-3 text-xs text-muted-foreground"
            >
              <X className="h-3 w-3" /> Xoá
            </button>
          )}
        </div>
        {!isLoading && !isError && (
          <p className="text-xs text-muted-foreground">
            Tìm thấy <span className="font-semibold text-foreground">{total}</span> sản phẩm
          </p>
        )}
      </div>

      {isLoading && <MobileListSkeleton />}
      {isError && (
        <MobileQueryErrorState
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      )}
      {!isLoading && !isError && items.length === 0 && (
        <MobileEmptyState title="Không có sản phẩm phù hợp" hint="Thử điều chỉnh bộ lọc hoặc từ khoá." />
      )}
      {!isLoading && !isError && items.length > 0 && (
        <div className="space-y-3 p-4">
          {items.map((it) => (
            <MobileInventoryCard key={it.product_id} item={it} />
          ))}
          {isFetchingNextPage && <MobileInlineLoader />}
          {hasNextPage && !isFetchingNextPage && (
            <Button variant="outline" className="w-full" onClick={() => fetchNextPage()}>
              Tải thêm
            </Button>
          )}
        </div>
      )}
    </MobileShell>
  );
}

type SearchState = z.infer<typeof searchSchema>;
type NavigateFn = ReturnType<typeof useNavigate>;

function FilterSheet({
  children,
  search,
  navigate,
  options,
  optionsLoading,
}: {
  children: React.ReactNode;
  search: SearchState;
  navigate: NavigateFn;
  options:
    | {
        projects: Array<{ id: string; name: string }>;
        zones: Array<{ id: string; name: string; project_id: string }>;
        buildings: Array<{ id: string; name: string; project_id: string; zone_id: string | null }>;
        product_types: Array<{ id: string; name: string; project_id: string }>;
        categories: string[];
        statuses: string[];
        directions: string[];
      }
    | undefined;
  optionsLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SearchState>(search);
  useEffect(() => {
    if (open) setDraft(search);
  }, [open, search]);

  const apply = () => {
    navigate({ search: (() => ({ ...draft })) as never });
    setOpen(false);
  };
  const clear = () =>
    setDraft({ projectId: draft.projectId, focus: draft.focus, q: draft.q });

  const set = <K extends keyof SearchState>(k: K, v: SearchState[K] | undefined) =>
    setDraft((prev) => {
      const next = { ...prev, [k]: v };
      // reset dependent filters when project changes
      if (k === "projectId") {
        next.zoneId = undefined;
        next.buildingId = undefined;
        next.productTypeId = undefined;
      }
      return next;
    });

  const zoneOpts = (options?.zones ?? []).filter(
    (z) => !draft.projectId || z.project_id === draft.projectId,
  );
  const buildingOpts = (options?.buildings ?? []).filter(
    (b) =>
      (!draft.projectId || b.project_id === draft.projectId) &&
      (!draft.zoneId || b.zone_id === draft.zoneId),
  );
  const typeOpts = (options?.product_types ?? []).filter(
    (t) => !draft.projectId || t.project_id === draft.projectId,
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Bộ lọc bảng hàng</SheetTitle>
        </SheetHeader>
        {optionsLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Đang tải bộ lọc...</div>
        ) : (
          <div className="space-y-4 py-4">
            <ChipGroup
              label="Dự án"
              value={draft.projectId}
              onChange={(v) => set("projectId", v)}
              options={(options?.projects ?? []).map((p) => ({ v: p.id, l: p.name }))}
            />
            {options?.categories && options.categories.length > 0 && (
              <ChipGroup
                label="Nhóm sản phẩm"
                value={draft.category}
                onChange={(v) => set("category", v)}
                options={options.categories.map((c) => ({ v: c, l: c }))}
              />
            )}
            {zoneOpts.length > 0 && (
              <ChipGroup
                label="Phân khu"
                value={draft.zoneId}
                onChange={(v) => set("zoneId", v)}
                options={zoneOpts.map((z) => ({ v: z.id, l: z.name }))}
              />
            )}
            {buildingOpts.length > 0 && (
              <ChipGroup
                label="Toà"
                value={draft.buildingId}
                onChange={(v) => set("buildingId", v)}
                options={buildingOpts.map((b) => ({ v: b.id, l: b.name }))}
              />
            )}
            {typeOpts.length > 0 && (
              <ChipGroup
                label="Loại sản phẩm"
                value={draft.productTypeId}
                onChange={(v) => set("productTypeId", v)}
                options={typeOpts.map((t) => ({ v: t.id, l: t.name }))}
              />
            )}
            {options?.statuses && options.statuses.length > 0 && (
              <ChipGroup
                label="Trạng thái"
                value={draft.status}
                onChange={(v) => set("status", v)}
                options={options.statuses.map((s) => ({ v: s, l: s }))}
              />
            )}
            {options?.directions && options.directions.length > 0 && (
              <ChipGroup
                label="Hướng"
                value={draft.direction}
                onChange={(v) => set("direction", v)}
                options={options.directions.map((d) => ({ v: d, l: d }))}
              />
            )}
          </div>
        )}
        <SheetFooter className="flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={clear}>
            Xoá bộ lọc
          </Button>
          <Button className="flex-1" onClick={apply}>
            Áp dụng
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ChipGroup({
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