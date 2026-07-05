import { useAuth } from "../AuthProvider";

export function DisabledAccountScreen() {
  const { signOut } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Tài khoản chưa hoạt động</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tài khoản của bạn hiện không hoạt động. Vui lòng liên hệ quản trị viên Minh
          Minh Group Hải Phòng để được hỗ trợ.
        </p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-6 h-11 w-full rounded-xl bg-[var(--brand-navy)] text-sm font-semibold text-primary-foreground"
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
}