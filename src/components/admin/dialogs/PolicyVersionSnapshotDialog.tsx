import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/queryKeys";
import { getPolicyVersion } from "@/services/admin/salesPolicies.service";

export function PolicyVersionSnapshotDialog({
  policyId, versionNumber, onClose,
}: { policyId: string; versionNumber: number; onClose: () => void }) {
  const q = useQuery({
    queryKey: [...queryKeys.adminSalesPolicyVersions(policyId), versionNumber],
    queryFn: () => getPolicyVersion(policyId, versionNumber),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Phiên bản #{versionNumber}</DialogTitle>
        </DialogHeader>
        {q.isLoading && <Skeleton className="h-64 w-full" />}
        {q.data && (
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Thời gian:</span> {new Date(q.data.created_at).toLocaleString("vi-VN")}</div>
            {q.data.change_summary && <div><span className="font-medium">Ghi chú:</span> {q.data.change_summary}</div>}
            <pre className="max-h-[60vh] overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(q.data.snapshot, null, 2)}</pre>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}