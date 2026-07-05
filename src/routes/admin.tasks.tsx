import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { queryKeys } from "@/lib/queryKeys";
import { searchCrmTasks, startCrmTask, completeCrmTask, cancelCrmTask, mapOpsError, type CrmTaskRow } from "@/services/admin/operations.service";
import { TASK_STATUSES, TASK_STATUS_LABELS, LEAD_PRIORITIES, LEAD_PRIORITY_LABELS } from "@/lib/registrationDomain";

export const Route = createFileRoute("/admin/tasks")({ component: TasksPage });

function TasksPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [overdue, setOverdue] = useState(false);
  const [dueToday, setDueToday] = useState(false);

  const filters = useMemo(() => ({
    query: query || null,
    status: status === "all" ? null : status,
    priority: priority === "all" ? null : priority,
    overdue: overdue || null,
    dueToday: dueToday || null,
  }), [query, status, priority, overdue, dueToday]);

  const q = useQuery({
    queryKey: queryKeys.adminCrmTasks(filters as Record<string, unknown>),
    queryFn: () => searchCrmTasks({ query: filters.query, status: filters.status, priority: filters.priority, overdue: filters.overdue as boolean | null, dueToday: filters.dueToday as boolean | null }),
  });

  const mut = (fn: (id: string) => Promise<CrmTaskRow>, msg: string) =>
    useMutation({ mutationFn: fn, onSuccess: () => { toast.success(msg); qc.invalidateQueries({ queryKey: ["admin", "crm-tasks"] }); }, onError: (e) => toast.error(mapOpsError(e)) });

  const startMut = mut(startCrmTask, "Đã bắt đầu");
  const doneMut = mut(completeCrmTask, "Đã hoàn tất");
  const cancelMut = useMutation({ mutationFn: (id: string) => cancelCrmTask(id), onSuccess: () => { toast.success("Đã hủy"); qc.invalidateQueries({ queryKey: ["admin", "crm-tasks"] }); }, onError: (e) => toast.error(mapOpsError(e)) });

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Công việc" description="Quản lý công việc CRM." />
      <Card><CardContent className="flex flex-wrap gap-2 p-4">
        <Input placeholder="Tìm theo tiêu đề" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Mọi trạng thái</SelectItem>{TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Ưu tiên" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Mọi ưu tiên</SelectItem>{LEAD_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{LEAD_PRIORITY_LABELS[p]}</SelectItem>)}</SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={overdue} onCheckedChange={(v) => setOverdue(!!v)} />Quá hạn</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={dueToday} onCheckedChange={(v) => setDueToday(!!v)} />Hôm nay</label>
        <Button variant="outline" onClick={() => q.refetch()}>Làm mới</Button>
      </CardContent></Card>
      <Card><CardContent className="p-0">
        {q.isLoading ? <p className="p-6 text-sm text-muted-foreground">Đang tải…</p> :
          !q.data?.length ? <p className="p-6 text-sm text-muted-foreground">Không có công việc.</p> :
          <ul className="divide-y">
            {q.data.map((t) => (
              <li key={t.id} className="flex items-center justify-between p-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {TASK_STATUS_LABELS[t.status as never] ?? t.status} · {LEAD_PRIORITY_LABELS[t.priority as never] ?? t.priority}
                    {t.due_at && ` · ${new Date(t.due_at).toLocaleString("vi-VN")}`}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Badge variant="outline">{TASK_STATUS_LABELS[t.status as never] ?? t.status}</Badge>
                  {t.status === "open" && <Button size="sm" variant="ghost" onClick={() => startMut.mutate(t.id)}>Bắt đầu</Button>}
                  {["open", "in_progress"].includes(t.status) && <Button size="sm" variant="ghost" onClick={() => doneMut.mutate(t.id)}>Hoàn tất</Button>}
                  {["open", "in_progress"].includes(t.status) && <Button size="sm" variant="ghost" onClick={() => cancelMut.mutate(t.id)}>Hủy</Button>}
                </div>
              </li>
            ))}
          </ul>}
      </CardContent></Card>
    </div>
  );
}