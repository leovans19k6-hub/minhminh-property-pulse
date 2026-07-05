import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Archive, Copy, Pencil, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { queryKeys } from "@/lib/queryKeys";
import { ServiceError } from "@/services/_helpers";
import {
  getPolicyAdminDetail,
  publishPolicy,
  unpublishPolicy,
  restorePolicy,
  POLICY_STATUS_LABELS,
  POLICY_EFFECTIVE_STATE_LABELS,
} from "@/services/admin/salesPolicies.service";
import { PolicyFormDialog } from "@/components/admin/dialogs/PolicyFormDialog";
import { PolicyArchiveDialog } from "@/components/admin/dialogs/PolicyArchiveDialog";
import { PolicyCloneDialog } from "@/components/admin/dialogs/PolicyCloneDialog";
import { PolicyVersionSnapshotDialog } from "@/components/admin/dialogs/PolicyVersionSnapshotDialog";

export const Route = createFileRoute("/admin/projects/$projectId/policies/$policyId")({
  component: PolicyAdminDetail,
});

function PolicyAdminDetail() {
  const { projectId, policyId } = Route.useParams();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);

  const q = useQuery({
    queryKey: queryKeys.adminSalesPolicyDetail(policyId),
    queryFn: () => getPolicyAdminDetail(policyId),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.adminSalesPolicyDetail(policyId) });
    qc.invalidateQueries({ queryKey: queryKeys.adminSalesPolicies(projectId) });
  };
  const doPublish = useMutation({
    mutationFn: () => publishPolicy(policyId),
    onSuccess: () => { invalidate(); toast.success("Đã phát hành"); },
    onError: (e) => toast.error(e instanceof ServiceError ? e.message : String(e)),
  });
  const doUnpublish = useMutation({
    mutationFn: () => unpublishPolicy(policyId),
    onSuccess: () => { invalidate(); toast.success("Đã ẩn phát hành"); },
    onError: (e) => toast.error(e instanceof ServiceError ? e.message : String(e)),
  });
  const doRestore = useMutation({
    mutationFn: () => restorePolicy(policyId),
    onSuccess: () => { invalidate(); toast.success("Đã khôi phục"); },
    onError: (e) => toast.error(e instanceof ServiceError ? e.message : String(e)),
  });

  if (q.isLoading) return <Skeleton className="h-64 w-full" />;
  if (!q.data) return <p className="text-sm text-muted-foreground">Không tìm thấy chính sách.</p>;

  const { policy, product_types, products, versions, permissions, derived_effective_status } = q.data;
  const canManage = permissions.can_manage;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={policy.title}
        description={`${policy.slug} · v${policy.version_number}`}
        breadcrumb={
          <Link to="/admin/projects/$projectId" params={{ projectId }} search={{ tab: "policies" }}
            className="inline-flex items-center gap-1 hover:underline">
            <ArrowLeft className="h-3 w-3" /> Chính sách
          </Link>
        }
        actions={
          <>
            <Badge variant="outline">{POLICY_STATUS_LABELS[policy.status]}</Badge>
            <Badge>{POLICY_EFFECTIVE_STATE_LABELS[derived_effective_status]}</Badge>
            {canManage && policy.status !== "archived" && (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Pencil className="mr-1 h-4 w-4" /> Chỉnh sửa
                </Button>
                {policy.status === "draft" ? (
                  <Button size="sm" onClick={() => doPublish.mutate()} disabled={doPublish.isPending}>
                    <Send className="mr-1 h-4 w-4" /> Phát hành
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => doUnpublish.mutate()} disabled={doUnpublish.isPending}>
                    Ẩn phát hành
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setCloning(true)}>
                  <Copy className="mr-1 h-4 w-4" /> Nhân bản
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setArchiving(true)}>
                  <Archive className="mr-1 h-4 w-4" /> Lưu trữ
                </Button>
              </>
            )}
            {canManage && policy.status === "archived" && (
              <Button size="sm" onClick={() => doRestore.mutate()} disabled={doRestore.isPending}>
                <RotateCcw className="mr-1 h-4 w-4" /> Khôi phục
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Tổng quan</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {policy.summary && <p className="text-muted-foreground">{policy.summary}</p>}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Từ:</span> {policy.effective_from ? new Date(policy.effective_from).toLocaleString("vi-VN") : "—"}</div>
              <div><span className="text-muted-foreground">Đến:</span> {policy.effective_to ? new Date(policy.effective_to).toLocaleString("vi-VN") : "—"}</div>
              <div><span className="text-muted-foreground">Phát hành:</span> {policy.published_at ? new Date(policy.published_at).toLocaleString("vi-VN") : "—"}</div>
              <div><span className="text-muted-foreground">Ưu tiên:</span> {policy.priority}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Phạm vi áp dụng</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="text-xs text-muted-foreground">
              {policy.applicability_scope === "project_wide" && "Toàn dự án"}
              {policy.applicability_scope === "product_types" && "Theo loại sản phẩm"}
              {policy.applicability_scope === "specific_products" && "Sản phẩm cụ thể"}
            </div>
            {product_types.length > 0 && (
              <div>
                <div className="mb-1 text-xs font-medium">Loại SP</div>
                <div className="flex flex-wrap gap-1">
                  {product_types.map((t) => <Badge key={t.id} variant="secondary">{t.name}</Badge>)}
                </div>
              </div>
            )}
            {products.length > 0 && (
              <div>
                <div className="mb-1 text-xs font-medium">Sản phẩm ({products.length})</div>
                <div className="flex flex-wrap gap-1 text-xs">
                  {products.slice(0, 20).map((p) => <Badge key={p.id} variant="outline">{p.product_code}</Badge>)}
                  {products.length > 20 && <Badge variant="outline">+{products.length - 20}</Badge>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Nội dung chính sách</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {policy.content_json.sections.length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có nội dung.</p>
          )}
          {policy.content_json.sections.map((s) => (
            <div key={s.id} className="space-y-1">
              <h4 className="text-sm font-semibold">{s.title}</h4>
              {s.subtitle && <p className="text-xs text-muted-foreground">{s.subtitle}</p>}
              <p className="whitespace-pre-wrap text-sm">{s.content}</p>
              {s.note && <p className="text-xs italic text-muted-foreground">{s.note}</p>}
              <Separator className="mt-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Tài liệu đính kèm</CardTitle></CardHeader>
        <CardContent>
          {policy.attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có tài liệu.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {policy.attachments.map((a) => (
                <li key={a.id}>
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {a.label} <Badge variant="outline" className="ml-1 text-xs">{a.type}</Badge>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Lịch sử phiên bản</CardTitle></CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có phiên bản.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {versions.map((v) => (
                <li key={v.version_number} className="flex items-center justify-between">
                  <span>
                    <span className="font-mono">v{v.version_number}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString("vi-VN")}</span>
                    {v.change_summary && <span className="ml-2 text-xs">— {v.change_summary}</span>}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => setViewingVersion(v.version_number)}>Xem</Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {editing && (
        <PolicyFormDialog
          projectId={projectId}
          policy={{
            id: policy.id,
            project_id: policy.project_id,
            slug: policy.slug,
            title: policy.title,
            summary: policy.summary,
            content_json: policy.content_json,
            attachments: policy.attachments,
            effective_from: policy.effective_from,
            effective_to: policy.effective_to,
            is_featured: policy.is_featured,
            priority: policy.priority,
            status: policy.status,
            applicability_scope: policy.applicability_scope,
          }}
          initialPtIds={product_types.map((t) => t.id)}
          initialProductIds={products.map((p) => p.id)}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); invalidate(); }}
        />
      )}
      {archiving && (
        <PolicyArchiveDialog projectId={projectId} policyId={policyId} currentStatus={policy.status}
          onClose={() => { setArchiving(false); invalidate(); }} />
      )}
      {cloning && (
        <PolicyCloneDialog projectId={projectId} policyId={policyId}
          sourceTitle={policy.title} sourceSlug={policy.slug}
          onClose={() => setCloning(false)} />
      )}
      {viewingVersion !== null && (
        <PolicyVersionSnapshotDialog policyId={policyId} versionNumber={viewingVersion}
          onClose={() => setViewingVersion(null)} />
      )}
    </div>
  );
}