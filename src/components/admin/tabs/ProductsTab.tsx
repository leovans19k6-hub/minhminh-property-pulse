import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, History, Pencil, Plus, RotateCcw, Search, Star, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryKeys } from "@/lib/queryKeys";
import { EmptyState, ErrorState } from "@/components/admin/EmptyState";
import { ServiceError } from "@/services/_helpers";
import { supabase } from "@/integrations/supabase/client";
import {
  searchProducts,
  archiveProduct,
  restoreProduct,
  getAdminProduct,
  PRODUCT_STATUSES,
  PRODUCT_STATUS_LABELS,
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type ProductSummaryRow,
  type ProductRow,
} from "@/services/admin/adminProducts.service";
import { listInventoryViews } from "@/services/admin/inventoryViews.service";
import { listViewFields, CORE_FIELD_KEY_OPTIONS } from "@/services/admin/inventoryViewFields.service";
import { listFieldDefinitions } from "@/services/admin/fieldDefinitions.service";
import { ProductFormDialog } from "@/components/admin/dialogs/ProductFormDialog";
import { InventoryImportDialog } from "@/components/admin/dialogs/InventoryImportDialog";
import { ProductHistoryDialog } from "@/components/admin/dialogs/ProductHistoryDialog";

const CORE_LABEL_BY_KEY: Record<string, string> = Object.fromEntries(
  CORE_FIELD_KEY_OPTIONS.map((o) => [o.key, o.label]),
);

/** Fallback columns when no active default admin_table view exists. */
const FALLBACK_CORE_KEYS = ["product_code", "product_name", "category", "status", "featured"];

