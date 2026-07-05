import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import {
  archiveBuilding, createBuilding, listProjectBuildings, updateBuilding,
  type BuildingRow,
} from "@/services/admin/buildings.service";
import { listProjectZones, type ZoneRow } from "@/services/admin/projectZones.service";
import { EmptyState, ErrorState } from "@/components/admin/EmptyState";
import { ServiceError } from "@/services/_helpers";

type BuildingWithZone = BuildingRow & { project_zones: { id: string; name: string; code: string } | null };

export function BuildingsTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: queryKeys.adminProjectBuildings(projectId),
    queryFn: () => listProjectBuildings(projectId, true) as Promise<BuildingWithZone[]>,
  });
  const zonesQ = useQuery({
    queryKey: queryKeys.adminProjectZones(projectId),
    queryFn: () => listProjectZones(projectId, false),
  });
  const [editing, setEditing] = useState<BuildingWithZone | "new" | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);

  const archiveMut = useMutation({
    mutationFn: archiveBuilding,
    onSuccess: () => {
      toast.success("Đã lưu trữ tòa nhà");
      qc.invalidateQueries({ queryKey: queryKeys.adminProjectBuildings(projectId) });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setArchiveId(null),
  });

  if (q.isLoading) return <Skeleton className="h-40 w-full" />;
  if (q.error) return <ErrorState message="Không tải được danh sách tòa nhà." onRetry={() => q.refetch()} />;
  const rows = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rows.length} tòa nhà</p>
        {canManage ? (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus className="mr-1 h-4 w-4" /> Thêm tòa nhà
          </Button>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Chưa có tòa nhà" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Mã</TableHead>
                <TableHead>Phân khu</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Tầng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id} className={b.archived_at ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="font-mono text-xs">{b.code}</TableCell>
                  <TableCell className="text-xs">{b.project_zones?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs">{b.building_type ?? "—"}</TableCell>
                  <TableCell className="text-xs">{b.total_floors ?? 0}{b.basement_floors ? ` / -${b.basement_floors}` : ""}</TableCell>
                  <TableCell>
                    <Badge variant={b.archived_at ? "outline" : "secondary"}>{b.archived_at ? "Lưu trữ" : b.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {canManage && !b.archived_at ? (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(b)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setArchiveId(b.id)}><Archive className="h-4 w-4" /></Button>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editing ? (
        <BuildingFormDialog
          projectId={projectId}
          building={editing === "new" ? null : editing}
          zones={zonesQ.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: queryKeys.adminProjectBuildings(projectId) });
            setEditing(null);
          }}
        />
      ) : null}

      <AlertDialog open={!!archiveId} onOpenChange={(o) => !o && setArchiveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lưu trữ tòa nhà?</AlertDialogTitle>
            <AlertDialogDescription>Tòa nhà đã lưu trữ sẽ được ẩn khỏi các danh sách.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => archiveId && archiveMut.mutate(archiveId)}>Lưu trữ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BuildingFormDialog({
  projectId, building, zones, onClose, onSaved,
}: {
  projectId: string; building: BuildingRow | null; zones: ZoneRow[];
  onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(building?.name ?? "");
  const [code, setCode] = useState(building?.code ?? "");
  const [zoneId, setZoneId] = useState<string | null>(building?.zone_id ?? null);
  const [buildingType, setBuildingType] = useState(building?.building_type ?? "");
  const [totalFloors, setTotalFloors] = useState<number | null>(building?.total_floors ?? null);
  const [basementFloors, setBasementFloors] = useState<number | null>(building?.basement_floors ?? null);
  const [description, setDescription] = useState(building?.description ?? "");
  const [displayOrder, setDisplayOrder] = useState(building?.display_order ?? 0);
  const [status, setStatus] = useState(building?.status ?? "active");

  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        project_id: projectId, name, code, zone_id: zoneId,
        building_type: buildingType || null,
        total_floors: totalFloors, basement_floors: basementFloors,
        description: description || null, display_order: displayOrder, status,
      };
      if (building) await updateBuilding(building.id, payload);
      else await createBuilding(payload);
    },
    onSuccess: () => { toast.success(building ? "Đã cập nhật" : "Đã tạo tòa nhà"); onSaved(); },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lưu thất bại"),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{building ? "Sửa tòa nhà" : "Thêm tòa nhà"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Tên *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Mã *</Label><Input value={code} onChange={(e) => setCode(e.target.value)} /></div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Phân khu</Label>
            <Select value={zoneId ?? "none"} onValueChange={(v) => setZoneId(v === "none" ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Không —</SelectItem>
                {zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1"><Label className="text-xs">Loại</Label><Input value={buildingType} onChange={(e) => setBuildingType(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Số tầng nổi</Label><Input type="number" min={0} value={totalFloors ?? ""} onChange={(e) => setTotalFloors(e.target.value ? Number(e.target.value) : null)} /></div>
            <div className="space-y-1"><Label className="text-xs">Số tầng hầm</Label><Input type="number" min={0} value={basementFloors ?? ""} onChange={(e) => setBasementFloors(e.target.value ? Number(e.target.value) : null)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Thứ tự</Label><Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} /></div>
            <div className="space-y-1">
              <Label className="text-xs">Trạng thái</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Hoạt động</SelectItem>
                  <SelectItem value="inactive">Không hoạt động</SelectItem>
                  <SelectItem value="draft">Bản nháp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Mô tả</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !name || !code}>Lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}