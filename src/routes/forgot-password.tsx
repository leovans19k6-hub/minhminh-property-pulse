import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { authService, GuestGuard } from "@/features/auth";
import { AuthError } from "@/features/auth/types";

export const Route = createFileRoute("/forgot-password")({
  component: () => (
    <GuestGuard>
      <ForgotPasswordPage />
    </GuestGuard>
  ),
  head: () => ({
    meta: [
      { title: "Quên mật khẩu — Minh Minh Sales Hub" },
      { name: "description", content: "Gửi email đặt lại mật khẩu." },
    ],
  }),
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      await authService.resetPasswordForEmail(email.trim(), redirectTo);
      setSent(true);
    } catch (err) {
      setError(
        err instanceof AuthError ? err.message : "Không thể gửi email. Vui lòng thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col justify-center bg-background px-6 md:max-w-[640px]"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <h1 className="text-xl font-semibold">Quên mật khẩu</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Nhập email được cấp để nhận liên kết đặt lại mật khẩu.
      </p>

      {sent ? (
        <div className="mt-6 rounded-xl border border-border bg-card p-4 text-sm">
          Đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư của bạn.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-[var(--brand-navy)]"
            placeholder="ban@minhminh.vn"
          />
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={!email || submitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-navy)] text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Gửi liên kết
          </button>
        </form>
      )}

      <Link
        to="/login"
        className="mt-6 block text-center text-xs font-medium text-[var(--brand-navy)]"
      >
        ← Quay lại đăng nhập
      </Link>
    </div>
  );
}