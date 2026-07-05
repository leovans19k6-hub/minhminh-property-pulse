import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryKeys } from "@/lib/queryKeys";
import {
  getLeadAdminDetail, getLeadTimeline, assignLead, setLeadPriority, transitionLeadStatus,
  convertLead, markLeadLost, reopenLead, createCrmActivity, createCrmTask, mapOpsError,
} from "@/services/admin/operations.service";
import { LEAD_STATUS_LABELS, LEAD_PRIORITY_LABELS, LEAD_PRIORITIES, LEAD_STATUSES, canTransitionLeadStatus, REGISTRATION_STATUS_LABELS } from "@/lib/registrationDomain";
import { AssignmentDialog } from "@/components/admin/ops/AssignmentDialog";
import { ActivityDialog } from "@/components/admin/ops/ActivityDialog";
import { CrmTaskDialog } from "@/components/admin/ops/CrmTaskDialog";
import { ActivityTimeline } from "@/components/admin/ops/ActivityTimeline";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin/leads/$leadId")({ component: LeadDetailPage });

function LeadDetailPage() {
  const { leadId } = Route.useParams();
  const qc = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);
  const [actOpen, setActOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [transitionTo, setTransitionTo] = useState<string>("");

  const detail = useQuery({ queryKey: queryKeys.adminLeadDetail(leadId), queryFn: () => getLeadAdminDetail(leadId) });
  const timeline = useQuery({ queryKey: queryKeys.adminLeadTimeline(leadId), queryFn: () => getLeadTimeline(leadId) });

  const invalidate = () => { qc.invalidateQueries({ queryKey: queryKeys.adminLeadDetail(leadId) }); qc.invalidateQueries({ queryKey: ["admin", "leads", leadId] }); };

  const mk = <T,>(fn: (...args: never[]) => Promise<T>, msg: string) =>
    useMutation({ mutationFn: fn as never, onSuccess: () => { toast.success(msg); invalidate(); }, onError: (e) => toast.error(mapOpsError(e)) });

  const assignMut = mk((u: string | null) => assignLead(leadId, u), "Đã phân công");
  const priMut = mk((p: string) => setLeadPriority(leadId, p), "Đã đổi ưu tiên");
  const transMut = mk((s: string) => transitionLeadStatus(leadId, s), "Đã đổi trạng thái");
  const convertMut = mk(() => convertLead(leadId), "Đã chuyển đổi lead");
  const lostMut = mk((r: string) => markLeadLost(leadId, r), "Đã đánh mất");
  const reopenMut = mk(() => reopenLead(leadId), "Đã mở lại");

  const lead = detail.data?.lead;
  const allowed = lead ? LEAD_STATUSES.filter((s) => canTransitionLeadStatus(String(lead.status), s) && !["converted", "lost"].includes(s)) : [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={lead?.full_name ?? "Lead"}
        description={lead ? `${lead.phone} · ${LEAD_STATUS_LABELS[lead.status as never] ?? lead.status}` : "Đang tải…"}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>Phân công</Button>
            <Button size="sm" variant="outline" onClick={() => setActOpen(true)}>Thêm hoạt động</Button>
            <Button size="sm" variant="outline" onClick={() => setTaskOpen(true)}>Tạo công việc</Button>
          </div>
        }
      />
      {detail.isLoading && <p className="text-sm text-muted-foreground">Đang tải…</p>}
      {lead && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card><CardHeader><CardTitle className="text-sm">Ưu tiên</CardTitle></CardHeader><CardContent>
              <Select value={String(lead.priority)} onValueChange={(v) => priMut.mutate(v as never)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEAD_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{LEAD_PRIORITY_LABELS[p]}</SelectItem>)}</SelectContent>
              </Select>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Trạng thái</CardTitle></CardHeader><CardContent className="space-y-2">
              <Select value={transitionTo} onValueChange={setTransitionTo}>
                <SelectTrigger><SelectValue placeholder="Chọn trạng thái mới" /></SelectTrigger>
                <SelectContent>{allowed.map((s) => <SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" disabled={!transitionTo} onClick={() => transMut.mutate(transitionTo as never)}>Chuyển</Button>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Vòng đời</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">
              {lead.status !== "converted" && (
                <Button size="sm" onClick={() => convertMut.mutate(undefined as never)}>Chuyển đổi</Button>
              )}
              {lead.status !== "lost" && (
                <Button size="sm" variant="destructive" onClick={() => {
                  const r = window.prompt("Lý do đánh mất?"); if (r) lostMut.mutate(r as never);
                }}>Đánh mất</Button>
              )}
              {lead.status === "lost" && (
                <Button size="sm" variant="outline" onClick={() => reopenMut.mutate(undefined as never)}>Mở lại</Button>
              )}
            </CardContent></Card>
          </div>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
              <TabsTrigger value="registrations">Đăng ký ({detail.data?.registrations.length ?? 0})</TabsTrigger>
              <TabsTrigger value="tasks">Công việc ({detail.data?.tasks.length ?? 0})</TabsTrigger>
              <TabsTrigger value="timeline">Nhật ký</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <Card><CardContent className="p-4 text-sm">
                <div>Email: {String(lead.email ?? "—")}</div>
                <div>Dự án quan tâm: {String(lead.interested_project_id ?? "—")}</div>
                {lead.conversion_reason ? <div>Lý do chuyển đổi: {String(lead.conversion_reason)}</div> : null}
                {lead.lost_reason ? <div>Lý do đánh mất: {String(lead.lost_reason)}</div> : null}
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="registrations">
              <Card><CardContent className="p-0">
                {!detail.data?.registrations.length ? <p className="p-4 text-sm text-muted-foreground">Không có đăng ký.</p> :
                  <ul className="divide-y">
                    {detail.data.registrations.map((r) => (
                      <li key={r.id} className="flex items-center justify-between p-3 text-sm">
                        <div><div className="font-medium">{r.registration_code}</div><div className="text-xs text-muted-foreground">{r.registration_type}</div></div>
                        <Badge variant="outline">{REGISTRATION_STATUS_LABELS[r.status as never] ?? r.status}</Badge>
                      </li>
                    ))}
                  </ul>}
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="tasks">
              <Card><CardContent className="p-0">
                {!detail.data?.tasks.length ? <p className="p-4 text-sm text-muted-foreground">Không có công việc mở.</p> :
                  <ul className="divide-y">
                    {detail.data.tasks.map((t) => (
                      <li key={t.id} className="flex items-center justify-between p-3 text-sm">
                        <div className="font-medium">{t.title}</div>
                        <div className="text-xs text-muted-foreground">{t.due_at ? new Date(t.due_at).toLocaleString("vi-VN") : "—"}</div>
                      </li>
                    ))}
                  </ul>}
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="timeline">
              <Card><CardContent className="p-4">
                <ActivityTimeline items={timeline.data ?? []} />
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <AssignmentDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        targetType="lead"
        projectId={(lead?.interested_project_id as string | null) ?? null}
        currentAssignee={lead?.assigned_to as string | null}
        onAssign={async (u) => { await assignMut.mutateAsync(u as never); }}
      />
      <ActivityDialog open={actOpen} onOpenChange={setActOpen} onSubmit={async (v) => {
        try { await createCrmActivity({ leadId, activityType: v.activityType, title: v.title, content: v.content }); toast.success("Đã thêm hoạt động"); invalidate(); qc.invalidateQueries({ queryKey: queryKeys.adminLeadTimeline(leadId) }); }
        catch (e) { toast.error(mapOpsError(e)); }
      }} />
      <CrmTaskDialog open={taskOpen} onOpenChange={setTaskOpen} leadId={leadId} onSubmit={async (v) => {
        try { await createCrmTask({ leadId, title: v.title, description: v.description, priority: v.priority, dueAt: v.dueAt, assignedTo: v.assignedTo }); toast.success("Đã tạo công việc"); invalidate(); }
        catch (e) { toast.error(mapOpsError(e)); }
      }} />
    </div>
  );
}