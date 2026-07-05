import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { MobileFilterOptions } from "@/services/mobile/inventory.service";
import {
  categoryLabel,
  countAdvancedFilters,
  emptyAdvancedDraft,
  statusLabel,
  type InventorySearchState,
} from "./filterUtils";

interface Props {
  children: React.ReactNode;
  search: InventorySearchState;
  onApply: (next: InventorySearchState) => void;
  options: MobileFilterOptions | undefined;
  optionsLoading: boolean;
}

export function InventoryFilterSheet({
  children,
  search,
  onApply,
  options,
  optionsLoading,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<InventorySearchState>(search);
  const [rangeError, setRangeError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(search);
      setRangeError(null);
    }
  }, [open, search]);

  const set = <K extends keyof InventorySearchState>(
    k: K,
    v: InventorySearchState[K] | undefined,
  ) =>
    setDraft((prev) => {
      const next: InventorySearchState = { ...prev, [k]: v };
      if (k === "zoneId") {
        // building may become invalid
        next.buildingId = undefined;
      }
      return next;
    });

  const zoneOpts = useMemo(
    () =>
      (options?.zones ?? []).filter(
        (z) => !draft.projectId || z.project_id === draft.projectId,
      ),
    [options, draft.projectId],
  );
  const buildingOpts = useMemo(
    () =>
      (options?.buildings ?? []).filter(
        (b) =>
          (!draft.projectId || b.project_id === draft.projectId) &&
          (!draft.zoneId || b.zone_id === draft.zoneId),
      ),
    [options, draft.projectId, draft.zoneId],
  );
  const typeOpts = useMemo(
    () =>
      (options?.product_types ?? []).filter(
        (t) => !draft.projectId || t.project_id === draft.projectId,
      ),
    [options, draft.projectId],
  );

  const activeCount = countAdvancedFilters(draft);

  const validate = (d: InventorySearchState): string | null => {
    if (d.floorMin != null && d.floorMax != null && d.floorMin > d.floorMax)
      return "Tầng: giá trị từ phải nhỏ hơn hoặc bằng giá trị đến.";
    if (d.areaMin != null && d.areaMax != null && d.areaMin > d.areaMax)
      return "Diện tích: giá trị từ phải nhỏ hơn hoặc bằng giá trị đến.";
    if (d.priceMin != null && d.priceMax != null && d.priceMin > d.priceMax)
      return "Giá: giá trị từ phải nhỏ hơn hoặc bằng giá trị đến.";
    return null;
  };

  const apply = () => {
    // Clear invalid dependent selections silently before apply.
    const cleaned: InventorySearchState = { ...draft };
    if (cleaned.zoneId && !zoneOpts.some((z) => z.id === cleaned.zoneId)) {
      cleaned.zoneId = undefined;
      cleaned.buildingId = undefined;
    }
    if (cleaned.buildingId && !buildingOpts.some((b) => b.id === cleaned.buildingId)) {
      cleaned.buildingId = undefined;
    }
    if (cleaned.productTypeId && !typeOpts.some((t) => t.id === cleaned.productTypeId)) {
      cleaned.productTypeId = undefined;
    }
    const err = validate(cleaned);
    if (err) {
      setRangeError(err);
      return;
    }
    onApply(cleaned);
    setOpen(false);
  };

  const reset = () => {
    setDraft((prev) => ({
      projectId: prev.projectId,
      focus: prev.focus,
      q: prev.q,
      ...emptyAdvancedDraft(),
    }));
    setRangeError(null);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="bottom"
        className="flex max-h-[90dvh] flex-col gap-0 rounded-t-3xl p-0"
      >
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center justify-between text-left text-base">
            <span>Bộ lọc bảng hàng</span>
            {activeCount > 0 && (
              <span className="rounded-full bg-[color:var(--brand-navy-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--brand-navy)]">
                {activeCount} đang chọn
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div
          className="flex-1 overflow-y-auto px-5 py-4"
          style={{ paddingBottom: "calc(88px + env(safe-area-inset-bottom))" }}
        >
          {optionsLoading ? (
            <div className="py-10 text-center text-xs text-[color:var(--text-tertiary)]">
              Đang tải bộ lọc...
            </div>
          ) : (
            <div className="space-y-5">
              {options?.categories && options.categories.length > 0 && (
                <Section title="Loại sản phẩm">
                  <ChipGroup
                    value={draft.category}
                    options={options.categories.map((c) => ({ v: c, l: categoryLabel(c) }))}
                    onChange={(v) => set("category", v)}
                  />
                </Section>
              )}
              {options?.statuses && options.statuses.length > 0 && (
                <Section title="Trạng thái">
                  <ChipGroup
                    value={draft.status}
                    options={options.statuses.map((s) => ({ v: s, l: statusLabel(s) }))}
                    onChange={(v) => set("status", v)}
                  />
                </Section>
              )}
              {zoneOpts.length > 0 && (
                <Section title="Phân khu">
                  <ChipGroup
                    value={draft.zoneId}
                    options={zoneOpts.map((z) => ({ v: z.id, l: z.name }))}
                    onChange={(v) => set("zoneId", v)}
                  />
                </Section>
              )}
              {buildingOpts.length > 0 && (
                <Section title="Toà">
                  <ChipGroup
                    value={draft.buildingId}
                    options={buildingOpts.map((b) => ({ v: b.id, l: b.name }))}
                    onChange={(v) => set("buildingId", v)}
                  />
                </Section>
              )}
              {typeOpts.length > 0 && (
                <Section title="Loại căn / Product type">
                  <ChipGroup
                    value={draft.productTypeId}
                    options={typeOpts.map((t) => ({ v: t.id, l: t.name }))}
                    onChange={(v) => set("productTypeId", v)}
                  />
                </Section>
              )}
              {options?.directions && options.directions.length > 0 && (
                <Section title="Hướng">
                  <ChipGroup
                    value={draft.direction}
                    options={options.directions.map((d) => ({ v: d, l: d }))}
                    onChange={(v) => set("direction", v)}
                  />
                </Section>
              )}

              <Section title="Tầng">
                <RangeInput
                  fromLabel="Từ tầng"
                  toLabel="Đến tầng"
                  from={draft.floorMin}
                  to={draft.floorMax}
                  onChange={(from, to) =>
                    setDraft((p) => ({ ...p, floorMin: from, floorMax: to }))
                  }
                />
              </Section>

              <Section title="Diện tích (m²)">
                <RangeInput
                  fromLabel="Từ"
                  toLabel="Đến"
                  from={draft.areaMin}
                  to={draft.areaMax}
                  step={0.1}
                  onChange={(from, to) =>
                    setDraft((p) => ({ ...p, areaMin: from, areaMax: to }))
                  }
                />
              </Section>

              <Section
                title="Khoảng giá (VND)"
                hint="Nhập theo đơn vị đồng, ví dụ 2500000000 cho 2,5 tỷ."
              >
                <RangeInput
                  fromLabel="Giá từ"
                  toLabel="Giá đến"
                  from={draft.priceMin}
                  to={draft.priceMax}
                  step={1000000}
                  onChange={(from, to) =>
                    setDraft((p) => ({ ...p, priceMin: from, priceMax: to }))
                  }
                />
              </Section>

              {rangeError && (
                <p
                  role="alert"
                  className="rounded-lg bg-[color:var(--danger-soft)] px-3 py-2 text-xs text-[color:var(--danger)]"
                >
                  {rangeError}
                </p>
              )}
            </div>
          )}
        </div>

        <div
          className="sticky bottom-0 flex gap-2 border-t border-border bg-[color:var(--surface)] px-5 py-3"
          style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
        >
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1"
            onClick={reset}
            disabled={activeCount === 0}
          >
            Đặt lại
          </Button>
          <Button type="button" className="h-11 flex-1" onClick={apply}>
            Áp dụng{activeCount > 0 ? ` (${activeCount})` : ""}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
        {title}
      </p>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-[color:var(--text-tertiary)]">{hint}</p>}
    </div>
  );
}

function ChipGroup({
  value,
  options,
  onChange,
}: {
  value: string | undefined;
  options: { v: string; l: string }[];
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(active ? undefined : o.v)}
            className={
              "min-h-[36px] rounded-full border px-3 text-[12.5px] font-medium transition-colors " +
              (active
                ? "border-[color:var(--brand-navy)] bg-[color:var(--brand-navy)] text-[color:var(--primary-foreground)]"
                : "border-border bg-[color:var(--surface)] text-[color:var(--text-primary)] hover:bg-[color:var(--brand-navy-soft)]")
            }
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

function RangeInput({
  fromLabel,
  toLabel,
  from,
  to,
  step = 1,
  onChange,
}: {
  fromLabel: string;
  toLabel: string;
  from: number | undefined;
  to: number | undefined;
  step?: number;
  onChange: (from: number | undefined, to: number | undefined) => void;
}) {
  const parse = (v: string): number | undefined => {
    if (!v) return undefined;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return undefined;
    return n;
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="block">
        <span className="mb-1 block text-[11px] text-[color:var(--text-tertiary)]">{fromLabel}</span>
        <Input
          inputMode="decimal"
          type="number"
          min={0}
          step={step}
          value={from ?? ""}
          onChange={(e) => onChange(parse(e.target.value), to)}
          className="h-11"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] text-[color:var(--text-tertiary)]">{toLabel}</span>
        <Input
          inputMode="decimal"
          type="number"
          min={0}
          step={step}
          value={to ?? ""}
          onChange={(e) => onChange(from, parse(e.target.value))}
          className="h-11"
        />
      </label>
    </div>
  );
}