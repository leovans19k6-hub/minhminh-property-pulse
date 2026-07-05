import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { bulkCreateFloors, previewBulkCreateFloors, type BulkFloorsPreview } from "@/services/admin/floors.service";
import { ServiceError } from "@/services/_helpers";

export function BulkCreateFloorsDialog({
  projectId, buildingId, onClose, onCreated,
}: {
  projectId: string; buildingId: string;
  onClose: () => void; onCreated: () => void;
}) {
  const [startFloor, setStartFloor] = useState(1);
  const [endFloor, setEndFloor] = useState(10);
  const [excludedText, setExcludedText] = useState("");
  const [codePrefix, setCodePrefix] = useState("");
  const [codeSuffix, setCodeSuffix] = useState("");
  const [preview, setPreview] = useState<BulkFloorsPreview | null>(null);

  const excluded = excludedText
    .split(/[,\s]+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n));

  const inputData = { projectId, buildingId, startFloor, endFloor, excluded, codePrefix, codeSuffix };

  const previewMut = useMutation({
    mutationFn: () => previewBulkCreateFloors(inputData),
    onSuccess: (data) => setPreview(data),
    onError: (e: Error) => toast.error(e.message),
  });

  const createMut = useMutation({
    mutationFn: () => bulkCreateFloors(inputData),
    onSuccess: (r) => { toast.success(`Đã tạo ${r.created} tầng`); onCreated(); },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Tạo thất bại"),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Tạo hàng loạt tầng</DialogTitle></DialogHeader>
        {!preview ? (
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Tầng bắt đầu</Label><Input type="number" value={startFloor} onChange={(e) => setStartFloor(Number(e.target.value))} /></div>
              <div className="space-y-1"><Label className="text-xs">Tầng kết thúc</Label><Input type="number" value={endFloor} onChange={(e) => setEndFloor(Number(e.target.value))} /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Loại trừ (phân cách bởi dấu phẩy)</Label><Input value={excludedText} onChange={(e) => setExcludedText(e.target.value)} placeholder="4, 13, 14" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Tiền tố mã</Label><Input value={codePrefix} onChange={(e) => setCodePrefix(e.target.value)} placeholder="F" /></div>
              <div className="space-y-1"><Label className="text-xs">Hậu tố mã</Label><Input value={codeSuffix} onChange={(e) => setCodeSuffix(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>Hủy</Button>
              <Button onClick={() => previewMut.mutate()} disabled={previewMut.isPending}>Xem trước</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm">Sẽ tạo <b>{preview.planned.length}</b> tầng · Loại trừ {excluded.length} · Trùng {preview.duplicates.length}</div>
            {preview.errors.length > 0 && (
              <ul className="rounded border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
                {preview.errors.map((e) => <li key={e}>• {e}</li>)}
              </ul>
            )}
            {preview.duplicates.length > 0 && (
              <div className="text-xs text-destructive">Mã đã tồn tại: {preview.duplicates.join(", ")}</div>
            )}
            <div className="max-h-40 overflow-auto rounded border p-2 text-xs font-mono">
              {preview.planned.map((p) => p.floor_code).join(", ")}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setPreview(null)}>Quay lại</Button>
              <Button
                onClick={() => createMut.mutate()}
                disabled={createMut.isPending || preview.errors.length > 0 || preview.duplicates.length > 0 || preview.planned.length === 0}
              >
                Xác nhận tạo
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}