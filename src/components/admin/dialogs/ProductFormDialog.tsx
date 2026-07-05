import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/queryKeys";
import { ServiceError } from "@/services/_helpers";
import {
  listProductCustomValues,
  createProductWithValues,
  updateProductWithValues,
  PRODUCT_STATUSES,
  PRODUCT_STATUS_LABELS,
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type ProductPriceInput,
  type ProductRow,
  type ProductStatus,
  type ProductCategory,
} from "@/services/admin/adminProducts.service";
import { supabase } from "@/integrations/supabase/client";
import {
  listFieldDefinitions,
  type FieldDataType,
  type FieldDefRow,
} from "@/services/admin/fieldDefinitions.service";
import { listFieldOptions } from "@/services/admin/fieldOptions.service";
import { listProjectProductTypes } from "@/services/admin/productTypes.service";
import { listProjectZones } from "@/services/admin/projectZones.service";
import { listProjectBuildings } from "@/services/admin/buildings.service";

type Values = Record<string, unknown>;

function toInputValue(v: unknown, t: FieldDataType): string {
  if (v === null || v === undefined) return "";
  if (t === "boolean") return String(v);
  if (t === "multi_select") return "";
  return String(v);
}

export function ProductFormDialog({
  projectId,
  product,
  onClose,
  onSaved,
}: {
  projectId: string;
  product: ProductRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!product;

  // Core fields
  const [productCode, setProductCode] = useState(product?.product_code ?? "");
  const [productName, setProductName] = useState(product?.product_name ?? "");
  const [category, setCategory] = useState<ProductCategory>((product?.category as ProductCategory) ?? "apartment");
  const [status, setStatus] = useState<ProductStatus>((product?.status as ProductStatus) ?? "available");
  const [productTypeId, setProductTypeId] = useState<string | "__none__">(product?.product_type_id ?? "__none__");
  const [zoneId, setZoneId] = useState<string | "__none__">(product?.zone_id ?? "__none__");
  const [buildingId, setBuildingId] = useState<string | "__none__">(product?.building_id ?? "__none__");
  const [externalCode, setExternalCode] = useState(product?.external_code ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [featured, setFeatured] = useState<boolean>(product?.featured ?? false);

  const productTypesQ = useQuery({
    queryKey: queryKeys.adminProjectProductTypes(projectId),
    queryFn: () => listProjectProductTypes(projectId),
  });
  const zonesQ = useQuery({
    queryKey: queryKeys.adminProjectZones(projectId),
    queryFn: () => listProjectZones(projectId, false),
  });
  const buildingsQ = useQuery({
    queryKey: queryKeys.adminProjectBuildings(projectId),
    queryFn: () => listProjectBuildings(projectId, false),
  });

  // Field definitions filtered by product type
  const fieldsQ = useQuery({
    queryKey: queryKeys.adminProductFields(projectId, {}),
    queryFn: () => listFieldDefinitions(projectId, { includeArchived: false }),
  });
  const applicableFields = useMemo<FieldDefRow[]>(() => {
    if (!fieldsQ.data) return [];
    const ptId = productTypeId === "__none__" ? null : productTypeId;
    return fieldsQ.data.filter(
      (f) => f.product_type_id === null || f.product_type_id === ptId,
    );
  }, [fieldsQ.data, productTypeId]);

  // Existing custom values
  const cvQ = useQuery({
    queryKey: product ? ["admin", "products", "custom-values", product.id] : ["admin", "products", "custom-values", "new"],
    queryFn: () => (product ? listProductCustomValues(product.id) : Promise.resolve([])),
    enabled: !!product,
  });

  // Existing price options (edit mode)
  const pricesQ = useQuery({
    queryKey: product ? ["admin", "products", "prices", product.id] : ["admin", "products", "prices", "new"],
    queryFn: async () => {
      if (!product) return [] as ProductPriceInput[];
      const res = await supabase
        .from("product_price_options")
        .select("price_code, price_name, amount, currency, is_primary, status")
        .eq("product_id", product.id)
        .eq("status", "active")
        .order("is_primary", { ascending: false });
      if (res.error) throw new ServiceError(res.error.message, res.error);
      return (res.data ?? []) as ProductPriceInput[];
    },
    enabled: !!product,
  });
  const [prices, setPrices] = useState<ProductPriceInput[]>([]);
  useEffect(() => {
    if (!pricesQ.data) return;
    setPrices(pricesQ.data.length > 0 ? pricesQ.data : []);
  }, [pricesQ.data]);

  const [values, setValues] = useState<Values>({});
  useEffect(() => {
    if (!cvQ.data) { if (!product) setValues({}); return; }
    const next: Values = {};
    for (const row of cvQ.data) {
      const v = row.value_text ?? row.value_integer ?? row.value_decimal ?? row.value_boolean ?? row.value_date ?? row.value_datetime ?? row.value_jsonb;
      if (v !== undefined && v !== null) next[row.field_definition_id] = v;
    }
    setValues(next);
  }, [cvQ.data, product]);

  const filteredBuildings = useMemo(() => {
    if (!buildingsQ.data) return [];
    if (zoneId === "__none__") return buildingsQ.data;
    return buildingsQ.data.filter((b) => b.zone_id === zoneId || b.zone_id === null);
  }, [buildingsQ.data, zoneId]);

  const mut = useMutation({
    mutationFn: async () => {
      const core = {
        product_code: productCode.trim(),
        product_name: productName.trim() || null,
        category,
        status,
        product_type_id: productTypeId === "__none__" ? null : productTypeId,
        zone_id: zoneId === "__none__" ? null : zoneId,
        building_id: buildingId === "__none__" ? null : buildingId,
        external_code: externalCode.trim() || null,
        description: description.trim() || null,
        featured,
      };

      // Build custom map { field_key: value } — null clears; omitted keys unchanged.
      const customMap: Record<string, unknown> = {};
      for (const f of applicableFields) {
        const raw = values[f.id];
        const empty = raw === undefined || raw === null || raw === "";
        if (empty) {
          customMap[f.field_key] = null;
          continue;
        }
        const t = f.data_type as FieldDataType;
        if (t === "boolean") customMap[f.field_key] = raw === true || raw === "true";
        else if (t === "integer") customMap[f.field_key] = Math.trunc(Number(raw));
        else if (t === "decimal") customMap[f.field_key] = Number(raw);
        else if (t === "multi_select") customMap[f.field_key] = Array.isArray(raw) ? raw : [];
        else customMap[f.field_key] = String(raw);
      }

      // Validate pricing client-side
      const cleanedPrices = prices
        .filter((p) => p.price_code.trim().length > 0)
        .map((p) => ({ ...p, price_code: p.price_code.trim(), amount: Number(p.amount) || 0 }));
      const activePrimary = cleanedPrices.filter((p) => p.is_primary && (p.status ?? "active") === "active");
      if (activePrimary.length > 1) throw new ServiceError("Chỉ được có 1 giá chính (is_primary) đang hoạt động");
      const codes = new Set<string>();
      for (const p of cleanedPrices) {
        if (codes.has(p.price_code)) throw new ServiceError(`Trùng price_code: ${p.price_code}`);
        codes.add(p.price_code);
        if (p.amount < 0) throw new ServiceError(`Giá không được âm: ${p.price_code}`);
      }

      if (isEdit) {
        await updateProductWithValues({
          productId: product!.id,
          core,
          custom: customMap,
          prices: cleanedPrices,
        });
        return product!.id;
      } else {
        return await createProductWithValues({
          projectId,
          core,
          custom: customMap,
          prices: cleanedPrices,
        });
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Đã cập nhật sản phẩm" : "Đã tạo sản phẩm");
      qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "inventory-products"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      onSaved();
    },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Không lưu được"),
  });

  const submit = () => {
    if (!productCode.trim()) return toast.error("Nhập Mã SP");
    mut.mutate();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Sửa sản phẩm · ${product!.product_code}` : "Tạo sản phẩm"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Core fields */}
          <section className="space-y-3">
            <div className="text-sm font-semibold">Thông tin cơ bản</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Mã SP *</Label>
                <Input value={productCode} onChange={(e) => setProductCode(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tên hiển thị</Label>
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Loại (category)</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as ProductCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{PRODUCT_CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Trạng thái</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ProductStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{PRODUCT_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Loại sản phẩm (product type)</Label>
                <Select value={productTypeId} onValueChange={(v) => setProductTypeId(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Không —</SelectItem>
                    {(productTypesQ.data ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Mã ngoài</Label>
                <Input value={externalCode} onChange={(e) => setExternalCode(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Phân khu</Label>
                <Select value={zoneId} onValueChange={(v) => { setZoneId(v); setBuildingId("__none__"); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Không —</SelectItem>
                    {(zonesQ.data ?? []).map((z) => (
                      <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tòa nhà</Label>
                <Select value={buildingId} onValueChange={setBuildingId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Không —</SelectItem>
                    {filteredBuildings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mô tả</Label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={featured} onCheckedChange={setFeatured} id="featured" />
              <Label htmlFor="featured">Sản phẩm nổi bật</Label>
            </div>
          </section>

          <Separator />

          {/* Custom fields */}
          <section className="space-y-3">
            <div className="text-sm font-semibold">Trường tuỳ chỉnh</div>
            {fieldsQ.isLoading ? (
              <Skeleton className="h-20" />
            ) : applicableFields.length === 0 ? (
              <p className="text-xs text-muted-foreground">Chưa có trường tuỳ chỉnh phù hợp với loại sản phẩm này.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {applicableFields.map((f) => (
                  <CustomFieldInput
                    key={f.id}
                    field={f}
                    value={values[f.id]}
                    onChange={(v) => setValues((prev) => ({ ...prev, [f.id]: v }))}
                  />
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* Pricing */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Giá bán</div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setPrices((p) => [
                    ...p,
                    { price_code: p.length === 0 ? "primary" : "", amount: 0, currency: "VND", is_primary: p.length === 0, status: "active" },
                  ])
                }
              >
                <Plus className="mr-1 h-4 w-4" /> Thêm giá
              </Button>
            </div>
            {prices.length === 0 ? (
              <p className="text-xs text-muted-foreground">Chưa có giá. Thêm ít nhất 1 giá primary để hiển thị trên lưới.</p>
            ) : (
              <div className="space-y-2">
                {prices.map((p, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end rounded border p-2">
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Mã (code)</Label>
                      <Input
                        value={p.price_code}
                        placeholder="primary"
                        onChange={(e) => setPrices((arr) => arr.map((x, i) => i === idx ? { ...x, price_code: e.target.value.toLowerCase() } : x))}
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Tên</Label>
                      <Input
                        value={p.price_name ?? ""}
                        onChange={(e) => setPrices((arr) => arr.map((x, i) => i === idx ? { ...x, price_name: e.target.value || null } : x))}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Giá</Label>
                      <Input
                        type="number"
                        min={0}
                        value={String(p.amount)}
                        onChange={(e) => setPrices((arr) => arr.map((x, i) => i === idx ? { ...x, amount: Number(e.target.value) } : x))}
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <Label className="text-xs">CCY</Label>
                      <Input
                        value={p.currency ?? "VND"}
                        onChange={(e) => setPrices((arr) => arr.map((x, i) => i === idx ? { ...x, currency: e.target.value } : x))}
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <Switch
                        checked={!!p.is_primary}
                        onCheckedChange={(c) => setPrices((arr) => arr.map((x, i) => i === idx ? { ...x, is_primary: c } : x))}
                      />
                      <Label className="text-xs">Chính</Label>
                    </div>
                    <div className="col-span-1 text-right">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setPrices((arr) => arr.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={submit} disabled={mut.isPending}>{mut.isPending ? "Đang lưu…" : "Lưu"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomFieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDefRow;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const t = field.data_type as FieldDataType;
  const label = (
    <Label className="flex items-center gap-1">
      {field.field_label}
      {field.is_required ? <span className="text-destructive">*</span> : null}
      {field.unit ? <span className="text-xs text-muted-foreground">({field.unit})</span> : null}
    </Label>
  );

  if (t === "boolean") {
    return (
      <div className="flex items-center justify-between rounded border px-3 py-2 col-span-2 md:col-span-1">
        <div>
          {label}
          {field.help_text ? <div className="text-xs text-muted-foreground">{field.help_text}</div> : null}
        </div>
        <Switch checked={value === true || value === "true"} onCheckedChange={onChange} />
      </div>
    );
  }

  if (t === "long_text") {
    return (
      <div className="space-y-1.5 col-span-2">
        {label}
        <Textarea rows={3} value={toInputValue(value, t)} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder ?? ""} />
      </div>
    );
  }

  if (t === "single_select") {
    return <SelectField field={field} value={value} onChange={onChange} label={label} multi={false} />;
  }
  if (t === "multi_select") {
    return <SelectField field={field} value={value} onChange={onChange} label={label} multi />;
  }

  const inputType =
    t === "integer" || t === "decimal" ? "number"
    : t === "date" ? "date"
    : t === "datetime" ? "datetime-local"
    : t === "url" ? "url"
    : t === "phone" ? "tel"
    : "text";

  return (
    <div className="space-y-1.5">
      {label}
      <Input
        type={inputType}
        value={toInputValue(value, t)}
        placeholder={field.placeholder ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      />
      {field.help_text ? <p className="text-xs text-muted-foreground">{field.help_text}</p> : null}
    </div>
  );
}

function SelectField({
  field, value, onChange, label, multi,
}: {
  field: FieldDefRow;
  value: unknown;
  onChange: (v: unknown) => void;
  label: React.ReactNode;
  multi: boolean;
}) {
  const optsQ = useQuery({
    queryKey: queryKeys.adminProductFieldOptions(field.id),
    queryFn: () => listFieldOptions(field.id),
  });
  const options = (optsQ.data ?? []).filter((o) => o.status === "active");

  if (!multi) {
    return (
      <div className="space-y-1.5">
        {label}
        <Select value={(value as string) ?? ""} onValueChange={(v) => onChange(v || null)}>
          <SelectTrigger><SelectValue placeholder="— Chọn —" /></SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.id} value={o.option_value}>{o.option_label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  const selected: string[] = Array.isArray(value) ? value.map(String) : [];
  const toggle = (v: string) => {
    const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
    onChange(next);
  };
  return (
    <div className="space-y-1.5 col-span-2">
      {label}
      <div className="flex flex-wrap gap-2 rounded border p-2 min-h-[42px]">
        {options.length === 0 ? <span className="text-xs text-muted-foreground">Chưa có option</span> : null}
        {options.map((o) => {
          const on = selected.includes(o.option_value);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.option_value)}
              className={`rounded-full border px-2.5 py-0.5 text-xs transition ${on ? "bg-primary text-primary-foreground border-primary" : "bg-muted"}`}
            >
              {o.option_label}
            </button>
          );
        })}
      </div>
    </div>
  );
}