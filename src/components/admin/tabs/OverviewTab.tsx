import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { queryKeys } from "@/lib/queryKeys";
import { listProjectZones } from "@/services/admin/projectZones.service";
import { listProjectBuildings } from "@/services/admin/buildings.service";
import { listProjectMembers, MEMBER_ROLE_LABELS } from "@/services/admin/projectMembers.service";
import { listProjectProductTypes } from "@/services/admin/productTypes.service";

type Project = {
  id: string; name: string; code: string; slug: string | null;
  status: string; project_category: string | null; description: string | null;
  short_description: string | null; location_text: string | null;
  province: string | null; district: string | null; display_order: number | null;
  is_featured: boolean | null; updated_at: string;
  developers: { id: string; name: string } | { id: string; name: string }[] | null;
};

export function OverviewTab({ project }: { project: Project }) {
  const dev = Array.isArray(project.developers) ? project.developers[0] : project.developers;
  const zonesQ = useQuery({ queryKey: queryKeys.adminProjectZones(project.id), queryFn: () => listProjectZones(project.id, false) });
  const buildingsQ = useQuery({ queryKey: queryKeys.adminProjectBuildings(project.id), queryFn: () => listProjectBuildings(project.id, false) });
  const typesQ = useQuery({ queryKey: queryKeys.adminProjectProductTypes(project.id), queryFn: () => listProjectProductTypes(project.id) });
  const membersQ = useQuery({ queryKey: queryKeys.adminProjectMembers(project.id), queryFn: () => listProjectMembers(project.id) });

  const primary = (membersQ.data ?? []).find((m) => m.is_primary_contact) as
    | { id: string; member_role: string; phone_override: string | null; zalo_url: string | null;
        profiles: { full_name: string | null; avatar_url: string | null; phone: string | null; position: string | null } | null }
    | undefined;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Thông tin dự án</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Nhà phát triển" value={dev?.name} />
          <Info label="Danh mục" value={project.project_category} />
          <Info label="Trạng thái" value={<Badge variant="outline">{project.status}</Badge>} />
          <Info label="Featured" value={project.is_featured ? "Có" : "Không"} />
          <Info label="Địa chỉ" value={project.location_text} />
          <Info label="Tỉnh/Thành" value={project.province} />
          <Info label="Quận/Huyện" value={project.district} />
          <Info label="Cập nhật" value={new Date(project.updated_at).toLocaleString("vi-VN")} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Liên hệ chính</CardTitle></CardHeader>
        <CardContent>
          {primary ? (
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12">
                {primary.profiles?.avatar_url && <AvatarImage src={primary.profiles.avatar_url} />}
                <AvatarFallback>{(primary.profiles?.full_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="font-medium">{primary.profiles?.full_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{MEMBER_ROLE_LABELS[primary.member_role] ?? primary.member_role}</div>
                <div className="mt-1 text-xs">{primary.phone_override ?? primary.profiles?.phone ?? "—"}</div>
                {primary.zalo_url ? <a className="text-xs text-primary underline" href={primary.zalo_url} target="_blank" rel="noreferrer">Zalo</a> : null}
              </div>
            </div>
          ) : <p className="text-sm text-muted-foreground">Chưa thiết lập người liên hệ chính.</p>}
        </CardContent>
      </Card>
      <Card className="lg:col-span-3">
        <CardHeader><CardTitle className="text-base">Cấu trúc dự án</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Phân khu" value={zonesQ.data?.length ?? 0} />
          <Stat label="Tòa nhà" value={buildingsQ.data?.length ?? 0} />
          <Stat label="Loại SP dự án" value={typesQ.data?.length ?? 0} />
          <Stat label="Thành viên" value={membersQ.data?.length ?? 0} />
        </CardContent>
      </Card>
      <Card className="lg:col-span-3">
        <CardHeader><CardTitle className="text-base">Mô tả</CardTitle></CardHeader>
        <CardContent><p className="whitespace-pre-wrap text-sm">{project.description ?? project.short_description ?? "Chưa có mô tả."}</p></CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: React.ReactNode }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{value ?? "—"}</div></div>;
}
function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-semibold">{value}</div></div>;
}