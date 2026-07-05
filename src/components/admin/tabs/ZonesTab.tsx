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
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import {
  archiveProjectZone,
  createProjectZone,
  listProjectZones,
  updateProjectZone,
  validateZoneParent,
  type ZoneRow,
} from "@/services/admin/projectZones.service";
import { EmptyState, ErrorState } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceError } from "@/services/_helpers";

export function ZonesTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: queryKeys.adminProjectZones(projectId),
    queryFn: () => listProjectZones(projectId, true),
  });
  const [editing, setEditing] = useState<ZoneRow | "new" | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);

  const archiveMut = useMutation({
    mutationFn: archiveProjectZone,
    onSuccess: () => {
      toast.success("Đã lưu trữ phân khu");
      qc.invalidateQueries({ queryKey: queryKeys.adminProjectZones(projectId) });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setArchiveId(null),
  });

  if (q.isLoading) return <Skeleton className="h-40 w-full" />;
  if (q.error) return <ErrorState message="Không tải được danh sách phân khu." onRetry={() => q.refetch()} />;
  const zones = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{zones.length} phân khu</p>
        {canManage ? (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus className="mr-1 h-4 w-4" /> Thêm phân khu
          </Button>
        ) : null}
      </div>

      {zones.length === 0 ? (
        <EmptyState title="Chưa có phân khu" description="Tạo phân khu đầu tiên để bắt đầu chia cấu trúc dự án." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Mã</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Phân khu cha</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((z) => {
                const parent = z.parent_zone_id ? zones.find((x) => x.id === z.parent_zone_id) : null;
                return (
                  <TableRow key={z.id} className={z.archived_at ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{z.name}</TableCell>
                    <TableCell className="font-mono text-xs">{z.code}</TableCell>
                    <TableCell className="text-xs">{z.zone_type ?? "—"}</TableCell>
                    <TableCell className="text-xs">{parent?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={z.archived_at ? "outline" : "secondary"}>
                        {z.archived_at ? "Lưu trữ" : z.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canManage && !z.archived_at ? (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setEditing(z)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setArchiveId(z.id)}>
                            <Archive className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {editing ? (
        <ZoneFormDialog
          projectId={projectId}
          zone={editing === "new" ? null : editing}
          allZones={zones}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: queryKeys.adminProjectZones(projectId) });
            setEditing(null);
          }}
        />
      ) : null}

      <AlertDialog open={!!archiveId} onOpenChange={(o) => !o && setArchiveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lưu trữ phân khu?</AlertDialogTitle>
            <AlertDialogDescription>
              Phân khu sẽ được ẩn khỏi các danh sách nhưng dữ liệu vẫn được giữ lại.
            </AlertDialogDescription>
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

function ZoneFormDialog({
  projectId,
  zone,
  allZones,
  onClose,
  onSaved,
}: {
  projectId: string;
  zone: ZoneRow | null;
  allZones: ZoneRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(zone?.name ?? "");
  const [code, setCode] = useState(zone?.code ?? "");
  const [zoneType, setZoneType] = useState(zone?.zone_type ?? "");
  const [description, setDescription] = useState(zone?.description ?? "");
  const [displayOrder, setDisplayOrder] = useState(zone?.display_order ?? 0);
  const [status, setStatus] = useState<string>(zone?.status ?? "active");
  const [parentZoneId, setParentZoneId] = useState<string | null>(zone?.parent_zone_id ?? null);

  const mut = useMutation({
    mutationFn: async () => {
      await validateZoneParent(projectId, zone?.id ?? null, parentZoneId);
      if (zone) {
        await updateProjectZone(zone.id, {
          name, code, zone_type: zoneType || null, description: description || null,
          display_order: displayOrder, status, parent_zone_id: parentZoneId,
        });
      } else {
        await createProjectZone({
          project_id: projectId, name, code, zone_type: zoneType || null,
          description: description || null, display_order: displayOrder,
          status, parent_zone_id: parentZoneId,
        });
      }
    },
    onSuccess: () => {
      toast.success(zone ? "Đã cập nhật phân khu" : "Đã tạo phân khu");
      onSaved();
    },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lưu thất bại"),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{zone ? "Sửa phân khu" : "Thêm phân khu"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Field label="Tên *"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Mã *"><Input value={code} onChange={(e) => setCode(e.target.value)} /></Field>
          <Field label="Loại phân khu"><Input value={zoneType} onChange={(e) => setZoneType(e.target.value)} placeholder="villa, apartment, ..." /></Field>
          <Field label="Phân khu cha">
            <Select value={parentZoneId ?? "none"} onValueChange={(v) => setParentZoneId(v === "none" ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Không có —</SelectItem>
                {allZones.filter((z) => z.id !== zone?.id).map((z) => (
                  <SelectItem key={z.id} value={z.id}>{z.name} ({z.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Thứ tự hiển thị"><Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} /></Field>
          <Field label="Trạng thái">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Không hoạt động</SelectItem>
                <SelectItem value="draft">Bản nháp</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Mô tả"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !name || !code}>Lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}