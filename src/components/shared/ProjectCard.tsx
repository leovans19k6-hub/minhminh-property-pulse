import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import type { Project } from "@/types/models";
import { StatusBadge } from "./StatusBadge";

export function ProjectCard({ project, compact }: { project: Project; compact?: boolean }) {
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className={
        "block overflow-hidden rounded-2xl border border-border bg-card shadow-sm " +
        (compact ? "w-[260px] shrink-0" : "w-full")
      }
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        <img
          src={project.cover}
          alt={project.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <div className="absolute left-2 top-2">
          <StatusBadge status={project.status} />
        </div>
      </div>
      <div className="space-y-1 p-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {project.developer}
        </p>
        <h3 className="line-clamp-1 text-[15px] font-semibold">{project.name}</h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{project.location}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Còn hàng</span>
          <span className="font-semibold text-[var(--brand-navy)]">
            {project.availableUnits}/{project.totalUnits}
          </span>
        </div>
      </div>
    </Link>
  );
}