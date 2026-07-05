import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Copy, ExternalLink, Plus, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, ErrorState } from "@/components/admin/EmptyState";
import { queryKeys } from "@/lib/queryKeys";
import { ServiceError } from "@/services/_helpers";
import {
  listTemplates,
  createTemplate,
  setTemplateStatus,
  validateTemplateCode,
  type TemplateRow,
} from "@/services/admin/inventoryTemplates.service";
import { useAuth } from "@/features/auth/AuthProvider";

export const Route = createFileRoute("/admin/inventory-templates")({
  component: TemplatesListPage,
  head: () => ({
    meta: [{ title: "Template bảng hàng — Admin" }, { name: "robots", content: "noindex" }],
  }),
});

function TemplatesListPage() {
  const qc = useQueryClient();
  const { currentUser } = useAuth();
  const canManage = !!currentUser?.isActive && (currentUser.isSuperAdmin || currentUser.isAdmin);
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);

  const listQ = useQuery({
    queryKey: queryKeys.adminInventoryTemplates({ includeArchived: showArchived }),
    queryFn: () => listTemplates({ includeArchived: showArchived }),
  });

  const archMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "archived" }) =>
      setTemplateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "inventory-templates"] }),
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lỗi"),
  });

  const rows = (listQ.data ?? []).filter(
    (t) =>
      !q ||
      t.name.toLowerCase().includes(q.toLowerCase()) ||
      t.code.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Template bảng hàng"
        description="Bộ mẫu trường tuỳ chỉnh + bảng hiển thị dùng chung, áp cho nhiều dự án."
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="mr-1 h-4 w-4" /> Tạo template
            </Button>
          ) : null
        }
      />

      <div className="flex items-end justify-between gap-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="w-64 pl-8"
            placeholder="Tìm theo tên / code…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button size="sm" variant="ghost" onClick={() => setShowArchived((s) => !s)}>
          {showArchived ? "Ẩn lưu trữ" : "Hiện lưu trữ"}
        </Button>
      </div>

      {listQ.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : listQ.isError ? (
        <ErrorState message={(listQ.error as Error).message} onRetry={() => listQ.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="Chưa có template" description="Tạo template đầu tiên hoặc chụp từ một dự án hiện có." />
      ) : (
        <div className="rounded border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Nhóm</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-40 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="font-mono text-xs">{t.code}</TableCell>
                  <TableCell>{t.project_category ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === "active" ? "default" : "outline"}>{t.status}</Badge>
                    {t.is_system ? <Badge variant="secondary" className="ml-1">system</Badge> : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" asChild title="Chi tiết">
                      <Link to="/admin/inventory-templates/$templateId" params={{ templateId: t.id }}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                    {canManage ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        title={t.status === "active" ? "Lưu trữ" : "Khôi phục"}
                        onClick={() =>
                          archMut.mutate({ id: t.id, status: t.status === "active" ? "archived" : "active" })
                        }
                      >
                        {t.status === "active" ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {creating ? <CreateTemplateDialog onClose={() => setCreating(false)} /> : null}
    </div>
  );
}

function CreateTemplateDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      createTemplate({
        name: name.trim(),
        code: code.trim(),
        description: description.trim() || null,
        project_category: category.trim() || null,
        status: "active",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "inventory-templates"] });
      toast.success("Đã tạo template");
      onClose();
    },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lỗi"),
  });

  const codeErr = code ? validateTemplateCode(code) : null;

  return (
    <Dialog open onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo template</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Tên</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="apartment_default" />
            {codeErr ? <p className="text-xs text-destructive">{codeErr}</p> : null}
          </div>
          <div className="space-y-1">
            <Label>Nhóm dự án</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="apartment / villa / land / shophouse" />
          </div>
          <div className="space-y-1">
            <Label>Mô tả</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={() => mut.mutate()} disabled={!name.trim() || !code.trim() || !!codeErr || mut.isPending}>
            {mut.isPending ? "Đang tạo…" : "Tạo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}