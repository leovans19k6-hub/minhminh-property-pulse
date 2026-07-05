import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Archive, RotateCcw, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { queryKeys } from "@/lib/queryKeys";
import { ServiceError } from "@/services/_helpers";
import {
  getProductAdminDetail,
  cloneProduct,
  archiveProductRpc,
  restoreProductRpc,
} from "@/services/admin/adminProducts.service";

export const Route = createFileRoute("/admin/projects/$projectId/products/$productId")({
  component: ProductAdminDetail,
});

type Detail = {
  product: Record<string, unknown> & { id: string; product_code: string; product_name: string | null; status: string; archived_at: string | null };
  project: Record<string, unknown> & { name: string };
  zone: Record<string, unknown> | null;
  building: Record<string, unknown> | null;
  floor: Record<string, unknown> | null;
  product_type: Record<string, unknown> | null;
  custom_values: Array<{ field: { field_label: string; field_key: string; unit: string | null }; value: Record<string, unknown> }>;
  price_options: Array<{ price_code: string; price_name: string | null; amount: number; currency: string; is_primary: boolean; status: string }>;
  media: Array<Record<string, unknown>>;
  status_history: Array<{ old_status: string; new_status: string; created_at: string; changed_by: string | null }>;
  price_history: Array<{ price_code: string; old_amount: number | null; new_amount: number; currency: string; changed_at: string }>;
  permissions: { can_manage: boolean; can_view_history: boolean };
};

