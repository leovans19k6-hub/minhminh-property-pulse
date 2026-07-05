import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryKeys } from "@/lib/queryKeys";
import {
  getRegistrationAdminDetail, getRegistrationTimeline, assignRegistration,
  transitionRegistrationStatus, reviewRegistration, createCrmActivity, createCrmTask, mapOpsError,
} from "@/services/admin/operations.service";
import { REGISTRATION_STATUS_LABELS, REGISTRATION_DOMAIN_LABELS } from "@/lib/registrationDomain";
import { AssignmentDialog } from "@/components/admin/ops/AssignmentDialog";
import { ActivityDialog } from "@/components/admin/ops/ActivityDialog";
import { CrmTaskDialog } from "@/components/admin/ops/CrmTaskDialog";
import { ActivityTimeline } from "@/components/admin/ops/ActivityTimeline";

export const Route = createFileRoute("/admin/registrations/$registrationId")({ component: RegistrationDetailPage });

function RegistrationDetailPage() {
  const { registrationId } = Route.useParams();
  const qc = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);
  const [actOpen, setActOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [tsel, setTsel] = useState("");

  const detail = useQuery({ queryKey: queryKeys.adminRegistrationDetail(registrationId), queryFn: () => getRegistrationAdminDetail(registrationId) });
  const timeline = useQuery({ queryKey: queryKeys.adminRegistrationTimeline(registrationId), queryFn: () => getRegistrationTimeline(registrationId) });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.adminRegistrationDetail(registrationId) });
    qc.invalidateQueries({ queryKey: queryKeys.adminRegistrationTimeline(registrationId) });
  };

  const assignMut = useMutation({ mutationFn: (u: string | null) => assignRegistration(registrationId, u), onSuccess: () => { toast.success("Đã phân công"); invalidate(); }, onError: (e) => toast.error(mapOpsError(e)) });
  const transMut = useMutation({ mutationFn: (s: string) => transitionRegistrationStatus(registrationId, s), onSuccess: () => { toast.success("Đã chuyển trạng thái"); invalidate(); }, onError: (e) => toast.error(mapOpsError(e)) });
  const reviewMut = useMutation({
    mutationFn: (v: { decision: "accept" | "reject" | "request_more_info"; note?: string }) => reviewRegistration(registrationId, v.decision, v.note),
    onSuccess: () => { toast.success("Đã ghi nhận duyệt"); invalidate(); }, onError: (e) => toast.error(mapOpsError(e)),
  });

  const r = detail.data?.registration;
  const allowed = detail.data?.allowed_transitions ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={r?.registration_code ?? "Đăng ký"}
        description={r ? `${detail.data?.domain ? REGISTRATION_DOMAIN_LABELS[detail.data.domain as never] : ""} · ${REGISTRATION_STATUS_LABELS[r.status as never] ?? r.status}` : "Đang tải…"}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>Phân công</Button>
            <Button size="sm" variant="outline" onClick={() => setActOpen(true)}>Thêm hoạt động</Button>
            <Button size="sm" variant="outline" onClick={() => setTaskOpen(true)}>Tạo công việc</Button>
          </div>
        }
      />
      {r && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card><CardHeader><CardTitle className="text-sm">Chuyển trạng thái</CardTitle></CardHeader><CardContent className="space-y-2">
              <Select value={tsel} onValueChange={setTsel}>
                <SelectTrigger><SelectValue placeholder="Chọn trạng thái mới" /></SelectTrigger>
                <SelectContent>{allowed.map((s) => <SelectItem key={s} value={s}>{REGISTRATION_STATUS_LABELS[s as never] ?? s}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" disabled={!tsel} onClick={() => transMut.mutate(tsel)}>Chuyển</Button>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Duyệt</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => reviewMut.mutate({ decision: "accept" })}>Duyệt</Button>
              <Button size="sm" variant="destructive" onClick={() => { const n = window.prompt("Lý do từ chối?") ?? undefined; reviewMut.mutate({ decision: "reject", note: n }); }}>Từ chối</Button>
              <Button size="sm" variant="outline" onClick={() => { const n = window.prompt("Yêu cầu bổ sung?") ?? undefined; reviewMut.mutate({ decision: "request_more_info", note: n }); }}>Yêu cầu bổ sung</Button>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Khách hàng</CardTitle></CardHeader><CardContent className="text-sm">
              {detail.data?.lead ? (<><div className="font-medium">{detail.data.lead.full_name}</div><div className="text-xs text-muted-foreground">{detail.data.lead.phone}</div></>) : "—"}
            </CardContent></Card>
          </div>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
              <TabsTrigger value="reviews">Duyệt ({detail.data?.reviews.length ?? 0})</TabsTrigger>
              <TabsTrigger value="tasks">Công việc ({detail.data?.tasks.length ?? 0})</TabsTrigger>
              <TabsTrigger value="timeline">Nhật ký</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <Card><CardContent className="p-4 text-sm">
                <div>Loại: {String(r.registration_type)}</div>
                <div>Dự án: {String(r.project_id ?? "—")}</div>
                <div>Người phân công: {String(r.assigned_to ?? "—")}</div>
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="reviews">
              <Card><CardContent className="p-0">
                {!detail.data?.reviews.length ? <p className="p-4 text-sm text-muted-foreground">Chưa có lịch sử duyệt.</p> :
                  <ul className="divide-y">
                    {detail.data.reviews.map((rv) => (
                      <li key={rv.id} className="p-3 text-sm">
                        <div className="flex justify-between"><Badge variant="outline">{rv.decision}</Badge><span className="text-xs text-muted-foreground">{new Date(rv.reviewed_at).toLocaleString("vi-VN")}</span></div>
                        {rv.note && <div className="mt-1 text-muted-foreground">{rv.note}</div>}
                      </li>
                    ))}
                  </ul>}
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="tasks">
              <Card><CardContent className="p-0">
                {!detail.data?.tasks.length ? <p className="p-4 text-sm text-muted-foreground">Không có công việc.</p> :
                  <ul className="divide-y">{detail.data.tasks.map((t) => (
                    <li key={t.id} className="flex justify-between p-3 text-sm"><span>{t.title}</span><span className="text-xs text-muted-foreground">{t.status}</span></li>
                  ))}</ul>}
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="timeline">
              <Card><CardContent className="p-4"><ActivityTimeline items={timeline.data ?? []} /></CardContent></Card>
            </TabsContent>
          </Tabs>
        </>
      )}
      <AssignmentDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        targetType="registration"
        projectId={(r?.project_id as string | null) ?? null}
        currentAssignee={r?.assigned_to as string | null}
        onAssign={async (u) => { await assignMut.mutateAsync(u); }}
      />
      <ActivityDialog open={actOpen} onOpenChange={setActOpen} onSubmit={async (v) => {
        try { await createCrmActivity({ registrationId, activityType: v.activityType, title: v.title, content: v.content }); toast.success("Đã thêm hoạt động"); invalidate(); }
        catch (e) { toast.error(mapOpsError(e)); }
      }} />
      <CrmTaskDialog open={taskOpen} onOpenChange={setTaskOpen} registrationId={registrationId} onSubmit={async (v) => {
        try { await createCrmTask({ registrationId, title: v.title, description: v.description, priority: v.priority, dueAt: v.dueAt, assignedTo: v.assignedTo }); toast.success("Đã tạo công việc"); invalidate(); }
        catch (e) { toast.error(mapOpsError(e)); }
      }} />
    </div>
  );
}