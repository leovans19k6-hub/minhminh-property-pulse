import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Send, Pause, Play, Copy, Archive, RotateCcw, ExternalLink, XCircle, CheckCircle, Calendar } from "lucide-react";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/features/auth/AuthProvider";
import { canManageProject } from "@/features/admin/access";
import { ServiceError } from "@/services/_helpers";
import {
  getEventAdminDetail, publishEvent, pauseEvent, resumeEvent,
  restoreEvent, checkEventEligibility,
  EVENT_STATUS_LABELS, EVENT_DERIVED_STATE_LABELS, EVENT_TYPE_LABELS,
  EVENT_LOCATION_TYPE_LABELS, eventToCalendarData,
} from "@/services/admin/events.service";
import { EventFormDialog } from "@/components/admin/dialogs/EventFormDialog";
import { EventArchiveDialog } from "@/components/admin/dialogs/EventArchiveDialog";
import { EventCloneDialog } from "@/components/admin/dialogs/EventCloneDialog";
import { EventCancelDialog } from "@/components/admin/dialogs/EventCancelDialog";
import { EventCompleteDialog } from "@/components/admin/dialogs/EventCompleteDialog";

export const Route = createFileRoute("/admin/projects/$projectId/events/$eventId")({
  component: EventDetail,
});

