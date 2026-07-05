import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { queryKeys } from "@/lib/queryKeys";
import { adminGetProject, adminUpdateProject } from "@/services/admin/projects.service";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/projects/$projectId/edit")({
  component: EditProjectPage,
});

function EditProjectPage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: queryKeys.adminProjectDetail(projectId),
    queryFn: () => adminGetProject(projectId),
  });
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Đang tải…</p>;
  if (!q.data) return <p className="text-sm text-muted-foreground">Không tìm thấy dự án.</p>;
  return (
    <div className="space-y-6">
      <AdminPageHeader title={`Chỉnh sửa: ${q.data.name}`} />
      <ProjectForm
        initial={q.data}
        onSubmit={async (values) => {
          try {
            await adminUpdateProject(projectId, values);
            toast.success("Đã lưu dự án");
            qc.invalidateQueries({ queryKey: queryKeys.adminProjectDetail(projectId) });
            qc.invalidateQueries({ queryKey: ["admin", "projects"] });
            void navigate({ to: "/admin/projects/$projectId", params: { projectId } });
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />
    </div>
  );
}