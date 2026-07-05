import type { CrmActivity } from "@/services/admin/operations.service";
import { ACTIVITY_TYPE_LABELS } from "@/lib/registrationDomain";

export function ActivityTimeline({ items }: { items: CrmActivity[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Chưa có hoạt động.</p>;
  return (
    <ol className="space-y-3 border-l pl-4">
      {items.map((a) => (
        <li key={a.id} className="relative">
          <span className="absolute -left-[19px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
          <div className="text-xs text-muted-foreground">
            {new Date(a.occurred_at).toLocaleString("vi-VN")} · {ACTIVITY_TYPE_LABELS[a.activity_type] ?? a.activity_type}
          </div>
          <div className="font-medium">{a.title}</div>
          {a.content && <div className="whitespace-pre-wrap text-sm text-muted-foreground">{a.content}</div>}
        </li>
      ))}
    </ol>
  );
}