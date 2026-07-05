import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import { searchLeads, bulkAssignLeads, mapOpsError, type LeadListRow } from "@/services/admin/operations.service";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_PRIORITIES, LEAD_PRIORITY_LABELS } from "@/lib/registrationDomain";
import { AssignmentDialog } from "@/components/admin/ops/AssignmentDialog";

export const Route = createFileRoute("/admin/leads")({ component: LeadsPage });

function LeadsPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [unassigned, setUnassigned] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const filters = useMemo(() => ({
    query: query || null,
    status: status === "all" ? null : status,
    priority: priority === "all" ? null : priority,
    unassigned: unassigned || null,
  }), [query, status, priority, unassigned]);

  const q = useQuery({
    queryKey: queryKeys.adminLeads(filters as Record<string, unknown>),
    queryFn: () => searchLeads({ query: filters.query, status: filters.status, priority: filters.priority, unassigned: filters.unassigned as boolean | null }),
  });

  const bulkMut = useMutation({
    mutationFn: (assignedTo: string | null) => bulkAssignLeads(Array.from(selected), assignedTo),
    onSuccess: (r) => { toast.success(`Đã phân công ${r.affected} lead`); setSelected(new Set()); qc.invalidateQueries({ queryKey: ["admin", "leads"] }); },
    onError: (e) => toast.error(mapOpsError(e)),
  });

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Khách hàng tiềm năng" description="Danh sách lead phạm vi bạn được xem." />
      <Card><CardContent className="flex flex-wrap gap-2 p-4">
        <Input placeholder="Tìm theo tên, điện thoại, email" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Mọi trạng thái</SelectItem>{LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Ưu tiên" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Mọi ưu tiên</SelectItem>{LEAD_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{LEAD_PRIORITY_LABELS[p]}</SelectItem>)}</SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={unassigned} onCheckedChange={(v) => setUnassigned(!!v)} />Chưa phân công</label>
        <Button variant="outline" onClick={() => q.refetch()}>Làm mới</Button>
        {selected.size > 0 && <Button onClick={() => setBulkOpen(true)}>Phân công {selected.size}</Button>}
      </CardContent></Card>
      <Card><CardContent className="p-0">
        {q.isLoading ? <p className="p-6 text-sm text-muted-foreground">Đang tải…</p> :
          !q.data?.length ? <p className="p-6 text-sm text-muted-foreground">Không có lead.</p> :
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-10 p-3"></th>
                <th className="p-3">Tên</th><th className="p-3">Điện thoại</th>
                <th className="p-3">Trạng thái</th><th className="p-3">Ưu tiên</th>
                <th className="p-3">Đăng ký</th><th className="p-3">Công việc</th>
                <th className="p-3">Cập nhật</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((l: LeadListRow) => (
                <tr key={l.id} className="border-b">
                  <td className="p-3"><Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggle(l.id)} /></td>
                  <td className="p-3 font-medium">{l.full_name}</td>
                  <td className="p-3">{l.phone}</td>
                  <td className="p-3"><Badge variant="outline">{LEAD_STATUS_LABELS[l.status as never] ?? l.status}</Badge></td>
                  <td className="p-3">{LEAD_PRIORITY_LABELS[l.priority as never] ?? l.priority}</td>
                  <td className="p-3">{l.registration_count}</td>
                  <td className="p-3">{l.open_tasks}{l.overdue_tasks > 0 && <span className="ml-1 text-destructive">({l.overdue_tasks} quá hạn)</span>}</td>
                  <td className="p-3">{new Date(l.updated_at).toLocaleDateString("vi-VN")}</td>
                  <td className="p-3"><Button asChild variant="ghost" size="sm"><Link to="/admin/leads/$leadId" params={{ leadId: l.id }}>Mở</Link></Button></td>
                </tr>
              ))}
            </tbody>
          </table>}
      </CardContent></Card>
      <AssignmentDialog open={bulkOpen} onOpenChange={setBulkOpen} onAssign={(u) => bulkMut.mutateAsync(u)} title={`Phân công ${selected.size} lead`} />
    </div>
  );
}