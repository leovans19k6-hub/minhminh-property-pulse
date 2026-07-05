import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Search, SlidersHorizontal, X } from "lucide-react";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { MobileShell } from "@/components/mobile/MobileShell";
import { MobileInventoryCard } from "@/components/shared/MobileInventoryCard";
import { FilterChip } from "@/components/mobile/FilterChip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMobileInventory, useMobileInventoryFilters } from "@/features/inventory/queries";
import {
  MobileQueryErrorState,
  MobileInlineLoader,
} from "@/components/mobile/MobileStates";
import { subscribeToInventory } from "@/services/realtime.service";
import { queryKeys } from "@/lib/queryKeys";
import { InventoryFilterSheet } from "@/components/mobile/inventory/InventoryFilterSheet";
import { InventoryActiveFilters } from "@/components/mobile/inventory/InventoryActiveFilters";
import { InventoryListSkeleton } from "@/components/mobile/inventory/InventoryListSkeleton";
import {
  countAdvancedFilters,
  emptyAdvancedDraft,
  type InventorySearchState,
} from "@/components/mobile/inventory/filterUtils";

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
      { title: "Bảng hàng — Minh Minh Portal" },
      { name: "description", content: "Tra cứu bảng hàng bất động sản theo thời gian thực." },
    ],
  }),
});

type SearchState = z.infer<typeof searchSchema>;

function InventoryPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/inventory" });
  const queryClient = useQueryClient();

  // Debounced query
  const [qDraft, setQDraft] = useState(search.q ?? "");
  useEffect(() => {
    setQDraft(search.q ?? "");
  }, [search.q]);
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

  const activeAdvancedCount = countAdvancedFilters(search);
  const projectName = search.projectId
    ? filterOpts.data?.projects.find((p) => p.id === search.projectId)?.name
    : undefined;

  const applyFilters = (next: InventorySearchState) => {
    navigate({ search: (() => ({ ...next })) as never });
  };

  const clearAllAdvanced = () =>
    navigate({
      search: ((prev: SearchState) => ({
        projectId: prev.projectId,
        focus: prev.focus,
        q: prev.q,
        ...emptyAdvancedDraft(),
      })) as never,
    });

  const removeChip = (key: keyof InventorySearchState | "floor" | "area" | "price") =>
    navigate({
      search: ((prev: SearchState) => {
        const next: SearchState = { ...prev };
        if (key === "floor") {
          next.floorMin = undefined;
          next.floorMax = undefined;
        } else if (key === "area") {
          next.areaMin = undefined;
          next.areaMax = undefined;
        } else if (key === "price") {
          next.priceMin = undefined;
          next.priceMax = undefined;
        } else {
          (next as Record<string, unknown>)[key] = undefined;
          if (key === "zoneId") next.buildingId = undefined;
        }
        return next;
      }) as never,
    });

  const clearSearch = () => {
    setQDraft("");
    navigate({ search: ((prev: SearchState) => ({ ...prev, q: undefined })) as never });
  };

  const hasProject = !!search.projectId;
  const showResultSummary = hasProject && !isLoading && !isError && items.length > 0;
  const showEmptyNoProject = !hasProject;
  const showEmptyNoInventory =
    hasProject &&
    !isLoading &&
    !isError &&
    items.length === 0 &&
    !search.q &&
    activeAdvancedCount === 0;
  const showEmptyFiltered =
    hasProject &&
    !isLoading &&
    !isError &&
    items.length === 0 &&
    (!!search.q || activeAdvancedCount > 0);

  return (
    <MobileShell title="Bảng hàng" greeting={projectName}>
      {/* Sticky toolbar */}
      <div className="sticky top-14 z-30 border-b border-border bg-[color:var(--surface)]/95 backdrop-blur">
        <div className="space-y-2.5 px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]" />
            <Input
              autoFocus={search.focus === "code"}
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder="Tìm mã căn, tên sản phẩm..."
              aria-label="Tìm sản phẩm trong bảng hàng"
              className="h-11 rounded-xl border-border bg-[color:var(--surface)] pl-9 pr-9 text-[14px] shadow-none"
            />
            {qDraft && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Xoá tìm kiếm"
                className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-[color:var(--text-tertiary)] hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <InventoryFilterSheet
              search={search}
              onApply={applyFilters}
              options={filterOpts.data}
              optionsLoading={filterOpts.isLoading}
            >
              <Button
                type="button"
                variant="outline"
                className="relative h-10 gap-1.5 rounded-xl border-border bg-[color:var(--surface)] px-3.5 text-[13px] font-medium"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Bộ lọc
                {activeAdvancedCount > 0 && (
                  <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--brand-navy)] px-1.5 text-[10.5px] font-semibold text-[color:var(--primary-foreground)]">
                    {activeAdvancedCount}
                  </span>
                )}
              </Button>
            </InventoryFilterSheet>

            {showResultSummary && (
              <p className="ml-auto shrink-0 text-[11.5px] text-[color:var(--text-tertiary)]">
                Đã tải{" "}
                <span className="font-semibold text-[color:var(--text-primary)]">
                  {items.length}
                </span>{" "}
                sản phẩm
                {isFetchingNextPage && " · đang tải thêm..."}
              </p>
            )}
          </div>
        </div>
        {activeAdvancedCount > 0 && (
          <InventoryActiveFilters
            search={search}
            options={filterOpts.data}
            onRemove={removeChip}
            onClearAll={clearAllAdvanced}
          />
        )}
      </div>

      {/* Body */}
      {showEmptyNoProject && <NoProjectState />}

      {hasProject && isLoading && <InventoryListSkeleton count={6} />}

      {hasProject && isError && (
        <MobileQueryErrorState
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      )}

      {showEmptyNoInventory && (
        <EmptyState
          icon={<Building2 className="h-6 w-6 text-[color:var(--text-tertiary)]" />}
          title="Dự án chưa có sản phẩm trong bảng hàng"
          hint="Vui lòng chờ đội vận hành cập nhật."
        />
      )}

      {showEmptyFiltered && (
        <EmptyState
          icon={<Search className="h-6 w-6 text-[color:var(--text-tertiary)]" />}
          title="Không tìm thấy sản phẩm phù hợp"
          hint="Thử xoá bớt bộ lọc hoặc thay đổi từ khoá."
          action={
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {activeAdvancedCount > 0 && (
                <Button size="sm" variant="outline" onClick={clearAllAdvanced}>
                  Xoá bộ lọc
                </Button>
              )}
              {search.q && (
                <Button size="sm" variant="outline" onClick={clearSearch}>
                  Xoá tìm kiếm
                </Button>
              )}
            </div>
          }
        />
      )}

      {hasProject && !isLoading && !isError && items.length > 0 && (
        <div className="space-y-2.5 px-4 pb-4 pt-3">
          {items.map((it) => (
            <MobileInventoryCard key={it.product_id} item={it} />
          ))}
          {isFetchingNextPage && <MobileInlineLoader />}
          {hasNextPage && !isFetchingNextPage && (
            <Button
              type="button"
              variant="outline"
              className="mt-2 h-11 w-full rounded-xl"
              onClick={() => fetchNextPage()}
            >
              Xem thêm sản phẩm
            </Button>
          )}
          {!hasNextPage && items.length > 6 && (
            <p className="pt-2 text-center text-[11.5px] text-[color:var(--text-tertiary)]">
              Bạn đã xem hết danh sách.
            </p>
          )}
        </div>
      )}
    </MobileShell>
  );
}

function NoProjectState() {
  return (
    <div className="m-4 rounded-2xl border border-dashed border-border bg-[color:var(--surface)] p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[color:var(--brand-navy-soft)]">
        <Building2 className="h-6 w-6 text-[color:var(--brand-navy)]" />
      </div>
      <p className="mt-3 text-sm font-semibold text-[color:var(--text-primary)]">
        Chọn dự án để xem bảng hàng
      </p>
      <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
        Bảng hàng được phân theo từng dự án để đảm bảo dữ liệu chính xác.
      </p>
      <div className="mt-4">
        <Link
          to="/projects"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-[color:var(--brand-navy)] px-4 text-sm font-semibold text-[color:var(--primary-foreground)]"
        >
          Chọn dự án
        </Link>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="m-4 rounded-2xl border border-dashed border-border bg-[color:var(--surface)] p-8 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-muted">
        {icon}
      </div>
      <p className="mt-3 text-sm font-semibold text-[color:var(--text-primary)]">{title}</p>
      {hint && <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">{hint}</p>}
      {action}
    </div>
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