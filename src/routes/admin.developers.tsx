import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { queryKeys } from "@/lib/queryKeys";
import { listDevelopers, createDeveloper, archiveDeveloper } from "@/services/admin/developers.service";
import { useAuth } from "@/features/auth/AuthProvider";
import { canManageDevelopers } from "@/features/admin/access";

export const Route = createFileRoute("/admin/developers")({
  component: DevelopersPage,
});

function DevelopersPage() {
  const { currentUser } = useAuth();
  const canManage = canManageDevelopers(currentUser);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: queryKeys.adminDevelopers(), queryFn: listDevelopers });
  const archive = useMutation({
    mutationFn: archiveDeveloper,
    onSuccess: () => { toast.success("Đã ẩn nhà phát triển"); qc.invalidateQueries({ queryKey: queryKeys.adminDevelopers() }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Nhà phát triển"
        actions={canManage ? <CreateDevDialog /> : null}
      />
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead className="hidden md:table-cell">Slug</TableHead>
              <TableHead className="hidden lg:table-cell">Website</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.data?.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">Chưa có nhà phát triển nào.</TableCell></TableRow>
            )}
            {q.data?.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="hidden md:table-cell text-sm">{d.slug}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm">{d.website_url ?? "—"}</TableCell>
                <TableCell><Badge variant={d.status === "active" ? "default" : "outline"}>{d.status}</Badge></TableCell>
                <TableCell className="text-right">
                  {canManage && d.status === "active" && (
                    <Button size="sm" variant="outline" onClick={() => archive.mutate(d.id)}>Ẩn</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CreateDevDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", website_url: "", logo_url: "", description: "" });
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => createDeveloper({
      name: form.name, slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      website_url: form.website_url || null, logo_url: form.logo_url || null,
      description: form.description || null, status: "active",
    }),
    onSuccess: () => { toast.success("Đã tạo"); setOpen(false); qc.invalidateQueries({ queryKey: queryKeys.adminDevelopers() }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Tạo nhà phát triển</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Tạo nhà phát triển</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Tên *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="tự sinh nếu bỏ trống" /></div>
          <div><Label>Website</Label><Input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} /></div>
          <div><Label>Logo URL</Label><Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></div>
          <div><Label>Mô tả</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
          <Button disabled={!form.name || m.isPending} onClick={() => m.mutate()}>Tạo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}