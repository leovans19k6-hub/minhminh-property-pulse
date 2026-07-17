import { MapPin, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MobileProjectDetail } from "@/services/mobile/projects.service";

type Tone = "success" | "warning" | "info" | "neutral";

const toneClass: Record<Tone, string> = {
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

export function ProjectIdentityCard({
  project,
  developerName,
}: {
  project: MobileProjectDetail["project"];
  developerName: string | null;
}) {
  const cover = (project.cover_url ?? project.thumbnail_url) as string | null;
  const status = statusMeta(project.status as string | null);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-[color:var(--surface)] shadow-[var(--shadow-xs)]">
      <div className="relative aspect-[16/9] w-full bg-[color:var(--brand-navy-soft)]">
        {cover ? (
          <img
            src={cover}
            alt={project.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
            }}
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <Building2 className="h-10 w-10 text-[color:var(--brand-navy)]/30" />
          </div>
        )}
        {status && (
          <span
            className={cn(
              "absolute left-3 top-3 rounded-full px-2 py-0.5 text-[10.5px] font-semibold backdrop-blur",
              toneClass[status.tone],
            )}
          >
            {status.label}
          </span>
        )}
      </div>
      <div className="space-y-1.5 p-4">
        {developerName && (
          <p className="text-[10.5px] font-medium uppercase tracking-wide text-[color:var(--text-tertiary)]">
            {developerName}
          </p>
        )}
        <h1 className="text-[18px] font-bold leading-tight tracking-tight text-[color:var(--text-primary)]">
          {project.name}
        </h1>
        {project.location_text && (
          <div className="flex items-start gap-1 text-[12.5px] text-[color:var(--text-secondary)]">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--text-tertiary)]" />
            <span>{project.location_text as string}</span>
          </div>
        )}
      </div>
    </div>
  );
}