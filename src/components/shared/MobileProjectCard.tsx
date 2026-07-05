import { Link } from "@tanstack/react-router";
import { MapPin, Building2 } from "lucide-react";
import type { MobileProjectSummary } from "@/services/mobile/projects.service";

export function MobileProjectCard({
  project,
  compact,
}: {
  project: MobileProjectSummary;
  compact?: boolean;
}) {
  const total = project.total_products ?? 0;
  const available = project.available_count ?? 0;
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
        {project.cover_url || project.thumbnail_url ? (
          <img
            src={(project.cover_url ?? project.thumbnail_url) as string}
            alt={project.name}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[var(--brand-navy)]/10">
            <Building2 className="h-8 w-8 text-[var(--brand-navy)]/40" />
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {project.developer_name ?? "—"}
        </p>
        <h3 className="line-clamp-1 text-[15px] font-semibold">{project.name}</h3>
        {project.location_text && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{project.location_text}</span>
          </div>
        )}
        {total > 0 && (
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Còn hàng</span>
            <span className="font-semibold text-[var(--brand-navy)]">
              {available}/{total}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}