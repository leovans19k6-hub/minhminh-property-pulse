import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Send, Pause, Play, Copy, Archive, RotateCcw, ExternalLink } from "lucide-react";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/features/auth/AuthProvider";
import { canManageProject } from "@/features/admin/access";
import { ServiceError } from "@/services/_helpers";
import {
  getVoucherAdminDetail, publishVoucher, pauseVoucher, resumeVoucher,
  restoreVoucher, checkVoucherEligibility,
  VOUCHER_STATUS_LABELS, VOUCHER_DERIVED_STATE_LABELS,
} from "@/services/admin/vouchers.service";
import { VoucherFormDialog } from "@/components/admin/dialogs/VoucherFormDialog";
import { VoucherArchiveDialog } from "@/components/admin/dialogs/VoucherArchiveDialog";
import { VoucherCloneDialog } from "@/components/admin/dialogs/VoucherCloneDialog";

export const Route = createFileRoute("/admin/projects/$projectId/vouchers/$voucherId")({
  component: VoucherDetail,
});

function VoucherDetail() {
  const { projectId, voucherId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { currentUser } = useAuth();
  const canManage = canManageProject(currentUser, projectId);
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [elig, setElig] = useState<Record<string, unknown> | null>(null);

  const q = useQuery({
    queryKey: queryKeys.adminVoucherDetail(voucherId),
    queryFn: () => getVoucherAdminDetail(voucherId),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.adminVoucherDetail(voucherId) });
    qc.invalidateQueries({ queryKey: queryKeys.adminVouchers(projectId) });
  };
  const onErr = (e: unknown) => toast.error(e instanceof ServiceError ? e.message : String(e));

  const doPublish = useMutation({ mutationFn: () => publishVoucher(voucherId), onSuccess: () => { invalidate(); toast.success("Đã phát hành"); }, onError: onErr });
  const doPause = useMutation({ mutationFn: () => pauseVoucher(voucherId), onSuccess: () => { invalidate(); toast.success("Đã tạm dừng"); }, onError: onErr });
  const doResume = useMutation({ mutationFn: () => resumeVoucher(voucherId), onSuccess: () => { invalidate(); toast.success("Đã tiếp tục"); }, onError: onErr });
  const doRestore = useMutation({ mutationFn: () => restoreVoucher(voucherId), onSuccess: () => { invalidate(); toast.success("Đã khôi phục"); }, onError: onErr });

  const doElig = useMutation({
    mutationFn: () => checkVoucherEligibility(voucherId),
    onSuccess: (r) => setElig(r as unknown as Record<string, unknown>),
    onError: onErr,
  });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Đang tải…</p>;
  if (!q.data) return <p className="text-sm text-muted-foreground">Không tìm thấy voucher.</p>;
  const d = q.data;
  const v = d.voucher;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={v.title}
        description={`${v.slug}${v.code ? " · " + v.code : ""}`}
        breadcrumb={
          <Link to="/admin/projects/$projectId" params={{ projectId }} search={{ tab: "vouchers" }}
            className="inline-flex items-center gap-1 hover:underline">
            <ArrowLeft className="h-3 w-3" />Voucher dự án
          </Link>
        }
        actions={
          <>
            <Badge variant="outline">{VOUCHER_STATUS_LABELS[v.status] ?? v.status}</Badge>
            <Badge>{VOUCHER_DERIVED_STATE_LABELS[d.derived_state] ?? d.derived_state}</Badge>
            {canManage && v.status !== "archived" && (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-1 h-3 w-3" />Chỉnh sửa</Button>
                {v.status === "draft" && <Button size="sm" onClick={() => doPublish.mutate()}><Send className="mr-1 h-3 w-3" />Phát hành</Button>}
                {v.status === "active" && <Button size="sm" variant="outline" onClick={() => doPause.mutate()}><Pause className="mr-1 h-3 w-3" />Tạm dừng</Button>}
                {v.status === "paused" && <Button size="sm" onClick={() => doResume.mutate()}><Play className="mr-1 h-3 w-3" />Tiếp tục</Button>}
                <Button size="sm" variant="outline" onClick={() => setCloning(true)}><Copy className="mr-1 h-3 w-3" />Nhân bản</Button>
                <Button size="sm" variant="destructive" onClick={() => setArchiving(true)}><Archive className="mr-1 h-3 w-3" />Lưu trữ</Button>
              </>
            )}
            {canManage && v.status === "archived" && (
              <Button size="sm" onClick={() => doRestore.mutate()}><RotateCcw className="mr-1 h-3 w-3" />Khôi phục</Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm">Số lượng</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <div>Tổng: {d.capacity_stats.capacity ?? "Không giới hạn"}</div>
            <div>Đã đăng ký: {d.capacity_stats.registration_count}</div>
            <div>Còn lại: {d.capacity_stats.remaining ?? "—"}</div>
          </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Đăng ký</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <div>Chờ: {d.registration_stats.pending}</div>
            <div>Xác nhận: {d.registration_stats.confirmed}</div>
            <div>Huỷ: {d.registration_stats.cancelled}</div>
          </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Thời gian</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>Đăng ký: {v.registration_start ? new Date(v.registration_start).toLocaleString("vi-VN") : "—"} → {v.registration_deadline ? new Date(v.registration_deadline).toLocaleString("vi-VN") : "—"}</div>
            <div>Hiệu lực: {v.effective_from ? new Date(v.effective_from).toLocaleString("vi-VN") : "—"} → {v.effective_to ? new Date(v.effective_to).toLocaleString("vi-VN") : "—"}</div>
          </CardContent></Card>
      </div>

      {v.summary && (
        <Card><CardHeader><CardTitle className="text-sm">Tóm tắt</CardTitle></CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{v.summary}</CardContent></Card>
      )}

      <Card><CardHeader><CardTitle className="text-sm">Phạm vi áp dụng — {v.applicability_scope}</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          {d.product_types.length > 0 && (
            <div><span className="font-semibold">Loại SP:</span> {d.product_types.map(p => p.name).join(", ")}</div>
          )}
          {d.products.length > 0 && (
            <div><span className="font-semibold">Sản phẩm:</span> {d.products.map(p => p.product_code).join(", ")}</div>
          )}
          {d.policies.length > 0 && (
            <div><span className="font-semibold">Chính sách:</span> {d.policies.map(p => p.title).join(", ")}</div>
          )}
          {v.applicability_scope === "project_wide" && <span className="text-muted-foreground">Áp dụng toàn dự án.</span>}
        </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-sm">Quyền lợi ({v.benefits_json.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {v.benefits_json.map(b => (
            <div key={b.id} className="rounded border p-2">
              <div className="font-semibold">{b.title} <Badge variant="outline" className="ml-1">{b.value_type}</Badge> {b.value != null && <span>{b.value}{b.unit ?? ""}</span>}</div>
              {b.description && <p className="text-muted-foreground">{b.description}</p>}
            </div>
          ))}
          {v.benefits_json.length === 0 && <p className="text-muted-foreground">Chưa có.</p>}
        </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-sm">Điều kiện ({v.conditions_json.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {v.conditions_json.map(c => (
            <div key={c.id} className="rounded border p-2">
              <div className="font-semibold">{c.title} {c.required && <Badge variant="destructive" className="ml-1">Bắt buộc</Badge>}</div>
              {c.description && <p className="text-muted-foreground">{c.description}</p>}
            </div>
          ))}
          {v.conditions_json.length === 0 && <p className="text-muted-foreground">Chưa có.</p>}
        </CardContent></Card>

      {v.attachments.length > 0 && (
        <Card><CardHeader><CardTitle className="text-sm">Tài liệu</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {v.attachments.map(a => (
              <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                <ExternalLink className="h-3 w-3" /> {a.label} <Badge variant="outline">{a.type}</Badge>
              </a>
            ))}
          </CardContent></Card>
      )}

      <Card><CardHeader><CardTitle className="text-sm">Kiểm tra điều kiện đăng ký</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Button size="sm" variant="outline" onClick={() => doElig.mutate()} disabled={doElig.isPending}>
            Kiểm tra với tài khoản hiện tại
          </Button>
          {elig && (
            <div className="rounded border p-2">
              <div>Kết quả: <Badge variant={elig.eligible ? "default" : "destructive"}>{elig.eligible ? "Đủ điều kiện" : "Không đủ điều kiện"}</Badge></div>
              <div>Mã: {String(elig.code)}</div>
              <div>Thông báo: {String(elig.message)}</div>
              <div>Còn lại: {String(elig.remaining ?? "—")}</div>
            </div>
          )}
        </CardContent></Card>

      {editing && (
        <VoucherFormDialog projectId={projectId} voucherId={voucherId}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); invalidate(); }} />
      )}
      {archiving && (
        <VoucherArchiveDialog voucherId={voucherId}
          onClose={() => setArchiving(false)}
          onDone={() => { setArchiving(false); invalidate(); }} />
      )}
      {cloning && (
        <VoucherCloneDialog voucherId={voucherId} sourceTitle={v.title} sourceSlug={v.slug}
          onClose={() => setCloning(false)}
          onDone={(/* r */) => { setCloning(false); invalidate(); navigate({ to: "/admin/projects/$projectId", params: { projectId }, search: { tab: "vouchers" } }); }} />
      )}
    </div>
  );
}