function EventDetail() {
  const { projectId, eventId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { currentUser } = useAuth();
  const canManage = canManageProject(currentUser, projectId);
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [elig, setElig] = useState<Record<string, unknown> | null>(null);

  const q = useQuery({
    queryKey: queryKeys.adminEventDetail(eventId),
    queryFn: () => getEventAdminDetail(eventId),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.adminEventDetail(eventId) });
    qc.invalidateQueries({ queryKey: queryKeys.adminEvents(projectId) });
  };
  const onErr = (e: unknown) => toast.error(e instanceof ServiceError ? e.message : String(e));

  const doPublish = useMutation({ mutationFn: () => publishEvent(eventId), onSuccess: () => { invalidate(); toast.success("Đã phát hành"); }, onError: onErr });
  const doPause = useMutation({ mutationFn: () => pauseEvent(eventId), onSuccess: () => { invalidate(); toast.success("Đã tạm dừng"); }, onError: onErr });
  const doResume = useMutation({ mutationFn: () => resumeEvent(eventId), onSuccess: () => { invalidate(); toast.success("Đã tiếp tục"); }, onError: onErr });
  const doRestore = useMutation({ mutationFn: () => restoreEvent(eventId), onSuccess: () => { invalidate(); toast.success("Đã khôi phục"); }, onError: onErr });
  const doElig = useMutation({
    mutationFn: () => checkEventEligibility(eventId),
    onSuccess: (r) => setElig(r as unknown as Record<string, unknown>),
    onError: onErr,
  });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Đang tải…</p>;
  if (!q.data) return <p className="text-sm text-muted-foreground">Không tìm thấy sự kiện.</p>;
  const d = q.data;
  const e = d.event;
  const cal = eventToCalendarData({
    title: e.title, summary: e.summary, start_at: e.start_at, end_at: e.end_at,
    timezone: e.timezone, location_name: e.location_name, address_text: e.address_text, meeting_url: e.meeting_url,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={e.title}
        description={`${e.slug} · ${EVENT_TYPE_LABELS[e.event_type] ?? e.event_type}`}
        breadcrumb={
          <Link to="/admin/projects/$projectId" params={{ projectId }} search={{ tab: "events" }}
            className="inline-flex items-center gap-1 hover:underline">
            <ArrowLeft className="h-3 w-3" />Sự kiện dự án
          </Link>
        }
        actions={
          <>
            <Badge variant="outline">{EVENT_STATUS_LABELS[e.status] ?? e.status}</Badge>
            <Badge>{EVENT_DERIVED_STATE_LABELS[d.derived_state] ?? d.derived_state}</Badge>
            {canManage && e.status !== "archived" && (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-1 h-3 w-3" />Chỉnh sửa</Button>
                {e.status === "draft" && <Button size="sm" onClick={() => doPublish.mutate()}><Send className="mr-1 h-3 w-3" />Phát hành</Button>}
                {e.status === "active" && <Button size="sm" variant="outline" onClick={() => doPause.mutate()}><Pause className="mr-1 h-3 w-3" />Tạm dừng</Button>}
                {e.status === "paused" && <Button size="sm" onClick={() => doResume.mutate()}><Play className="mr-1 h-3 w-3" />Tiếp tục</Button>}
                {(e.status === "active" || e.status === "paused") && (
                  <Button size="sm" variant="outline" onClick={() => setCompleting(true)}><CheckCircle className="mr-1 h-3 w-3" />Kết thúc</Button>
                )}
                {e.status !== "cancelled" && e.status !== "completed" && (
                  <Button size="sm" variant="outline" onClick={() => setCancelling(true)}><XCircle className="mr-1 h-3 w-3" />Huỷ</Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setCloning(true)}><Copy className="mr-1 h-3 w-3" />Nhân bản</Button>
                <Button size="sm" variant="destructive" onClick={() => setArchiving(true)}><Archive className="mr-1 h-3 w-3" />Lưu trữ</Button>
              </>
            )}
            {canManage && e.status === "archived" && (
              <Button size="sm" onClick={() => doRestore.mutate()}><RotateCcw className="mr-1 h-3 w-3" />Khôi phục</Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm">Sức chứa</CardTitle></CardHeader>
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
        <Card><CardHeader><CardTitle className="text-sm">Thời gian ({e.timezone})</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>Bắt đầu: {e.start_at ? new Date(e.start_at).toLocaleString("vi-VN") : "—"}</div>
            <div>Kết thúc: {e.end_at ? new Date(e.end_at).toLocaleString("vi-VN") : "—"}</div>
            <div>Đăng ký: {e.registration_start ? new Date(e.registration_start).toLocaleString("vi-VN") : "—"} → {e.registration_deadline ? new Date(e.registration_deadline).toLocaleString("vi-VN") : "—"}</div>
          </CardContent></Card>
      </div>

      {e.summary && (
        <Card><CardHeader><CardTitle className="text-sm">Tóm tắt</CardTitle></CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{e.summary}</CardContent></Card>
      )}

      <Card><CardHeader><CardTitle className="text-sm">Địa điểm — {EVENT_LOCATION_TYPE_LABELS[e.location_type] ?? e.location_type}</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          {e.location_name && <div><span className="font-semibold">Địa điểm:</span> {e.location_name}</div>}
          {e.address_text && <div><span className="font-semibold">Địa chỉ:</span> {e.address_text}</div>}
          {e.meeting_url && <div><span className="font-semibold">URL:</span> <a href={e.meeting_url} className="text-primary hover:underline" target="_blank" rel="noreferrer">{e.meeting_url}</a></div>}
          {(e.latitude != null || e.longitude != null) && (
            <div><span className="font-semibold">Toạ độ:</span> {e.latitude}, {e.longitude}
              {e.latitude != null && e.longitude != null && (
                <a className="ml-2 text-primary hover:underline" target="_blank" rel="noreferrer"
                  href={`https://www.google.com/maps?q=${e.latitude},${e.longitude}`}>Mở bản đồ</a>
              )}
            </div>
          )}
          {e.location_notes && <div className="text-muted-foreground">{e.location_notes}</div>}
        </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-sm">Phạm vi áp dụng — {e.applicability_scope}</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          {d.product_types.length > 0 && (<div><span className="font-semibold">Loại SP:</span> {d.product_types.map(p => p.name).join(", ")}</div>)}
          {d.products.length > 0 && (<div><span className="font-semibold">Sản phẩm:</span> {d.products.map(p => p.product_code).join(", ")}</div>)}
          {d.policies.length > 0 && (<div><span className="font-semibold">Chính sách:</span> {d.policies.map(p => p.title).join(", ")}</div>)}
          {d.vouchers.length > 0 && (<div><span className="font-semibold">Voucher:</span> {d.vouchers.map(v => v.title).join(", ")}</div>)}
          {e.applicability_scope === "project_wide" && <span className="text-muted-foreground">Áp dụng toàn dự án.</span>}
        </CardContent></Card>

      {d.sessions.length > 0 && (
        <Card><CardHeader><CardTitle className="text-sm">Phiên sự kiện ({d.sessions.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {d.sessions.map(s => (
              <div key={s.id} className="rounded border p-2">
                <div className="font-semibold">{s.title}</div>
                <div className="text-xs">{new Date(s.starts_at).toLocaleString("vi-VN")} → {new Date(s.ends_at).toLocaleString("vi-VN")}</div>
                {s.location_text && <div className="text-xs text-muted-foreground">{s.location_text}</div>}
                {s.description && <p className="text-muted-foreground">{s.description}</p>}
              </div>
            ))}
          </CardContent></Card>
      )}

      {e.agenda_json?.length > 0 && (
        <Card><CardHeader><CardTitle className="text-sm">Chương trình ({e.agenda_json.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {e.agenda_json.map(a => (
              <div key={a.id} className="rounded border p-2">
                <div className="font-semibold">{a.time_label && <span className="mr-2">{a.time_label}</span>}{a.title}</div>
                {a.location && <div className="text-xs text-muted-foreground">{a.location}</div>}
                {a.description && <p className="text-muted-foreground">{a.description}</p>}
              </div>
            ))}
          </CardContent></Card>
      )}

      {e.speakers_json?.length > 0 && (
        <Card><CardHeader><CardTitle className="text-sm">Diễn giả ({e.speakers_json.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {e.speakers_json.map(s => (
              <div key={s.id} className="rounded border p-2">
                <div className="font-semibold">{s.name}{s.title && <span className="text-muted-foreground"> — {s.title}</span>}</div>
                {s.organization && <div className="text-xs">{s.organization}</div>}
                {s.bio && <p className="text-muted-foreground">{s.bio}</p>}
              </div>
            ))}
          </CardContent></Card>
      )}

      {e.event_type === "site_tour" && e.site_tour_details && Object.keys(e.site_tour_details).length > 0 && (
        <Card><CardHeader><CardTitle className="text-sm">Chi tiết Site Tour</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            {e.site_tour_details.meeting_point && <div><b>Điểm tập trung:</b> {e.site_tour_details.meeting_point}</div>}
            {e.site_tour_details.transportation && <div><b>Phương tiện:</b> {e.site_tour_details.transportation}</div>}
            {e.site_tour_details.departure_time && <div><b>Khởi hành:</b> {e.site_tour_details.departure_time}</div>}
            {e.site_tour_details.return_time && <div><b>Về:</b> {e.site_tour_details.return_time}</div>}
            {e.site_tour_details.included && e.site_tour_details.included.length > 0 && (
              <div><b>Bao gồm:</b> {e.site_tour_details.included.join(", ")}</div>
            )}
            {e.site_tour_details.requirements && e.site_tour_details.requirements.length > 0 && (
              <div><b>Yêu cầu:</b> {e.site_tour_details.requirements.join(", ")}</div>
            )}
            {e.site_tour_details.contact_note && <div className="text-muted-foreground">{e.site_tour_details.contact_note}</div>}
          </CardContent></Card>
      )}

      {e.attachments?.length > 0 && (
        <Card><CardHeader><CardTitle className="text-sm">Tài liệu ({e.attachments.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {e.attachments.map(a => (
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

      {cal && (
        <Card><CardHeader><CardTitle className="text-sm flex items-center gap-1"><Calendar className="h-3 w-3" />Dữ liệu lịch</CardTitle></CardHeader>
          <CardContent className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(cal, null, 2)}</CardContent></Card>
      )}

      {editing && (
        <EventFormDialog projectId={projectId} eventId={eventId}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); invalidate(); }} />
      )}
      {archiving && (<EventArchiveDialog eventId={eventId} onClose={() => setArchiving(false)} onDone={() => { setArchiving(false); invalidate(); }} />)}
      {cancelling && (<EventCancelDialog eventId={eventId} onClose={() => setCancelling(false)} onDone={() => { setCancelling(false); invalidate(); }} />)}
      {completing && (<EventCompleteDialog eventId={eventId} onClose={() => setCompleting(false)} onDone={() => { setCompleting(false); invalidate(); }} />)}
      {cloning && (
        <EventCloneDialog eventId={eventId} sourceTitle={e.title} sourceSlug={e.slug}
          onClose={() => setCloning(false)}
          onDone={() => { setCloning(false); invalidate(); navigate({ to: "/admin/projects/$projectId", params: { projectId }, search: { tab: "events" } }); }} />
      )}
    </div>
  );
}