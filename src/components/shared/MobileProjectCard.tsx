import { Link } from "@tanstack/react-router";
import { MapPin, Building2, ChevronRight } from "lucide-react";
import type { MobileProjectSummary } from "@/services/mobile/projects.service";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "info" | "neutral";

const statusToneClass: Record<Tone, string> = {
  success:
    "bg-[color:var(--success-soft)] text-[color:var(--success)] ring-1 ring-inset ring-[color:var(--success)]/20",
  warning:
    "bg-[color:var(--warning-soft)] text-[color:oklch(0.45_0.13_75)] ring-1 ring-inset ring-[color:var(--warning)]/25",
  info: "bg-[color:var(--info-soft)] text-[color:var(--info)] ring-1 ring-inset ring-[color:var(--info)]/20",
  neutral:
    "bg-[color:var(--brand-navy-soft)] text-[color:var(--text-secondary)] ring-1 ring-inset ring-[color:var(--border)]",
};

function statusMeta(status: string | null | undefined): { label: string; tone: Tone } | null {
  if (!status) return null;
  switch (status) {
    case "active":
      return { label: "Đang bán", tone: "success" };
    case "coming_soon":
      return { label: "Sắp mở bán", tone: "warning" };
    case "handover":
      return { label: "Bàn giao", tone: "info" };
    case "closed":
      return { label: "Đã đóng", tone: "neutral" };
    case "draft":
      return null;
    default:
      return { label: status, tone: "neutral" };
  }
}

export function MobileProjectCard({
  project,
  variant = "default",
}: {
  project: MobileProjectSummary;
  /** @deprecated use variant="compact" */
  compact?: boolean;
  variant?: "default" | "compact";
}) {
  const status = statusMeta(project.status);
  const total = project.total_products ?? 0;
  const available = project.available_count ?? 0;
  const image = project.cover_url ?? project.thumbnail_url;

  if (variant === "compact") {
    return (
      <Link
        to="/projects/$projectId"
        params={{ projectId: project.id }}
        aria-label={project.name}
        className="group block w-[260px] shrink-0 overflow-hidden rounded-2xl border border-border bg-[color:var(--surface)] shadow-[var(--shadow-xs)] transition-shadow hover:shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-navy)]"
      >
        <CoverImage src={image} alt={project.name} />
        <div className="space-y-1 p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-[14px] font-semibold tracking-tight text-[color:var(--text-primary)]">
              {project.name}
            </h3>
            {status && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  statusToneClass[status.tone],
                )}
              >
                {status.label}
              </span>
            )}
          </div>
          {project.location_text && (
            <div className="flex items-center gap-1 text-[11.5px] text-[color:var(--text-tertiary)]">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{project.location_text}</span>
            </div>
          )}
          {total > 0 && (
            <p className="pt-0.5 text-[11px] text-[color:var(--text-secondary)]">
              <span className="font-semibold text-[color:var(--brand-navy)]">{available}</span>
              <span className="text-[color:var(--text-tertiary)]">/{total}</span> còn hàng
            </p>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      aria-label={project.name}
      className="group block w-full overflow-hidden rounded-2xl border border-border bg-[color:var(--surface)] shadow-[var(--shadow-xs)] transition-shadow hover:shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-navy)]"
    >
      <CoverImage src={image} alt={project.name} />
      <div className="space-y-1.5 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {project.developer_name && (
              <p className="truncate text-[10.5px] font-medium uppercase tracking-wide text-[color:var(--text-tertiary)]">
                {project.developer_name}
              </p>
            )}
            <h3 className="mt-0.5 line-clamp-1 text-[16px] font-semibold tracking-tight text-[color:var(--text-primary)]">
              {project.name}
            </h3>
          </div>
          {status && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                statusToneClass[status.tone],
              )}
            >
              {status.label}
            </span>
          )}
        </div>
        {project.location_text && (
          <div className="flex items-center gap-1 text-xs text-[color:var(--text-tertiary)]">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{project.location_text}</span>
          </div>
        )}
        {project.short_description && (
          <p className="line-clamp-2 pt-0.5 text-[12.5px] leading-snug text-[color:var(--text-secondary)]">
            {project.short_description}
          </p>
        )}
        <div className="flex items-center justify-between pt-1.5">
          {total > 0 ? (
            <p className="text-xs text-[color:var(--text-secondary)]">
              <span className="font-semibold text-[color:var(--brand-navy)]">{available}</span>
              <span className="text-[color:var(--text-tertiary)]">/{total}</span> còn hàng
            </p>
          ) : (
            <span />
          )}
          <ChevronRight className="h-4 w-4 text-[color:var(--text-tertiary)] transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

function CoverImage({ src, alt }: { src: string | null | undefined; alt: string }) {
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden bg-[color:var(--brand-navy-soft)]">
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
          }}
        />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <Building2 className="h-8 w-8 text-[color:var(--brand-navy)]/30" />
        </div>
      )}
    </div>
  );
}