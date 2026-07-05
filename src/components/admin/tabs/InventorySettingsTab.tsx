import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { queryKeys } from "@/lib/queryKeys";
import { ErrorState } from "@/components/admin/EmptyState";
import { ServiceError } from "@/services/_helpers";
import {
  getProjectInventorySettings,
  upsertProjectInventorySettings,
} from "@/services/admin/projectInventorySettings.service";

export function InventorySettingsTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const key = queryKeys.adminProjectInventorySettings(projectId);
  const q = useQuery({
    queryKey: key,
    queryFn: () => getProjectInventorySettings(projectId),
  });

  const [displayName, setDisplayName] = useState("");
  const [allowCustomFields, setAllowCustomFields] = useState(true);
  const [allowProductClone, setAllowProductClone] = useState(true);
  const [allowBulkEdit, setAllowBulkEdit] = useState(true);
  const [allowBulkPriceUpdate, setAllowBulkPriceUpdate] = useState(true);
  const [allowBulkStatusUpdate, setAllowBulkStatusUpdate] = useState(true);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);

  useEffect(() => {
    if (!q.data) return;
    setDisplayName(q.data.inventory_display_name ?? "Bảng hàng");
    setAllowCustomFields(q.data.allow_custom_fields);
    setAllowProductClone(q.data.allow_product_clone);
    setAllowBulkEdit(q.data.allow_bulk_edit);
    setAllowBulkPriceUpdate(q.data.allow_bulk_price_update);
    setAllowBulkStatusUpdate(q.data.allow_bulk_status_update);
    setRealtimeEnabled(q.data.realtime_enabled);
  }, [q.data]);

  const mut = useMutation({
    mutationFn: async () =>
      upsertProjectInventorySettings({
        project_id: projectId,
        inventory_display_name: displayName.trim() || "Bảng hàng",
        allow_custom_fields: allowCustomFields,
        allow_product_clone: allowProductClone,
        allow_bulk_edit: allowBulkEdit,
        allow_bulk_price_update: allowBulkPriceUpdate,
        allow_bulk_status_update: allowBulkStatusUpdate,
        realtime_enabled: realtimeEnabled,
      }),
    onSuccess: () => {
      toast.success("Đã lưu cấu hình");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lưu thất bại"),
  });

  if (q.isLoading) return <Skeleton className="h-64 w-full" />;
  if (q.error) return <ErrorState message="Không tải được cấu hình." onRetry={() => q.refetch()} />;

  const readOnly = !canManage;

  return (
    <div className="max-w-2xl space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Hiển thị</h3>
        <div className="space-y-1">
          <Label className="text-xs">Tên gọi bảng hàng</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={readOnly} placeholder="Bảng hàng, Rổ hàng…" />
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Quyền chỉnh sửa</h3>
        <SwitchRow label="Cho phép trường tuỳ chỉnh" description="Dự án được định nghĩa và dùng custom fields." value={allowCustomFields} onChange={setAllowCustomFields} disabled={readOnly} />
        <SwitchRow label="Cho phép nhân bản sản phẩm" description="Cho phép clone sản phẩm khi tạo mới." value={allowProductClone} onChange={setAllowProductClone} disabled={readOnly} />
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Cập nhật hàng loạt</h3>
        <SwitchRow label="Cho phép bulk edit chung" value={allowBulkEdit} onChange={setAllowBulkEdit} disabled={readOnly} />
        <SwitchRow label="Cho phép bulk cập nhật giá" value={allowBulkPriceUpdate} onChange={setAllowBulkPriceUpdate} disabled={readOnly} />
        <SwitchRow label="Cho phép bulk cập nhật trạng thái" value={allowBulkStatusUpdate} onChange={setAllowBulkStatusUpdate} disabled={readOnly} />
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Realtime</h3>
        <SwitchRow label="Bật realtime cho bảng hàng" description="Thay đổi hiển thị tức thời cho mọi người." value={realtimeEnabled} onChange={setRealtimeEnabled} disabled={readOnly} />
      </section>

      {canManage ? (
        <div className="flex justify-end">
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            <Save className="mr-1 h-4 w-4" /> Lưu cấu hình
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Bạn chỉ có quyền xem.</p>
      )}
    </div>
  );
}

function SwitchRow({
  label, description, value, onChange, disabled,
}: {
  label: string; description?: string;
  value: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <Switch checked={value} onCheckedChange={onChange} disabled={disabled} />
    </label>
  );
}
