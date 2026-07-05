import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { queryKeys } from "@/lib/queryKeys";
import { searchRegistrations, bulkAssignRegistrations, mapOpsError } from "@/services/admin/operations.service";
import { REGISTRATION_STATUSES, REGISTRATION_STATUS_LABELS, REGISTRATION_DOMAINS, REGISTRATION_DOMAIN_LABELS } from "@/lib/registrationDomain";
import { AssignmentDialog } from "@/components/admin/ops/AssignmentDialog";

export const Route = createFileRoute("/admin/registrations")({ component: RegistrationsPage });

function RegistrationsPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("all");
  const [status, setStatus] = useState("all");
  const [unassigned, setUnassigned] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const filters = useMemo(() => ({
    query: query || null,
    domain: domain === "all" ? null : domain,
    status: status === "all" ? null : status,
    unassigned: unassigned || null,
  }), [query, domain, status, unassigned]);

  const q = useQuery({
    queryKey: queryKeys.adminRegistrations(filters as Record<string, unknown>),
    queryFn: () => searchRegistrations({ query: filters.query, domain: filters.domain, status: filters.status, unassigned: filters.unassigned as boolean | null }),
  });

  const bulkMut = useMutation({
    mutationFn: (u: string | null) => bulkAssignRegistrations(Array.from(selected), u),
    onSuccess: (r) => { toast.success(`Đã phân công ${r.affected} đăng ký`); setSelected(new Set()); qc.invalidateQueries({ queryKey: ["admin", "registrations"] }); },
    onError: (e) => toast.error(mapOpsError(e)),
  });

  const toggle = (id: string) => { const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n); };

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Đăng ký" description="Danh sách đăng ký thuộc phạm vi bạn xem." />
      <Card><CardContent className="flex flex-wrap gap-2 p-4">
        <Input placeholder="Tìm theo mã đăng ký" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs" />
        <Select value={domain} onValueChange={setDomain}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Miền" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Mọi miền</SelectItem>{REGISTRATION_DOMAINS.map((d) => <SelectItem key={d} value={d}>{REGISTRATION_DOMAIN_LABELS[d]}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Mọi trạng thái</SelectItem>{REGISTRATION_STATUSES.map((s) => <SelectItem key={s} value={s}>{REGISTRATION_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={unassigned} onCheckedChange={(v) => setUnassigned(!!v)} />Chưa phân công</label>
        <Button variant="outline" onClick={() => q.refetch()}>Làm mới</Button>
        {selected.size > 0 && <Button onClick={() => setBulkOpen(true)}>Phân công {selected.size}</Button>}
      </CardContent></Card>
      <Card><CardContent className="p-0">
        {q.isLoading ? <p className="p-6 text-sm text-muted-foreground">Đang tải…</p> :
          !q.data?.length ? <p className="p-6 text-sm text-muted-foreground">Không có đăng ký.</p> :
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-10 p-3"></th>
                <th className="p-3">Mã</th><th className="p-3">Miền</th><th className="p-3">Loại</th>
                <th className="p-3">Khách</th><th className="p-3">Trạng thái</th>
                <th className="p-3">Tạo lúc</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-3"><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} /></td>
                  <td className="p-3 font-medium">{r.registration_code}</td>
                  <td className="p-3">{REGISTRATION_DOMAIN_LABELS[r.domain as never] ?? r.domain}</td>
                  <td className="p-3">{r.registration_type}</td>
                  <td className="p-3">{r.lead_name ?? "—"}</td>
                  <td className="p-3"><Badge variant="outline">{REGISTRATION_STATUS_LABELS[r.status as never] ?? r.status}</Badge></td>
                  <td className="p-3">{new Date(r.created_at).toLocaleDateString("vi-VN")}</td>
                  <td className="p-3"><Button asChild variant="ghost" size="sm"><Link to="/admin/registrations/$registrationId" params={{ registrationId: r.id }}>Mở</Link></Button></td>
                </tr>
              ))}
            </tbody>
          </table>}
      </CardContent></Card>
      <AssignmentDialog open={bulkOpen} onOpenChange={setBulkOpen} onAssign={async (u) => { await bulkMut.mutateAsync(u); }} title={`Phân công ${selected.size} đăng ký`} />
    </div>
  );
}