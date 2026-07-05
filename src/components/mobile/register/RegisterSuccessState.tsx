import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

export function RegisterSuccessState({
  title,
  registrationCode,
  description,
}: {
  title: string;
  registrationCode?: string | null;
  description?: string;
}) {
  return (
    <div className="m-4 rounded-2xl border border-border bg-[color:var(--surface)] p-8 text-center shadow-[var(--shadow-xs)]">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[color:var(--success-soft)]">
        <CheckCircle2 className="h-7 w-7 text-[color:var(--success)]" />
      </div>
      <p className="mt-3 text-base font-semibold text-[color:var(--text-primary)]">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-[color:var(--text-secondary)]">{description}</p>
      )}
      {registrationCode && (
        <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-xl bg-[color:var(--brand-navy-soft)] px-3 py-2 text-[13px]">
          <span className="text-[color:var(--text-tertiary)]">Mã đăng ký:</span>
          <span className="font-mono font-semibold text-[color:var(--brand-navy)]">
            {registrationCode}
          </span>
        </div>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          to="/"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-[color:var(--brand-navy)] px-4 text-sm font-semibold text-[color:var(--primary-foreground)]"
        >
          Về trang chủ
        </Link>
        <Link
          to="/inventory"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-[color:var(--surface)] px-4 text-sm font-semibold text-[color:var(--text-primary)]"
        >
          Xem bảng hàng
        </Link>
      </div>
    </div>
  );
}