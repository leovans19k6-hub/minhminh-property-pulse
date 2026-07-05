import { useAuth } from "../AuthProvider";

export function CurrentUserErrorState({ error }: { error: Error }) {
  const { refreshUserContext, signOut } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Không tải được tài khoản</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "Vui lòng thử lại hoặc đăng xuất."}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void refreshUserContext()}
            className="h-11 rounded-xl bg-[var(--brand-navy)] text-sm font-semibold text-primary-foreground"
          >
            Thử lại
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="h-11 rounded-xl border border-border text-sm font-semibold text-foreground"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}