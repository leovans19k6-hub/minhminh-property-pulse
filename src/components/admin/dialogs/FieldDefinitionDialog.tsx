import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { queryKeys } from "@/lib/queryKeys";
import { ServiceError } from "@/services/_helpers";
import {
  createFieldDefinition,
  updateFieldDefinition,
  countFieldUsage,
  validateFieldKey,
  FIELD_DATA_TYPES,
  FIELD_DATA_TYPE_LABELS,
  type FieldDataType,
  type FieldDefRow,
} from "@/services/admin/fieldDefinitions.service";
import { listProjectProductTypes } from "@/services/admin/productTypes.service";

type ValidationRules = {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  precision?: number;
  pattern?: string;
};

export function FieldDefinitionDialog({
  projectId,
  field,
  onClose,
  onSaved,
}: {
  projectId: string;
  field: FieldDefRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!field;

  const [fieldKey, setFieldKey] = useState(field?.field_key ?? "");
  const [fieldLabel, setFieldLabel] = useState(field?.field_label ?? "");
  const [fieldGroup, setFieldGroup] = useState(field?.field_group ?? "");
  const [dataType, setDataType] = useState<FieldDataType>((field?.data_type as FieldDataType) ?? "text");
  const [unit, setUnit] = useState(field?.unit ?? "");
  const [placeholder, setPlaceholder] = useState(field?.placeholder ?? "");
  const [helpText, setHelpText] = useState(field?.help_text ?? "");
  const [productTypeId, setProductTypeId] = useState<string>(field?.product_type_id ?? "__all__");
  const [isRequired, setIsRequired] = useState(field?.is_required ?? false);
  const [isFilterable, setIsFilterable] = useState(field?.is_filterable ?? false);
  const [isSortable, setIsSortable] = useState(field?.is_sortable ?? false);
  const [isSearchable, setIsSearchable] = useState(field?.is_searchable ?? false);
  const [showInAdminTable, setShowInAdminTable] = useState(field?.show_in_admin_table ?? false);
  const [showInMobileList, setShowInMobileList] = useState(field?.show_in_mobile_list ?? false);
  const [showInProductDetail, setShowInProductDetail] = useState(field?.show_in_product_detail ?? true);
  const [showInForm, setShowInForm] = useState(field?.show_in_form ?? true);
  const [displayOrder, setDisplayOrder] = useState(field?.display_order ?? 0);
  const [status, setStatus] = useState<"active" | "archived">(
    (field?.status as "active" | "archived") ?? "active",
  );

  const initialRules = (field?.validation_rules ?? {}) as ValidationRules;
  const [rules, setRules] = useState<ValidationRules>(initialRules);

  const productTypesQ = useQuery({
    queryKey: queryKeys.adminProjectProductTypes(projectId),
    queryFn: () => listProjectProductTypes(projectId),
  });

  const usageQ = useQuery({
    queryKey: [...queryKeys.adminProductFieldDetail(field?.id ?? "new"), "usage"],
    queryFn: () => countFieldUsage(field!.id),
    enabled: !!field,
  });

  const keyLocked = isEdit && (usageQ.data ?? 0) > 0;
  const typeLocked = keyLocked;

  const keyError = useMemo(() => (isEdit ? null : validateFieldKey(fieldKey)), [fieldKey, isEdit]);

  const mut = useMutation({
    mutationFn: async () => {
      const validation_rules = cleanRules(rules, dataType);
      const payload = {
        project_id: projectId,
        product_type_id: productTypeId === "__all__" ? null : productTypeId,
        field_key: fieldKey.trim(),
        field_label: fieldLabel.trim(),
        field_group: fieldGroup.trim() || null,
        data_type: dataType,
        unit: unit.trim() || null,
        placeholder: placeholder.trim() || null,
        help_text: helpText.trim() || null,
        is_required: isRequired,
        is_filterable: isFilterable,
        is_sortable: isSortable,
        is_searchable: isSearchable,
        show_in_admin_table: showInAdminTable,
        show_in_mobile_list: showInMobileList,
        show_in_product_detail: showInProductDetail,
        show_in_form: showInForm,
        display_order: displayOrder,
        status,
        validation_rules,
      };
      if (isEdit && field) {
        // Bỏ field_key khỏi update nếu bị lock
        const patch = keyLocked ? { ...payload, field_key: field.field_key } : payload;
        const updatePatch = typeLocked ? { ...patch, data_type: field.data_type } : patch;
        await updateFieldDefinition(field.id, updatePatch);
      } else {
        await createFieldDefinition(payload);
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Đã cập nhật trường" : "Đã tạo trường");
      qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "product-fields"] });
      onSaved();
    },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lưu thất bại"),
  });

  const canSubmit =
    !!fieldLabel.trim() &&
    !!fieldKey.trim() &&
    !keyError &&
    !mut.isPending;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa trường tuỳ chỉnh" : "Thêm trường tuỳ chỉnh"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Field key * (snake_case)</Label>
              <Input
                value={fieldKey}
                onChange={(e) => setFieldKey(e.target.value.toLowerCase())}
                placeholder="vi_du: view_direction"
                disabled={keyLocked}
              />
              {keyLocked ? (
                <p className="text-xs text-muted-foreground">Đã có dữ liệu — không thể đổi key.</p>
              ) : keyError ? (
                <p className="text-xs text-destructive">{keyError}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nhãn hiển thị *</Label>
              <Input value={fieldLabel} onChange={(e) => setFieldLabel(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Kiểu dữ liệu *</Label>
              <Select value={dataType} onValueChange={(v) => setDataType(v as FieldDataType)} disabled={typeLocked}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELD_DATA_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{FIELD_DATA_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {typeLocked ? (
                <p className="text-xs text-muted-foreground">Đã có dữ liệu — không thể đổi kiểu.</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Áp dụng cho loại SP</Label>
              <Select value={productTypeId} onValueChange={setProductTypeId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tất cả loại sản phẩm</SelectItem>
                  {(productTypesQ.data ?? []).map((pt) => (
                    <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nhóm trường</Label>
              <Input value={fieldGroup} onChange={(e) => setFieldGroup(e.target.value)} placeholder="Thông tin chung" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Đơn vị</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="m², triệu…" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Thứ tự</Label>
              <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value) || 0)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Placeholder</Label>
              <Input value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Trạng thái</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "active" | "archived")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Hoạt động</SelectItem>
                  <SelectItem value="archived">Lưu trữ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Hướng dẫn</Label>
            <Textarea rows={2} value={helpText} onChange={(e) => setHelpText(e.target.value)} />
          </div>

          <TypeSpecificRules dataType={dataType} rules={rules} setRules={setRules} />

          <Separator />

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Hành vi</p>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              <Toggle label="Bắt buộc" value={isRequired} onChange={setIsRequired} />
              <Toggle label="Hiện trong form" value={showInForm} onChange={setShowInForm} />
              <Toggle label="Cho lọc" value={isFilterable} onChange={setIsFilterable} />
              <Toggle label="Cho sắp xếp" value={isSortable} onChange={setIsSortable} />
              <Toggle label="Cho tìm kiếm" value={isSearchable} onChange={setIsSearchable} />
              <Toggle label="Hiện chi tiết SP" value={showInProductDetail} onChange={setShowInProductDetail} />
              <Toggle label="Hiện bảng admin" value={showInAdminTable} onChange={setShowInAdminTable} />
              <Toggle label="Hiện danh sách mobile" value={showInMobileList} onChange={setShowInMobileList} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button onClick={() => mut.mutate()} disabled={!canSubmit}>Lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span>{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </label>
  );
}

function TypeSpecificRules({
  dataType, rules, setRules,
}: {
  dataType: FieldDataType;
  rules: ValidationRules;
  setRules: (r: ValidationRules) => void;
}) {
  if (dataType === "text" || dataType === "long_text" || dataType === "url" || dataType === "phone") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Độ dài tối thiểu</Label>
          <Input type="number" value={rules.minLength ?? ""} onChange={(e) => setRules({ ...rules, minLength: numOrUndef(e.target.value) })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Độ dài tối đa</Label>
          <Input type="number" value={rules.maxLength ?? ""} onChange={(e) => setRules({ ...rules, maxLength: numOrUndef(e.target.value) })} />
        </div>
      </div>
    );
  }
  if (dataType === "integer" || dataType === "decimal") {
    return (
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Giá trị min</Label>
          <Input type="number" value={rules.min ?? ""} onChange={(e) => setRules({ ...rules, min: numOrUndef(e.target.value) })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Giá trị max</Label>
          <Input type="number" value={rules.max ?? ""} onChange={(e) => setRules({ ...rules, max: numOrUndef(e.target.value) })} />
        </div>
        {dataType === "decimal" ? (
          <div className="space-y-1">
            <Label className="text-xs">Số chữ số thập phân</Label>
            <Input type="number" value={rules.precision ?? ""} onChange={(e) => setRules({ ...rules, precision: numOrUndef(e.target.value) })} />
          </div>
        ) : null}
      </div>
    );
  }
  if (dataType === "single_select" || dataType === "multi_select") {
    return (
      <p className="text-xs text-muted-foreground">
        Danh sách lựa chọn được cấu hình sau khi lưu trường (nút “Tuỳ chọn” trong bảng).
      </p>
    );
  }
  return null;
}

function numOrUndef(s: string): number | undefined {
  if (s === "" || s === "-") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function cleanRules(rules: ValidationRules, dataType: FieldDataType): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const allow: (keyof ValidationRules)[] =
    dataType === "integer" || dataType === "decimal"
      ? ["min", "max", ...(dataType === "decimal" ? (["precision"] as const) : [])]
      : dataType === "text" || dataType === "long_text" || dataType === "url" || dataType === "phone"
      ? ["minLength", "maxLength"]
      : [];
  for (const k of allow) {
    const v = rules[k];
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}
