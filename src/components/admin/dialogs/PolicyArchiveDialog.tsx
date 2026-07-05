import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { queryKeys } from "@/lib/queryKeys";
import { ServiceError } from "@/services/_helpers";
import { archivePolicy, type PolicyStatus } from "@/services/admin/salesPolicies.service";

export function PolicyArchiveDialog({
  projectId, policyId, currentStatus, onClose,
}: { projectId: string; policyId: string; currentStatus: PolicyStatus; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const m = useMutation({
    mutationFn: () => archivePolicy(policyId, reason || null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminSalesPolicies(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.adminSalesPolicyDetail(policyId) });
      toast.success("Đã lưu trữ chính sách");
      onClose();
    },
    onError: (e) => toast.error(e instanceof ServiceError ? e.message : String(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Lưu trữ chính sách</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {currentStatus === "active" && (
            <p className="text-xs text-amber-600">Chính sách đang phát hành sẽ được ẩn khỏi Mobile và lưu trữ trong 1 thao tác.</p>
          )}
          <div>
            <Label>Lý do (tuỳ chọn)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button variant="destructive" disabled={m.isPending} onClick={() => m.mutate()}>Lưu trữ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}