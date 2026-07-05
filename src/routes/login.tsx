import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { authService, GuestGuard, sanitizeReturnUrl } from "@/features/auth";
import { AuthError } from "@/features/auth/types";

const searchSchema = z.object({
  returnUrl: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  component: LoginRouteComponent,
  head: () => ({
    meta: [
      { title: "Đăng nhập — Minh Minh Sales Hub" },
      { name: "description", content: "Đăng nhập vào ứng dụng nội bộ Minh Minh Group Hải Phòng." },
    ],
  }),
});

function LoginRouteComponent() {
  return (
    <GuestGuard>
      <LoginPage />
    </GuestGuard>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { returnUrl } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authService.signInWithEmail(email.trim(), password);
      const dest = sanitizeReturnUrl(
        returnUrl ? decodeURIComponent(returnUrl) : "/",
      );
      void navigate({ to: dest, replace: true });
    } catch (err) {
      const msg =
        err instanceof AuthError
          ? err.message
          : "Đã xảy ra lỗi. Vui lòng thử lại.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col justify-center bg-background px-6 md:max-w-[640px]"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="mb-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[var(--brand-navy)] text-2xl font-bold text-primary-foreground">
          MM
        </div>
        <h1 className="mt-4 text-xl font-semibold text-foreground">Minh Minh Sales Hub</h1>
        <p className="mt-1 text-xs text-muted-foreground">Minh Minh Group Hải Phòng</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-[var(--brand-navy)]"
            placeholder="ban@minhminh.vn"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Mật khẩu</label>
          <div className="mt-1 flex h-12 w-full items-center rounded-xl border border-border bg-card pr-2 focus-within:border-[var(--brand-navy)]">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-full flex-1 rounded-xl bg-transparent px-4 text-sm outline-none"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-navy)] text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Đăng nhập
        </button>

        <Link
          to="/forgot-password"
          className="block pt-2 text-center text-xs font-medium text-[var(--brand-navy)]"
        >
          Quên mật khẩu?
        </Link>
      </form>

      <p className="mt-10 text-center text-[11px] text-muted-foreground">
        Tài khoản được cấp bởi quản trị viên Minh Minh Group.
      </p>
    </div>
  );
}