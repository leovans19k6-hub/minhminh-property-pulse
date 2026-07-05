import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ExternalLink, Plus, Search, Star, Send, Archive, Copy, Pause, Play, RotateCcw, XCircle, CheckCircle } from "lucide-react";
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
  searchEvents, publishEvent, pauseEvent, resumeEvent, restoreEvent,
  EVENT_TYPES, EVENT_TYPE_LABELS, EVENT_STATUSES, EVENT_STATUS_LABELS,
  EVENT_DERIVED_STATES, EVENT_DERIVED_STATE_LABELS,
  type EventListRow, type EventStatus, type EventType, type EventDerivedState,
} from "@/services/admin/events.service";
import { EventFormDialog } from "@/components/admin/dialogs/EventFormDialog";
import { EventArchiveDialog } from "@/components/admin/dialogs/EventArchiveDialog";
import { EventCloneDialog } from "@/components/admin/dialogs/EventCloneDialog";
import { EventCancelDialog } from "@/components/admin/dialogs/EventCancelDialog";
import { EventCompleteDialog } from "@/components/admin/dialogs/EventCompleteDialog";

export function EventsTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [eventType, setEventType] = useState<string>("__all__");
  const [status, setStatus] = useState<string>("__all__");
  const [derived, setDerived] = useState<string>("__all__");
  const [featured, setFeatured] = useState<string>("__all__");
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [creating, setCreating] = useState(false);
  const [archiving, setArchiving] = useState<EventListRow | null>(null);
  const [cloning, setCloning] = useState<EventListRow | null>(null);
  const [cancelling, setCancelling] = useState<EventListRow | null>(null);
  const [completing, setCompleting] = useState<EventListRow | null>(null);

  const filters = useMemo(() => ({
    projectId,
    query: query.trim() || null,
    eventType: eventType === "__all__" ? null : (eventType as EventType),
    status: status === "__all__" ? null : (status as EventStatus),
    derivedState: derived === "__all__" ? null : (derived as EventDerivedState),
    featured: featured === "__all__" ? null : featured === "yes",
    limit: pageSize, offset: page * pageSize,
  }), [projectId, query, eventType, status, derived, featured, page]);

  const q = useQuery({
    queryKey: queryKeys.adminEvents(projectId, filters),
    queryFn: () => searchEvents(filters),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.adminEvents(projectId) });
  const onErr = (e: unknown) => toast.error(e instanceof ServiceError ? e.message : String(e));

  const doPublish = useMutation({ mutationFn: (id: string) => publishEvent(id),
    onSuccess: () => { invalidate(); toast.success("Đã phát hành"); }, onError: onErr });
  const doPause = useMutation({ mutationFn: (id: string) => pauseEvent(id),
    onSuccess: () => { invalidate(); toast.success("Đã tạm dừng"); }, onError: onErr });
  const doResume = useMutation({ mutationFn: (id: string) => resumeEvent(id),
    onSuccess: () => { invalidate(); toast.success("Đã tiếp tục"); }, onError: onErr });
  const doRestore = useMutation({ mutationFn: (id: string) => restoreEvent(id),
    onSuccess: () => { invalidate(); toast.success("Đã khôi phục"); }, onError: onErr });

  const total = q.data?.total ?? 0;
  const rows = q.data?.rows ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8" placeholder="Tìm tiêu đề / slug / tóm tắt / địa điểm"
            value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} />
        </div>
        <Select value={eventType} onValueChange={(v) => { setEventType(v); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Loại" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả loại</SelectItem>
            {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{EVENT_TYPE_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả (trừ lưu trữ)</SelectItem>
            {EVENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{EVENT_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={derived} onValueChange={(v) => { setDerived(v); setPage(0); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Hiệu lực" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả hiệu lực</SelectItem>
            {EVENT_DERIVED_STATES.map((s) => <SelectItem key={s} value={s}>{EVENT_DERIVED_STATE_LABELS[s]}</SelectItem>)}
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
            <Plus className="mr-1 h-4 w-4" /> Tạo sự kiện
          </Button>
        )}
      </div>

      {q.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : q.error ? (
        <ErrorState message={String(q.error)} onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="Chưa có sự kiện" description="Tạo sự kiện đầu tiên cho dự án này." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Hiệu lực</TableHead>
                <TableHead>Bắt đầu</TableHead>
                <TableHead>Địa điểm</TableHead>
                <TableHead>Đăng ký</TableHead>
                <TableHead className="text-right">Ưu tiên</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    <Link to="/admin/projects/$projectId/events/$eventId" params={{ projectId, eventId: e.id }}
                      className="hover:underline inline-flex items-center gap-1">
                      {e.is_featured && <Star className="h-3 w-3 fill-amber-400 text-amber-500" />}
                      {e.title}
                    </Link>
                  </TableCell>
                  <TableCell><Badge variant="outline">{EVENT_TYPE_LABELS[e.event_type] ?? e.event_type}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{EVENT_STATUS_LABELS[e.status] ?? e.status}</Badge></TableCell>
                  <TableCell><Badge>{EVENT_DERIVED_STATE_LABELS[e.derived_state] ?? e.derived_state}</Badge></TableCell>
                  <TableCell className="text-xs">{e.start_at ? new Date(e.start_at).toLocaleString("vi-VN") : "—"}</TableCell>
                  <TableCell className="text-xs">{e.location_name ?? e.address_text ?? "—"}</TableCell>
                  <TableCell className="text-xs">{e.registration_count}{e.capacity != null ? ` / ${e.capacity}` : ""}</TableCell>
                  <TableCell className="text-right">{e.priority}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" asChild title="Xem">
                        <Link to="/admin/projects/$projectId/events/$eventId" params={{ projectId, eventId: e.id }}>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                      {canManage && e.status !== "archived" && (
                        <>
                          {e.status === "draft" && (
                            <Button size="icon" variant="ghost" title="Phát hành" onClick={() => doPublish.mutate(e.id)}>
                              <Send className="h-3 w-3" />
                            </Button>
                          )}
                          {e.status === "active" && (
                            <Button size="icon" variant="ghost" title="Tạm dừng" onClick={() => doPause.mutate(e.id)}>
                              <Pause className="h-3 w-3" />
                            </Button>
                          )}
                          {e.status === "paused" && (
                            <Button size="icon" variant="ghost" title="Tiếp tục" onClick={() => doResume.mutate(e.id)}>
                              <Play className="h-3 w-3" />
                            </Button>
                          )}
                          {(e.status === "active" || e.status === "paused") && (
                            <Button size="icon" variant="ghost" title="Kết thúc" onClick={() => setCompleting(e)}>
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}
                          {e.status !== "cancelled" && e.status !== "completed" && (
                            <Button size="icon" variant="ghost" title="Huỷ" onClick={() => setCancelling(e)}>
                              <XCircle className="h-3 w-3" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" title="Nhân bản" onClick={() => setCloning(e)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Lưu trữ" onClick={() => setArchiving(e)}>
                            <Archive className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      {canManage && e.status === "archived" && (
                        <Button size="icon" variant="ghost" title="Khôi phục" onClick={() => doRestore.mutate(e.id)}>
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
        <span>Tổng {total} sự kiện</span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Trước</Button>
          <Button size="sm" variant="outline" disabled={(page + 1) * pageSize >= total} onClick={() => setPage((p) => p + 1)}>Sau</Button>
        </div>
      </div>

      {creating && (
        <EventFormDialog projectId={projectId} eventId={null}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); invalidate(); }} />
      )}
      {archiving && (
        <EventArchiveDialog eventId={archiving.id}
          onClose={() => setArchiving(null)}
          onDone={() => { setArchiving(null); invalidate(); }} />
      )}
      {cloning && (
        <EventCloneDialog eventId={cloning.id} sourceTitle={cloning.title} sourceSlug={cloning.slug}
          onClose={() => setCloning(null)}
          onDone={() => { setCloning(null); invalidate(); }} />
      )}
      {cancelling && (
        <EventCancelDialog eventId={cancelling.id}
          onClose={() => setCancelling(null)}
          onDone={() => { setCancelling(null); invalidate(); }} />
      )}
      {completing && (
        <EventCompleteDialog eventId={completing.id}
          onClose={() => setCompleting(null)}
          onDone={() => { setCompleting(null); invalidate(); }} />
      )}
    </div>
  );
}