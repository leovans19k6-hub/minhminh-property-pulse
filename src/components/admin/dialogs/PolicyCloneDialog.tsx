import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeys } from "@/lib/queryKeys";
import { ServiceError } from "@/services/_helpers";
import { clonePolicy, slugify, validatePolicySlug } from "@/services/admin/salesPolicies.service";

export function PolicyCloneDialog({
  projectId, policyId, sourceTitle, sourceSlug, onClose,
}: { projectId: string; policyId: string; sourceTitle: string; sourceSlug: string; onClose: () => void }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [title, setTitle] = useState(`${sourceTitle} (bản sao)`);
  const [slug, setSlug] = useState(slugify(`${sourceSlug}-copy`));
  const slugErr = validatePolicySlug(slug);

  const m = useMutation({
    mutationFn: () => clonePolicy(policyId, slug, title),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: queryKeys.adminSalesPolicies(projectId) });
      toast.success("Đã nhân bản chính sách");
      onClose();
      nav({ to: "/admin/projects/$projectId/policies/$policyId", params: { projectId, policyId: r.policy_id } });
    },
    onError: (e) => toast.error(e instanceof ServiceError ? e.message : String(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nhân bản chính sách</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tiêu đề mới</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Slug mới *</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
            {slugErr && <p className="mt-1 text-xs text-destructive">{slugErr}</p>}
          </div>
          <p className="text-xs text-muted-foreground">
            Nội dung, tài liệu, phạm vi áp dụng, thời gian hiệu lực được sao chép. Lịch sử phiên bản và trạng thái phát hành không sao chép.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button disabled={!!slugErr || m.isPending} onClick={() => m.mutate()}>Nhân bản</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}