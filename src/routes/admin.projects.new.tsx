import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { adminCreateProject } from "@/services/admin/projects.service";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/projects/new")({
  component: NewProjectPage,
});

function NewProjectPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Tạo dự án mới" />
      <ProjectForm
        onSubmit={async (values) => {
          try {
            const created = await adminCreateProject(values);
            toast.success("Đã tạo dự án");
            void navigate({ to: "/admin/projects/$projectId", params: { projectId: created.id } });
          } catch (e) {
            const msg = (e as Error).message;
            if (msg.includes("duplicate")) toast.error("Trùng mã hoặc slug dự án.");
            else toast.error(msg);
          }
        }}
      />
    </div>
  );
}