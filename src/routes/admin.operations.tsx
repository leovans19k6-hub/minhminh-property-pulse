import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queryKeys } from "@/lib/queryKeys";
import { getOperationsDashboard } from "@/services/admin/operations.service";
import { LEAD_STATUS_LABELS, REGISTRATION_DOMAIN_LABELS, REGISTRATION_STATUS_LABELS } from "@/lib/registrationDomain";

export const Route = createFileRoute("/admin/operations")({ component: OperationsDashboardPage });

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card><CardContent className="py-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </CardContent></Card>
  );
}

function OperationsDashboardPage() {
  const q = useQuery({ queryKey: queryKeys.adminOperationsDashboard(null), queryFn: () => getOperationsDashboard(null) });
  const d = q.data;
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Vận hành" description="Bảng điều khiển vận hành hàng ngày." />
      {q.isLoading && <p className="text-sm text-muted-foreground">Đang tải…</p>}
      {q.error && <p className="text-sm text-destructive">Lỗi tải dữ liệu.</p>}
      {d && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Leads chưa phân công" value={d.unassigned_leads} />
            <Stat label="Đăng ký chưa phân công" value={d.unassigned_registrations} />
            <Stat label="Công việc mở" value={d.open_tasks} />
            <Stat label="Công việc quá hạn" value={d.overdue_tasks} />
            <Stat label="Lead của tôi" value={d.my_leads} />
            <Stat label="Đăng ký của tôi" value={d.my_registrations} />
            <Stat label="Công việc mở của tôi" value={d.my_open_tasks} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader><CardTitle className="text-base">Lead theo trạng thái</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {Object.entries(d.leads_by_status).map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span>{LEAD_STATUS_LABELS[k as never] ?? k}</span><span>{v}</span></div>
                ))}
                {Object.keys(d.leads_by_status).length === 0 && <p className="text-muted-foreground">Không có dữ liệu.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Đăng ký theo miền</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {Object.entries(d.registrations_by_domain).map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span>{REGISTRATION_DOMAIN_LABELS[k as never] ?? k}</span><span>{v}</span></div>
                ))}
                {Object.keys(d.registrations_by_domain).length === 0 && <p className="text-muted-foreground">Không có dữ liệu.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Đăng ký theo trạng thái</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {Object.entries(d.registrations_by_status).map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span>{REGISTRATION_STATUS_LABELS[k as never] ?? k}</span><span>{v}</span></div>
                ))}
                {Object.keys(d.registrations_by_status).length === 0 && <p className="text-muted-foreground">Không có dữ liệu.</p>}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}