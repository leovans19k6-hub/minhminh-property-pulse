import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { queryKeys } from "@/lib/queryKeys";
import { ServiceError } from "@/services/_helpers";
import {
  getTemplate,
  listTemplateFields,
  listTemplateViews,
  createTemplateField,
  deleteTemplateField,
  createTemplateView,
  deleteTemplateView,
  type TemplateFieldRow,
} from "@/services/admin/inventoryTemplates.service";
import { FIELD_DATA_TYPES, FIELD_DATA_TYPE_LABELS, validateFieldKey, type FieldDataType } from "@/services/admin/fieldDefinitions.service";
import { VIEW_TYPES, VIEW_TYPE_LABELS, validateViewCode, type ViewType } from "@/services/admin/inventoryViews.service";
import { useAuth } from "@/features/auth/AuthProvider";

export const Route = createFileRoute("/admin/inventory-templates/$templateId")({
  component: TemplateDetailPage,
});

function TemplateDetailPage() {
  const { templateId } = Route.useParams();
  const { currentUser } = useAuth();
  const canManage = !!currentUser?.isActive && (currentUser.isSuperAdmin || currentUser.isAdmin);

  const tplQ = useQuery({
    queryKey: queryKeys.adminInventoryTemplateDetail(templateId),
    queryFn: () => getTemplate(templateId),
  });

  if (tplQ.isLoading) return <Skeleton className="h-40 w-full" />;
  if (!tplQ.data) return <p className="text-sm text-muted-foreground">Không tìm thấy template.</p>;
  const t = tplQ.data;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t.name}
        description={`${t.code}${t.project_category ? ` · ${t.project_category}` : ""}`}
        breadcrumb={
          <Link to="/admin/inventory-templates" className="inline-flex items-center gap-1 hover:underline">
            <ArrowLeft className="h-3 w-3" /> Template
          </Link>
        }
        actions={<Badge variant={t.status === "active" ? "default" : "outline"}>{t.status}</Badge>}
      />
      <Tabs defaultValue="fields">
        <TabsList>
          <TabsTrigger value="fields">Trường tuỳ chỉnh</TabsTrigger>
          <TabsTrigger value="views">Bảng hiển thị</TabsTrigger>
        </TabsList>
        <TabsContent value="fields" className="mt-4">
          <TemplateFieldsPanel templateId={templateId} canManage={canManage} />
        </TabsContent>
        <TabsContent value="views" className="mt-4">
          <TemplateViewsPanel templateId={templateId} canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TemplateFieldsPanel({ templateId, canManage }: { templateId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const q = useQuery({
    queryKey: queryKeys.adminInventoryTemplateFields(templateId),
    queryFn: () => listTemplateFields(templateId),
  });
  const delMut = useMutation({
    mutationFn: deleteTemplateField,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.adminInventoryTemplateFields(templateId) }),
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lỗi"),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {canManage ? (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" /> Thêm trường
          </Button>
        ) : null}
      </div>
      {q.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (q.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có trường nào.</p>
      ) : (
        <div className="rounded border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nhãn</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Kiểu</TableHead>
                <TableHead>Nhóm</TableHead>
                <TableHead className="w-24 text-right">Xoá</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).map((f: TemplateFieldRow) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.field_label}</TableCell>
                  <TableCell className="font-mono text-xs">{f.field_key}</TableCell>
                  <TableCell>{FIELD_DATA_TYPE_LABELS[f.data_type as FieldDataType] ?? f.data_type}</TableCell>
                  <TableCell>{f.field_group ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {canManage ? (
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Xoá trường này?")) delMut.mutate(f.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {creating ? <NewTemplateFieldDialog templateId={templateId} onClose={() => setCreating(false)} /> : null}
    </div>
  );
}

function NewTemplateFieldDialog({ templateId, onClose }: { templateId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [dataType, setDataType] = useState<FieldDataType>("text");
  const [group, setGroup] = useState("");
  const [unit, setUnit] = useState("");
  const [required, setRequired] = useState(false);
  const [optionsText, setOptionsText] = useState("");

  const keyErr = key ? validateFieldKey(key) : null;
  const isSelect = dataType === "single_select" || dataType === "multi_select";

  const mut = useMutation({
    mutationFn: () => {
      const options = isSelect
        ? optionsText.split("\n").map((l) => l.trim()).filter(Boolean).map((line, i) => {
            const [value, label] = line.split("|").map((s) => s.trim());
            return { value, label: label || value, display_order: i, status: "active" };
          })
        : [];
      return createTemplateField({
        template_id: templateId,
        field_label: label.trim(),
        field_key: key.trim(),
        field_group: group.trim() || null,
        data_type: dataType,
        unit: unit.trim() || null,
        is_required: required,
        options: options as unknown as never,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminInventoryTemplateFields(templateId) });
      toast.success("Đã thêm trường");
      onClose();
    },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lỗi"),
  });

  return (
    <Dialog open onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>Thêm trường vào template</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nhãn</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Key</Label>
              <Input value={key} onChange={(e) => setKey(e.target.value.toLowerCase())} placeholder="ma_view" />
              {keyErr ? <p className="text-xs text-destructive">{keyErr}</p> : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Kiểu dữ liệu</Label>
              <Select value={dataType} onValueChange={(v) => setDataType(v as FieldDataType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELD_DATA_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{FIELD_DATA_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Đơn vị</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="m² / phòng" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Nhóm (group)</Label>
            <Input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Thông tin cơ bản" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="req">Bắt buộc</Label>
            <Switch id="req" checked={required} onCheckedChange={setRequired} />
          </div>
          {isSelect ? (
            <div className="space-y-1">
              <Label>Lựa chọn (mỗi dòng: value | label)</Label>
              <Textarea rows={4} value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder={"north | Bắc\nsouth | Nam"} />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={() => mut.mutate()} disabled={!label.trim() || !key.trim() || !!keyErr || mut.isPending}>
            {mut.isPending ? "Đang lưu…" : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateViewsPanel({ templateId, canManage }: { templateId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const q = useQuery({
    queryKey: queryKeys.adminInventoryTemplateViews(templateId),
    queryFn: () => listTemplateViews(templateId),
  });
  const delMut = useMutation({
    mutationFn: deleteTemplateView,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.adminInventoryTemplateViews(templateId) }),
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lỗi"),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {canManage ? (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" /> Thêm view
          </Button>
        ) : null}
      </div>
      {q.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (q.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có view nào.</p>
      ) : (
        <div className="rounded border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Số cột</TableHead>
                <TableHead className="w-24 text-right">Xoá</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).map((v) => {
                const cfg = (v.configuration ?? {}) as { columns?: unknown[] };
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell className="font-mono text-xs">{v.code}</TableCell>
                    <TableCell>{VIEW_TYPE_LABELS[v.view_type as ViewType] ?? v.view_type}</TableCell>
                    <TableCell>{Array.isArray(cfg.columns) ? cfg.columns.length : 0}</TableCell>
                    <TableCell className="text-right">
                      {canManage ? (
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("Xoá view này?")) delMut.mutate(v.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {creating ? <NewTemplateViewDialog templateId={templateId} onClose={() => setCreating(false)} /> : null}
    </div>
  );
}

function NewTemplateViewDialog({ templateId, onClose }: { templateId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [viewType, setViewType] = useState<ViewType>("admin_table");
  const [configText, setConfigText] = useState<string>(
    JSON.stringify({ is_default: false, page_size: 30, columns: [
      { field_source: "core", core_field_key: "product_code", column_label: "Mã", display_order: 0 },
      { field_source: "core", core_field_key: "product_name", column_label: "Tên", display_order: 1 },
      { field_source: "core", core_field_key: "status", column_label: "Trạng thái", display_order: 2 },
    ]}, null, 2),
  );

  const codeErr = code ? validateViewCode(code) : null;
  let configErr: string | null = null;
  let parsed: unknown = {};
  try { parsed = JSON.parse(configText); } catch { configErr = "JSON không hợp lệ"; }

  const mut = useMutation({
    mutationFn: () =>
      createTemplateView({
        template_id: templateId,
        name: name.trim(),
        code: code.trim(),
        view_type: viewType,
        configuration: parsed as never,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminInventoryTemplateViews(templateId) });
      toast.success("Đã thêm view");
      onClose();
    },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lỗi"),
  });

  return (
    <Dialog open onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Thêm view vào template</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tên</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toLowerCase())} placeholder="admin_default" />
              {codeErr ? <p className="text-xs text-destructive">{codeErr}</p> : null}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Loại</Label>
            <Select value={viewType} onValueChange={(v) => setViewType(v as ViewType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VIEW_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{VIEW_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Configuration (JSON)</Label>
            <Textarea rows={12} className="font-mono text-xs" value={configText} onChange={(e) => setConfigText(e.target.value)} />
            {configErr ? <p className="text-xs text-destructive">{configErr}</p> : null}
            <p className="text-xs text-muted-foreground">
              Mảng <code>columns</code>: mỗi item có <code>field_source</code> (core/custom/price) + key phù hợp.
              Với custom dùng <code>field_key</code> khớp template field.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={() => mut.mutate()} disabled={!name.trim() || !code.trim() || !!codeErr || !!configErr || mut.isPending}>
            {mut.isPending ? "Đang lưu…" : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}