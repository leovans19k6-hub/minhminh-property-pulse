import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import { listProjectBuildings } from "@/services/admin/buildings.service";
import {
  createFloor, listBuildingFloors, safeDeleteFloor, updateFloor,
  type FloorRow,
} from "@/services/admin/floors.service";
import { EmptyState, ErrorState } from "@/components/admin/EmptyState";
import { BulkCreateFloorsDialog } from "@/components/admin/dialogs/BulkCreateFloorsDialog";
import { ServiceError } from "@/services/_helpers";

export function FloorsTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const buildingsQ = useQuery({
    queryKey: queryKeys.adminProjectBuildings(projectId),
    queryFn: () => listProjectBuildings(projectId, false),
  });
  const buildings = buildingsQ.data ?? [];
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const activeBuildingId = buildingId ?? buildings[0]?.id ?? null;

  const floorsQ = useQuery({
    queryKey: activeBuildingId ? queryKeys.adminProjectFloors(activeBuildingId) : ["floors", "none"],
    queryFn: () => listBuildingFloors(activeBuildingId!),
    enabled: !!activeBuildingId,
  });

  const [editing, setEditing] = useState<FloorRow | "new" | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const delMut = useMutation({
    mutationFn: safeDeleteFloor,
    onSuccess: () => {
      toast.success("Đã xóa tầng");
      if (activeBuildingId) qc.invalidateQueries({ queryKey: queryKeys.adminProjectFloors(activeBuildingId) });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setDeleteId(null),
  });

  if (buildings.length === 0) {
    return <EmptyState title="Chưa có tòa nhà" description="Hãy tạo tòa nhà trước khi thêm tầng." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[240px]">
          <Select value={activeBuildingId ?? ""} onValueChange={setBuildingId}>
            <SelectTrigger><SelectValue placeholder="Chọn tòa nhà" /></SelectTrigger>
            <SelectContent>
              {buildings.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex gap-2">
          {canManage && activeBuildingId ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
                <Layers className="mr-1 h-4 w-4" /> Tạo hàng loạt
              </Button>
              <Button size="sm" onClick={() => setEditing("new")}>
                <Plus className="mr-1 h-4 w-4" /> Thêm tầng
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {!activeBuildingId ? (
        <EmptyState title="Chọn một tòa nhà để quản lý danh sách tầng." />
      ) : floorsQ.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : floorsQ.error ? (
        <ErrorState message="Không tải được danh sách tầng." onRetry={() => floorsQ.refetch()} />
      ) : (floorsQ.data ?? []).length === 0 ? (
        <EmptyState title="Chưa có tầng" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Số tầng</TableHead>
                <TableHead>Mã</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Thứ tự</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(floorsQ.data ?? []).map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{f.floor_number ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{f.floor_code}</TableCell>
                  <TableCell>{f.floor_name ?? "—"}</TableCell>
                  <TableCell>{f.display_order}</TableCell>
                  <TableCell>
                    {canManage ? (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(f)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteId(f.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editing && activeBuildingId ? (
        <FloorFormDialog
          buildingId={activeBuildingId}
          floor={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            if (activeBuildingId) qc.invalidateQueries({ queryKey: queryKeys.adminProjectFloors(activeBuildingId) });
            setEditing(null);
          }}
        />
      ) : null}

      {bulkOpen && activeBuildingId ? (
        <BulkCreateFloorsDialog
          projectId={projectId}
          buildingId={activeBuildingId}
          onClose={() => setBulkOpen(false)}
          onCreated={() => {
            if (activeBuildingId) qc.invalidateQueries({ queryKey: queryKeys.adminProjectFloors(activeBuildingId) });
            setBulkOpen(false);
          }}
        />
      ) : null}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tầng?</AlertDialogTitle>
            <AlertDialogDescription>Chỉ xóa được khi tầng không còn sản phẩm nào.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && delMut.mutate(deleteId)}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FloorFormDialog({
  buildingId, floor, onClose, onSaved,
}: {
  buildingId: string; floor: FloorRow | null; onClose: () => void; onSaved: () => void;
}) {
  const [floorNumber, setFloorNumber] = useState<number | null>(floor?.floor_number ?? null);
  const [floorCode, setFloorCode] = useState(floor?.floor_code ?? "");
  const [floorName, setFloorName] = useState(floor?.floor_name ?? "");
  const [displayOrder, setDisplayOrder] = useState(floor?.display_order ?? 0);

  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        building_id: buildingId, floor_number: floorNumber, floor_code: floorCode,
        floor_name: floorName || null, display_order: displayOrder,
      };
      if (floor) await updateFloor(floor.id, payload);
      else await createFloor(payload);
    },
    onSuccess: () => { toast.success(floor ? "Đã cập nhật" : "Đã tạo tầng"); onSaved(); },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lưu thất bại"),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{floor ? "Sửa tầng" : "Thêm tầng"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1"><Label className="text-xs">Số tầng</Label><Input type="number" value={floorNumber ?? ""} onChange={(e) => setFloorNumber(e.target.value ? Number(e.target.value) : null)} /></div>
          <div className="space-y-1"><Label className="text-xs">Mã tầng *</Label><Input value={floorCode} onChange={(e) => setFloorCode(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Tên</Label><Input value={floorName} onChange={(e) => setFloorName(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Thứ tự</Label><Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !floorCode}>Lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}