export function ProductsTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("__all__");
  const [statusFilter, setStatusFilter] = useState<string>("__all__");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<ProductRow | "new" | null>(null);
  const [importing, setImporting] = useState(false);
  const [historyFor, setHistoryFor] = useState<{ id: string; label: string } | null>(null);

  // Views to determine columns
  const viewsQ = useQuery({
    queryKey: queryKeys.adminInventoryViews(projectId, { viewType: "admin_table" }),
    queryFn: () => listInventoryViews(projectId, { viewType: "admin_table" }),
  });
  const defaultView = useMemo(
    () => viewsQ.data?.find((v) => v.is_default && v.status === "active") ?? viewsQ.data?.[0] ?? null,
    [viewsQ.data],
  );

  const viewFieldsQ = useQuery({
    queryKey: defaultView ? queryKeys.adminInventoryViewFields(defaultView.id) : ["admin", "inventory-views", "none", "fields"],
    queryFn: () => (defaultView ? listViewFields(defaultView.id) : Promise.resolve([])),
    enabled: !!defaultView,
  });

  const defsQ = useQuery({
    queryKey: queryKeys.adminProductFields(projectId, {}),
    queryFn: () => listFieldDefinitions(projectId, { includeArchived: false }),
  });
  const defsById = useMemo(
    () => new Map((defsQ.data ?? []).map((d) => [d.id, d])),
    [defsQ.data],
  );

  const filters = {
    projectId,
    query: query.trim() || undefined,
    category: category === "__all__" ? undefined : category,
    status: statusFilter === "__all__" ? undefined : statusFilter,
    limit: 100,
  };
  const listKey = queryKeys.adminInventoryProducts(projectId, filters as Record<string, unknown>);

  const listQ = useQuery({
    queryKey: listKey,
    queryFn: () => searchProducts(filters),
  });

  // Realtime — invalidate on any product change in this project
  useEffect(() => {
    const channel = supabase
      .channel(`products:${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products", filter: `project_id=eq.${projectId}` },
        () => qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "inventory-products"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, qc]);

  const archiveMut = useMutation({
    mutationFn: archiveProduct,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "inventory-products"] }); toast.success("Đã lưu trữ"); },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lỗi"),
  });
  const restoreMut = useMutation({
    mutationFn: restoreProduct,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "inventory-products"] }); toast.success("Đã khôi phục"); },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lỗi"),
  });

  const editMut = useMutation({
    mutationFn: getAdminProduct,
    onSuccess: (row) => { if (row) setEditing(row); else toast.error("Không tìm thấy sản phẩm"); },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lỗi"),
  });

  // Columns: from view fields (visible only) or fallback
  const columns = useMemo(() => {
    const rows = viewFieldsQ.data?.filter((f) => f.visible).sort((a, b) => a.display_order - b.display_order);
    if (!rows || rows.length === 0) {
      return FALLBACK_CORE_KEYS.map((k) => ({
        id: `core:${k}`,
        source: "core" as const,
        core_field_key: k,
        column_label: CORE_LABEL_BY_KEY[k] ?? k,
        field_definition_id: null as string | null,
        price_code: null as string | null,
      }));
    }
    return rows.map((f) => ({
      id: f.id,
      source: f.field_source as "core" | "custom" | "price",
      core_field_key: f.core_field_key,
      field_definition_id: f.field_definition_id,
      price_code: f.price_code,
      column_label: f.column_label,
    }));
  }, [viewFieldsQ.data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="w-64 pl-8"
              placeholder="Tìm theo mã / tên…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Loại</div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tất cả</SelectItem>
                {PRODUCT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{PRODUCT_CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Trạng thái</div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tất cả</SelectItem>
                {PRODUCT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{PRODUCT_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setImporting(true)}>
              <Upload className="mr-1 h-4 w-4" /> Import CSV
            </Button>
            <Button size="sm" onClick={() => setEditing("new")}>
              <Plus className="mr-1 h-4 w-4" /> Thêm sản phẩm
            </Button>
          </div>
        ) : null}
      </div>

      {defaultView ? (
        <div className="text-xs text-muted-foreground">
          Dùng view: <span className="font-medium">{defaultView.name}</span> · {columns.length} cột
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">Chưa có view admin_table mặc định — hiển thị cột lõi.</div>
      )}

      {listQ.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : listQ.isError ? (
        <ErrorState message={(listQ.error as Error).message} onRetry={() => listQ.refetch()} />
      ) : !listQ.data || listQ.data.length === 0 ? (
        <EmptyState title="Chưa có sản phẩm" description="Thêm sản phẩm đầu tiên hoặc điều chỉnh bộ lọc." />
      ) : (
        <div className="rounded border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c.id}>{c.column_label}</TableHead>
                ))}
                <TableHead className="w-28 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQ.data.map((row) => (
                <TableRow key={row.product_id ?? row.product_code ?? Math.random().toString()}>
                  {columns.map((c) => (
                    <TableCell key={c.id}>{renderCell(row, c, defsById)}</TableCell>
                  ))}
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => row.product_id && editMut.mutate(row.product_id)} title="Sửa">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {row.product_id ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Lịch sử"
                        onClick={() => setHistoryFor({ id: row.product_id!, label: row.product_code ?? "" })}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    ) : null}
                    {canManage && row.product_id ? (
                      <Button size="icon" variant="ghost" title="Lưu trữ"
                        onClick={() => { if (confirm("Lưu trữ sản phẩm này?")) archiveMut.mutate(row.product_id!); }}>
                        <Archive className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editing ? (
        <ProductFormDialog
          projectId={projectId}
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      ) : null}
      {importing ? (
        <InventoryImportDialog projectId={projectId} onClose={() => setImporting(false)} />
      ) : null}
      {historyFor ? (
        <ProductHistoryDialog
          productId={historyFor.id}
          productLabel={historyFor.label}
          onClose={() => setHistoryFor(null)}
        />
      ) : null}
    </div>
  );
}

function renderCell(
  row: ProductSummaryRow,
  col: { source: "core" | "custom" | "price"; core_field_key: string | null; field_definition_id: string | null; price_code: string | null },
  defs: Map<string, { field_key: string; field_label: string; data_type: string; unit: string | null }>,
): React.ReactNode {
  if (col.source === "core") {
    const key = col.core_field_key ?? "";
    const v = (row as unknown as Record<string, unknown>)[key];
    if (key === "status") {
      return <Badge variant="outline">{PRODUCT_STATUS_LABELS[(v as string) as never] ?? String(v ?? "—")}</Badge>;
    }
    if (key === "category") {
      return PRODUCT_CATEGORY_LABELS[(v as string) as never] ?? String(v ?? "—");
    }
    if (key === "featured") {
      return v ? <Star className="h-4 w-4 fill-current text-amber-500" /> : <span className="text-muted-foreground">—</span>;
    }
    if (v === null || v === undefined || v === "") return <span className="text-muted-foreground">—</span>;
    return String(v);
  }
  if (col.source === "price") {
    if (col.price_code === "primary" || !col.price_code) {
      return row.primary_price ? formatPrice(row.primary_price, row.currency ?? "VND") : <span className="text-muted-foreground">—</span>;
    }
    return <span className="text-muted-foreground">—</span>;
  }
  // custom — search_inventory does not return custom values; show a hint
  const def = col.field_definition_id ? defs.get(col.field_definition_id) : null;
  return <span className="text-xs text-muted-foreground italic">{def ? `(${def.field_key})` : "—"}</span>;
}

function formatPrice(n: number, currency: string) {
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${n.toLocaleString("vi-VN")} ${currency}`;
  }
}