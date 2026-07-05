import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ExternalLink, Pencil, Plus, RotateCcw, Search, Star, Send, Archive, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState } from "@/components/admin/EmptyState";
import { queryKeys } from "@/lib/queryKeys";
import { ServiceError } from "@/services/_helpers";
import {
  searchPolicies,
  publishPolicy,
  unpublishPolicy,
  restorePolicy,
  POLICY_STATUSES,
  POLICY_STATUS_LABELS,
  POLICY_EFFECTIVE_STATES,
  POLICY_EFFECTIVE_STATE_LABELS,
  type PolicyEffectiveState,
  type PolicyListRow,
  type PolicyStatus,
} from "@/services/admin/salesPolicies.service";
import { PolicyFormDialog } from "@/components/admin/dialogs/PolicyFormDialog";
import { PolicyArchiveDialog } from "@/components/admin/dialogs/PolicyArchiveDialog";
import { PolicyCloneDialog } from "@/components/admin/dialogs/PolicyCloneDialog";

export function PoliciesTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("__all__");
  const [effState, setEffState] = useState<string>("__all__");
  const [featured, setFeatured] = useState<string>("__all__");
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [creating, setCreating] = useState(false);
  const [archiving, setArchiving] = useState<PolicyListRow | null>(null);
  const [cloning, setCloning] = useState<PolicyListRow | null>(null);

  const filters = useMemo(() => ({
    projectId,
    query: query.trim() || null,
    status: status === "__all__" ? null : (status as PolicyStatus),
    effectiveState: effState === "__all__" ? null : (effState as PolicyEffectiveState),
    featured: featured === "__all__" ? null : featured === "yes",
    limit: pageSize,
    offset: page * pageSize,
  }), [projectId, query, status, effState, featured, page]);

  const q = useQuery({
    queryKey: queryKeys.adminSalesPolicies(projectId, filters),
    queryFn: () => searchPolicies(filters),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.adminSalesPolicies(projectId) });

  const doPublish = useMutation({
    mutationFn: (id: string) => publishPolicy(id),
    onSuccess: () => { invalidate(); toast.success("Đã phát hành"); },
    onError: (e) => toast.error(e instanceof ServiceError ? e.message : String(e)),
  });
  const doUnpublish = useMutation({
    mutationFn: (id: string) => unpublishPolicy(id),
    onSuccess: () => { invalidate(); toast.success("Đã ẩn phát hành"); },
    onError: (e) => toast.error(e instanceof ServiceError ? e.message : String(e)),
  });
  const doRestore = useMutation({
    mutationFn: (id: string) => restorePolicy(id),
    onSuccess: () => { invalidate(); toast.success("Đã khôi phục"); },
    onError: (e) => toast.error(e instanceof ServiceError ? e.message : String(e)),
  });

  const total = q.data?.total ?? 0;
  const rows = q.data?.rows ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8" placeholder="Tìm tiêu đề / slug / tóm tắt" value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }} />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả (trừ lưu trữ)</SelectItem>
            {POLICY_STATUSES.map((s) => <SelectItem key={s} value={s}>{POLICY_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={effState} onValueChange={(v) => { setEffState(v); setPage(0); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Hiệu lực" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả hiệu lực</SelectItem>
            {POLICY_EFFECTIVE_STATES.map((s) => <SelectItem key={s} value={s}>{POLICY_EFFECTIVE_STATE_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={featured} onValueChange={(v) => { setFeatured(v); setPage(0); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Nổi bật" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Nổi bật: tất cả</SelectItem>
            <SelectItem value="yes">Chỉ nổi bật</SelectItem>
            <SelectItem value="no">Không nổi bật</SelectItem>
          </SelectContent>
        </Select>
        {canManage && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" /> Tạo chính sách
          </Button>
        )}
      </div>

      {q.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : q.error ? (
        <ErrorState message={String(q.error)} onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="Chưa có chính sách" description="Tạo chính sách đầu tiên cho dự án này." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Hiệu lực</TableHead>
                <TableHead>Phạm vi</TableHead>
                <TableHead className="text-right">Ưu tiên</TableHead>
                <TableHead className="text-right">Phiên bản</TableHead>
                <TableHead>Cập nhật</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link to="/admin/projects/$projectId/policies/$policyId" params={{ projectId, policyId: p.id }}
                      className="hover:underline inline-flex items-center gap-1">
                      {p.is_featured && <Star className="h-3 w-3 fill-amber-400 text-amber-500" />}
                      {p.title}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.slug}</TableCell>
                  <TableCell><Badge variant="outline">{POLICY_STATUS_LABELS[p.status]}</Badge></TableCell>
                  <TableCell><Badge>{POLICY_EFFECTIVE_STATE_LABELS[p.derived_state]}</Badge></TableCell>
                  <TableCell className="text-xs">
                    {p.applicability_scope === "project_wide" ? "Toàn dự án"
                      : p.applicability_scope === "product_types" ? `${p.pt_count} loại SP`
                      : `${p.p_count} SP + ${p.pt_count} loại`}
                  </TableCell>
                  <TableCell className="text-right">{p.priority}</TableCell>
                  <TableCell className="text-right">v{p.version_number}</TableCell>
                  <TableCell className="text-xs">{new Date(p.updated_at).toLocaleDateString("vi-VN")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" asChild title="Xem">
                        <Link to="/admin/projects/$projectId/policies/$policyId" params={{ projectId, policyId: p.id }}>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                      {canManage && p.status !== "archived" && (
                        <>
                          {p.status === "draft" ? (
                            <Button size="icon" variant="ghost" title="Phát hành" onClick={() => doPublish.mutate(p.id)}>
                              <Send className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button size="icon" variant="ghost" title="Ẩn phát hành" onClick={() => doUnpublish.mutate(p.id)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" title="Nhân bản" onClick={() => setCloning(p)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Lưu trữ" onClick={() => setArchiving(p)}>
                            <Archive className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      {canManage && p.status === "archived" && (
                        <Button size="icon" variant="ghost" title="Khôi phục" onClick={() => doRestore.mutate(p.id)}>
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Tổng {total} chính sách</span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Trước</Button>
          <Button size="sm" variant="outline" disabled={(page + 1) * pageSize >= total} onClick={() => setPage((p) => p + 1)}>Sau</Button>
        </div>
      </div>

      {creating && (
        <PolicyFormDialog projectId={projectId} policy={null}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); invalidate(); }} />
      )}
      {archiving && (
        <PolicyArchiveDialog projectId={projectId} policyId={archiving.id} currentStatus={archiving.status}
          onClose={() => setArchiving(null)} />
      )}
      {cloning && (
        <PolicyCloneDialog projectId={projectId} policyId={cloning.id}
          sourceTitle={cloning.title} sourceSlug={cloning.slug}
          onClose={() => setCloning(null)} />
      )}
    </div>
  );
}