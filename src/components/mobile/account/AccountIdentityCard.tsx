import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { CurrentUserContext } from "@/features/auth/types";
import { cn } from "@/lib/utils";

function initialsOf(name: string | null | undefined, email: string | null | undefined) {
  const base = name ?? email ?? "MM";
  return (
    base
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "MM"
  );
}

export function AccountIdentityCard({ user }: { user: CurrentUserContext }) {
  const profile = user.profile;
  const initials = initialsOf(profile?.full_name ?? null, user.email);
  const active = user.isActive;
  return (
    <section className="flex items-center gap-3 rounded-2xl border border-border bg-[color:var(--surface)] p-4 shadow-[var(--shadow-xs)]">
      <Avatar className="h-14 w-14 border border-border">
        {profile?.avatar_url && (
          <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? ""} />
        )}
        <AvatarFallback className="bg-[color:var(--brand-navy)] text-[color:var(--primary-foreground)] text-sm font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-[color:var(--text-primary)]">
          {profile?.full_name ?? user.email ?? "Người dùng"}
        </p>
        <p className="truncate text-[12px] text-[color:var(--text-secondary)]">
          {user.email ?? "—"}
        </p>
        <span
          className={cn(
            "mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset",
            active
              ? "bg-[color:var(--success-soft)] text-[color:var(--success)] ring-[color:var(--success)]/20"
              : "bg-[color:var(--danger-soft)] text-[color:var(--danger)] ring-[color:var(--danger)]/20",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              active ? "bg-[color:var(--success)]" : "bg-[color:var(--danger)]",
            )}
          />
          {active ? "Đang hoạt động" : "Ngưng hoạt động"}
        </span>
      </div>
    </section>
  );
}