function ProductAdminDetail() {
  const { projectId, productId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [cloneOpen, setCloneOpen] = useState(false);
  const [newCode, setNewCode] = useState("");

  const q = useQuery({
    queryKey: queryKeys.adminProductDetail(productId),
    queryFn: () => getProductAdminDetail(productId) as Promise<Detail | null>,
  });

  const cloneMut = useMutation({
    mutationFn: () => cloneProduct(productId, newCode.trim()),
    onSuccess: (newId) => {
      toast.success("Đã nhân bản sản phẩm");
      setCloneOpen(false);
      qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "inventory-products"] });
      navigate({ to: "/admin/projects/$projectId/products/$productId", params: { projectId, productId: newId } });
    },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Không nhân bản được"),
  });

  const archiveMut = useMutation({
    mutationFn: () => archiveProductRpc(productId),
    onSuccess: () => { toast.success("Đã lưu trữ"); qc.invalidateQueries({ queryKey: queryKeys.adminProductDetail(productId) }); },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Không lưu trữ được"),
  });
  const restoreMut = useMutation({
    mutationFn: () => restoreProductRpc(productId),
    onSuccess: () => { toast.success("Đã khôi phục"); qc.invalidateQueries({ queryKey: queryKeys.adminProductDetail(productId) }); },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Không khôi phục được"),
  });

  if (q.isLoading) return <Skeleton className="h-96 w-full" />;
  if (q.isError) return <p className="text-sm text-destructive">{(q.error as Error).message}</p>;
  if (!q.data) return <p className="text-sm text-muted-foreground">Không tìm thấy sản phẩm.</p>;

  const d = q.data;
  const p = d.product;
  const isArchived = !!p.archived_at;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`${p.product_code}${p.product_name ? ` · ${p.product_name}` : ""}`}
        description={`Dự án: ${d.project.name}`}
        breadcrumb={
          <Link to="/admin/projects/$projectId" params={{ projectId }} search={{ tab: "inventory" }} className="inline-flex items-center gap-1 hover:underline">
            <ArrowLeft className="h-3 w-3" />Bảng hàng
          </Link>
        }
        actions={
          <>
            <Badge variant={isArchived ? "secondary" : "outline"}>{isArchived ? "Đã lưu trữ" : p.status}</Badge>
            {d.permissions.can_manage && (
              <>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/admin/projects/$projectId" params={{ projectId }} search={{ tab: "inventory" }}>
                    <Pencil className="mr-1 h-4 w-4" /> Sửa
                  </Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setNewCode(`${p.product_code}_copy`); setCloneOpen(true); }}>
                  <Copy className="mr-1 h-4 w-4" /> Nhân bản
                </Button>
                {isArchived ? (
                  <Button size="sm" variant="outline" onClick={() => restoreMut.mutate()} disabled={restoreMut.isPending}>
                    <RotateCcw className="mr-1 h-4 w-4" /> Khôi phục
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => { if (confirm("Lưu trữ sản phẩm này?")) archiveMut.mutate(); }} disabled={archiveMut.isPending}>
                    <Archive className="mr-1 h-4 w-4" /> Lưu trữ
                  </Button>
                )}
              </>
            )}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Cấu trúc dự án</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div><span className="text-muted-foreground">Phân khu:</span> {(d.zone?.name as string) ?? "—"}</div>
            <div><span className="text-muted-foreground">Toà nhà:</span> {(d.building?.name as string) ?? "—"}</div>
            <div><span className="text-muted-foreground">Tầng:</span> {(d.floor?.floor_number as number) ?? "—"}</div>
            <div><span className="text-muted-foreground">Loại SP:</span> {(d.product_type?.name as string) ?? "—"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Giá bán ({d.price_options.length})</CardTitle></CardHeader>
          <CardContent>
            {d.price_options.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có giá.</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Mã</TableHead><TableHead>Tên</TableHead><TableHead className="text-right">Giá</TableHead><TableHead>Chính</TableHead></TableRow></TableHeader>
                <TableBody>
                  {d.price_options.map((po) => (
                    <TableRow key={po.price_code}>
                      <TableCell className="font-mono text-xs">{po.price_code}</TableCell>
                      <TableCell>{po.price_name ?? "—"}</TableCell>
                      <TableCell className="text-right">{po.amount.toLocaleString()} {po.currency}</TableCell>
                      <TableCell>{po.is_primary ? <Badge>Chính</Badge> : null}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Trường tuỳ chỉnh ({d.custom_values.length})</CardTitle></CardHeader>
          <CardContent>
            {d.custom_values.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có giá trị.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {d.custom_values.map((cv, i) => {
                  const v = cv.value;
                  const display =
                    v.value_text ?? v.value_integer ?? v.value_decimal ??
                    (v.value_boolean !== null && v.value_boolean !== undefined ? String(v.value_boolean) : null) ??
                    v.value_date ?? v.value_datetime ??
                    (v.value_jsonb ? JSON.stringify(v.value_jsonb) : null) ?? "—";
                  return (
                    <div key={i} className="flex items-center justify-between rounded border px-3 py-1.5 text-sm">
                      <span className="text-muted-foreground">{cv.field.field_label}{cv.field.unit ? ` (${cv.field.unit})` : ""}</span>
                      <span className="font-medium">{String(display)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Lịch sử trạng thái ({d.status_history.length})</CardTitle></CardHeader>
          <CardContent>
            {d.status_history.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Từ</TableHead><TableHead>→</TableHead><TableHead>Thời điểm</TableHead></TableRow></TableHeader>
                <TableBody>
                  {d.status_history.slice(0, 20).map((h, i) => (
                    <TableRow key={i}>
                      <TableCell><Badge variant="outline">{h.old_status ?? "—"}</Badge></TableCell>
                      <TableCell><Badge>{h.new_status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Lịch sử giá ({d.price_history.length})</CardTitle></CardHeader>
          <CardContent>
            {d.price_history.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Mã</TableHead><TableHead className="text-right">Cũ</TableHead><TableHead className="text-right">Mới</TableHead><TableHead>Khi</TableHead></TableRow></TableHeader>
                <TableBody>
                  {d.price_history.slice(0, 20).map((h, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{h.price_code}</TableCell>
                      <TableCell className="text-right">{h.old_amount?.toLocaleString() ?? "—"}</TableCell>
                      <TableCell className="text-right">{h.new_amount.toLocaleString()} {h.currency}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(h.changed_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nhân bản sản phẩm</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Mã sản phẩm mới</Label>
            <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} />
            <p className="text-xs text-muted-foreground">Bản sao sẽ mang trạng thái “sẵn hàng”, sao chép core, custom values và giá active. Không sao chép media / lịch sử / favorites.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneOpen(false)}>Huỷ</Button>
            <Button onClick={() => cloneMut.mutate()} disabled={cloneMut.isPending || !newCode.trim()}>
              {cloneMut.isPending ? "Đang xử lý…" : "Nhân bản"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}