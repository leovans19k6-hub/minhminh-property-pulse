import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ExternalLink, Plus, Search, Star, Send, Archive, Copy, Pause, Play, RotateCcw } from "lucide-react";
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
  searchVouchers, publishVoucher, pauseVoucher, resumeVoucher, restoreVoucher,
  VOUCHER_STATUSES, VOUCHER_STATUS_LABELS, VOUCHER_DERIVED_STATES, VOUCHER_DERIVED_STATE_LABELS,
  type VoucherListRow, type VoucherStatus, type VoucherDerivedState,
} from "@/services/admin/vouchers.service";
import { VoucherFormDialog } from "@/components/admin/dialogs/VoucherFormDialog";
import { VoucherArchiveDialog } from "@/components/admin/dialogs/VoucherArchiveDialog";
import { VoucherCloneDialog } from "@/components/admin/dialogs/VoucherCloneDialog";

export function VouchersTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("__all__");
  const [derived, setDerived] = useState<string>("__all__");
  const [featured, setFeatured] = useState<string>("__all__");
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [creating, setCreating] = useState(false);
  const [archiving, setArchiving] = useState<VoucherListRow | null>(null);
  const [cloning, setCloning] = useState<VoucherListRow | null>(null);

  const filters = useMemo(() => ({
    projectId,
    query: query.trim() || null,
    status: status === "__all__" ? null : (status as VoucherStatus),
    derivedState: derived === "__all__" ? null : (derived as VoucherDerivedState),
    featured: featured === "__all__" ? null : featured === "yes",
    limit: pageSize, offset: page * pageSize,
  }), [projectId, query, status, derived, featured, page]);

  const q = useQuery({
    queryKey: queryKeys.adminVouchers(projectId, filters),
    queryFn: () => searchVouchers(filters),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.adminVouchers(projectId) });
  const onErr = (e: unknown) => toast.error(e instanceof ServiceError ? e.message : String(e));

  const doPublish = useMutation({ mutationFn: (id: string) => publishVoucher(id),
    onSuccess: () => { invalidate(); toast.success("Đã phát hành"); }, onError: onErr });
  const doPause = useMutation({ mutationFn: (id: string) => pauseVoucher(id),
    onSuccess: () => { invalidate(); toast.success("Đã tạm dừng"); }, onError: onErr });
  const doResume = useMutation({ mutationFn: (id: string) => resumeVoucher(id),
    onSuccess: () => { invalidate(); toast.success("Đã tiếp tục"); }, onError: onErr });
  const doRestore = useMutation({ mutationFn: (id: string) => restoreVoucher(id),
    onSuccess: () => { invalidate(); toast.success("Đã khôi phục"); }, onError: onErr });

  const total = q.data?.total ?? 0;
  const rows = q.data?.rows ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8" placeholder="Tìm tiêu đề / slug / mã / tóm tắt"
            value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả (trừ lưu trữ)</SelectItem>
            {VOUCHER_STATUSES.map((s) => <SelectItem key={s} value={s}>{VOUCHER_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={derived} onValueChange={(v) => { setDerived(v); setPage(0); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Hiệu lực" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả hiệu lực</SelectItem>
            {VOUCHER_DERIVED_STATES.map((s) => <SelectItem key={s} value={s}>{VOUCHER_DERIVED_STATE_LABELS[s]}</SelectItem>)}
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
            <Plus className="mr-1 h-4 w-4" /> Tạo voucher
          </Button>
        )}
      </div>

      {q.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : q.error ? (
        <ErrorState message={String(q.error)} onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="Chưa có voucher" description="Tạo voucher đầu tiên cho dự án này." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Mã</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Hiệu lực</TableHead>
                <TableHead>Đăng ký</TableHead>
                <TableHead>Phạm vi</TableHead>
                <TableHead className="text-right">Ưu tiên</TableHead>
                <TableHead>Cập nhật</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">
                    <Link to="/admin/projects/$projectId/vouchers/$voucherId" params={{ projectId, voucherId: v.id }}
                      className="hover:underline inline-flex items-center gap-1">
                      {v.is_featured && <Star className="h-3 w-3 fill-amber-400 text-amber-500" />}
                      {v.title}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{v.code ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{VOUCHER_STATUS_LABELS[v.status]}</Badge></TableCell>
                  <TableCell><Badge>{VOUCHER_DERIVED_STATE_LABELS[v.derived_state] ?? v.derived_state}</Badge></TableCell>
                  <TableCell className="text-xs">
                    {v.registration_count}{v.capacity != null ? ` / ${v.capacity}` : ""}
                  </TableCell>
                  <TableCell className="text-xs">
                    {v.applicability_scope === "project_wide" ? "Toàn dự án"
                      : v.applicability_scope === "mixed" ? `${v.pt_count}+${v.p_count}+${v.pol_count}`
                      : v.applicability_scope === "product_types" ? `${v.pt_count} loại`
                      : v.applicability_scope === "specific_products" ? `${v.p_count} SP`
                      : `${v.pol_count} CS`}
                  </TableCell>
                  <TableCell className="text-right">{v.priority}</TableCell>
                  <TableCell className="text-xs">{new Date(v.updated_at).toLocaleDateString("vi-VN")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" asChild title="Xem">
                        <Link to="/admin/projects/$projectId/vouchers/$voucherId" params={{ projectId, voucherId: v.id }}>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                      {canManage && v.status !== "archived" && (
                        <>
                          {v.status === "draft" && (
                            <Button size="icon" variant="ghost" title="Phát hành" onClick={() => doPublish.mutate(v.id)}>
                              <Send className="h-3 w-3" />
                            </Button>
                          )}
                          {v.status === "active" && (
                            <Button size="icon" variant="ghost" title="Tạm dừng" onClick={() => doPause.mutate(v.id)}>
                              <Pause className="h-3 w-3" />
                            </Button>
                          )}
                          {v.status === "paused" && (
                            <Button size="icon" variant="ghost" title="Tiếp tục" onClick={() => doResume.mutate(v.id)}>
                              <Play className="h-3 w-3" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" title="Nhân bản" onClick={() => setCloning(v)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Lưu trữ" onClick={() => setArchiving(v)}>
                            <Archive className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      {canManage && v.status === "archived" && (
                        <Button size="icon" variant="ghost" title="Khôi phục" onClick={() => doRestore.mutate(v.id)}>
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
        <span>Tổng {total} voucher</span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Trước</Button>
          <Button size="sm" variant="outline" disabled={(page + 1) * pageSize >= total} onClick={() => setPage((p) => p + 1)}>Sau</Button>
        </div>
      </div>

      {creating && (
        <VoucherFormDialog projectId={projectId} voucherId={null}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); invalidate(); }} />
      )}
      {archiving && (
        <VoucherArchiveDialog voucherId={archiving.id}
          onClose={() => setArchiving(null)}
          onDone={() => { setArchiving(null); invalidate(); }} />
      )}
      {cloning && (
        <VoucherCloneDialog voucherId={cloning.id} sourceTitle={cloning.title} sourceSlug={cloning.slug}
          onClose={() => setCloning(null)}
          onDone={() => { setCloning(null); invalidate(); }} />
      )}
    </div>
  );
}