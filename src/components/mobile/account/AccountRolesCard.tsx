import { SectionCard } from "@/components/mobile/SectionCard";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Quản trị viên",
  director: "Giám đốc",
  project_director: "Giám đốc dự án",
  sales_manager: "Trưởng phòng kinh doanh",
  sales: "Nhân viên kinh doanh",
  marketing: "Marketing",
  staff: "Nhân viên",
};

export function labelForRole(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function AccountRolesCard({ roles }: { roles: string[] }) {
  if (!roles.length) {
    return (
      <SectionCard title="Vai trò hệ thống">
        <p className="text-[12.5px] text-[color:var(--text-tertiary)]">
          Bạn chưa được gán vai trò hệ thống.
        </p>
      </SectionCard>
    );
  }
  return (
    <SectionCard title="Vai trò hệ thống">
      <div className="flex flex-wrap gap-1.5">
        {roles.map((r) => (
          <span
            key={r}
            className="rounded-full bg-[color:var(--brand-navy-soft)] px-2.5 py-1 text-[11.5px] font-semibold text-[color:var(--brand-navy)] ring-1 ring-inset ring-[color:var(--border)]"
          >
            {labelForRole(r)}
          </span>
        ))}
      </div>
    </SectionCard>
  );
}