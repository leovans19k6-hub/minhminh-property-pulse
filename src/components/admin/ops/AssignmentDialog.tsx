import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  searchAssignableUsers,
  searchBulkAssignableUsers,
  mapOpsError,
  type AssignableUser,
  type AssignmentTargetType,
} from "@/services/admin/operations.service";

// Debounce hook (300ms per spec).
function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targetType: AssignmentTargetType;
  /** Single-target mode: exact project of the record. */
  projectId?: string | null;
  /** Bulk mode: unique project IDs across selected rows. */
  projectIds?: string[];
  currentAssignee?: string | null;
  onAssign: (userId: string | null) => Promise<void> | void;
  title?: string;
  /** Optional count for bulk toast copy. */
  selectionCount?: number;
}

export function AssignmentDialog(props: AssignmentDialogProps) {
  const {
    open, onOpenChange, targetType, projectId, projectIds,
    currentAssignee, onAssign, title = "Phân công", selectionCount,
  } = props;

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(currentAssignee ?? null);
  const [busy, setBusy] = useState(false);
  const debouncedQuery = useDebounced(query);

  const uniqueProjects = useMemo(() => {
    if (projectIds && projectIds.length) return Array.from(new Set(projectIds.filter(Boolean))).sort();
    return projectId ? [projectId] : [];
  }, [projectId, projectIds]);

  const isBulkMultiProject = uniqueProjects.length > 1;
  const hasProjectContext = uniqueProjects.length > 0;

  useEffect(() => {
    if (open) { setSelected(currentAssignee ?? null); setQuery(""); }
  }, [open, currentAssignee]);

  const q = useQuery({
    enabled: open && hasProjectContext,
    queryKey: ["assignableUsers", targetType, uniqueProjects, debouncedQuery ?? ""],
    queryFn: () =>
      isBulkMultiProject
        ? searchBulkAssignableUsers(uniqueProjects, targetType, debouncedQuery)
        : searchAssignableUsers(uniqueProjects[0]!, targetType, debouncedQuery),
  });

  const submit = async () => {
    setBusy(true);
    try { await onAssign(selected); onOpenChange(false); }
    finally { setBusy(false); }
  };

  const clear = async () => {
    setBusy(true);
    try { await onAssign(null); onOpenChange(false); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {!hasProjectContext ? (
          <p className="text-sm text-muted-foreground">Không xác định được dự án để tra cứu người phân công.</p>
        ) : (
          <>
            {isBulkMultiProject && (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Đang phân công trên {uniqueProjects.length} dự án. Chỉ hiển thị người đủ điều kiện cho tất cả dự án.
              </p>
            )}
            {selectionCount ? (
              <p className="text-xs text-muted-foreground">Áp dụng cho {selectionCount} bản ghi.</p>
            ) : null}
            <Input
              placeholder="Tìm theo tên, email, mã nhân viên"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className="flex-1 overflow-y-auto rounded border">
              {q.isLoading ? (
                <p className="p-4 text-sm text-muted-foreground">Đang tải…</p>
              ) : q.isError ? (
                <div className="p-4 text-sm">
                  <p className="text-destructive">{mapOpsError(q.error)}</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => q.refetch()}>Thử lại</Button>
                </div>
              ) : !q.data || q.data.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Không có người phù hợp.</p>
              ) : (
                <ul className="divide-y">
                  {q.data.map((u: AssignableUser) => {
                    const active = selected === u.user_id;
                    return (
                      <li key={u.user_id}>
                        <button
                          type="button"
                          onClick={() => setSelected(u.user_id)}
                          className={`w-full text-left p-3 text-sm hover:bg-muted/50 ${active ? "bg-muted" : ""}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{u.full_name ?? u.email ?? u.user_id.slice(0, 8)}</span>
                            {u.employee_code && <Badge variant="outline" className="text-xs">{u.employee_code}</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {[u.position, u.branch, u.department].filter(Boolean).join(" · ") || u.email || "—"}
                          </div>
                          {(u.system_roles?.length || u.project_roles?.length) ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {u.system_roles?.map((r) => <Badge key={`sys-${r}`} variant="secondary" className="text-[10px]">{r}</Badge>)}
                              {u.project_roles?.map((r) => <Badge key={`p-${r}`} variant="outline" className="text-[10px]">{r}</Badge>)}
                            </div>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="ghost" onClick={clear} disabled={busy}>Bỏ phân công</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Hủy</Button>
          <Button onClick={submit} disabled={busy || !selected}>{busy ? "Đang lưu…" : "Xác nhận"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}