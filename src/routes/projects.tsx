import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { ProjectCard } from "@/components/shared/ProjectCard";
import { projects } from "@/features/mock/data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/projects")({
  component: ProjectsPage,
  head: () => ({
    meta: [
      { title: "Dự án — Minh Minh Sales Hub" },
      {
        name: "description",
        content: "Danh sách dự án bất động sản đang phân phối bởi Minh Minh Group.",
      },
    ],
  }),
});

function ProjectsPage() {
  const [q, setQ] = useState("");
  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.developer.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <MobileShell title="Dự án">
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm dự án, chủ đầu tư..."
              className="h-11 pl-9"
            />
          </div>
          <Button variant="outline" size="icon" className="h-11 w-11 shrink-0">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {filtered.length} dự án đang phân phối
        </p>
        <div className="space-y-3">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      </div>
    </MobileShell>
  );
}