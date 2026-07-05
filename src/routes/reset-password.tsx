import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/features/auth";
import { AuthError } from "@/features/auth/types";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Đặt lại mật khẩu — Minh Minh Sales Hub" },
      { name: "description", content: "Đặt lại mật khẩu mới cho tài khoản." },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [canReset, setCanReset] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let mounted = true;
    // Only allow reset if user arrived via a recovery flow.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY") setCanReset(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      // Fallback: if user already has a session AND URL hash suggests recovery, allow.
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (data.session || hash.includes("type=recovery")) setCanReset(true);
      else setCanReset((prev) => prev ?? false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Mật khẩu tối thiểu 8 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setSubmitting(true);
    try {
      await authService.updatePassword(password);
      setDone(true);
      setTimeout(() => void navigate({ to: "/login", replace: true }), 1500);
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Không thể đặt lại mật khẩu.");
    } finally {
      setSubmitting(false);
    }
  }

  if (canReset === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-navy)]" />
      </div>
    );
  }

  if (canReset === false) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[520px] flex-col justify-center bg-background px-6 md:max-w-[640px]">
        <h1 className="text-xl font-semibold">Liên kết không hợp lệ</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vui lòng yêu cầu lại liên kết đặt lại mật khẩu.
        </p>
        <button
          type="button"
          onClick={() => void navigate({ to: "/forgot-password" })}
          className="mt-6 h-12 rounded-xl bg-[var(--brand-navy)] text-sm font-semibold text-primary-foreground"
        >
          Về trang quên mật khẩu
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col justify-center bg-background px-6 md:max-w-[640px]">
      <h1 className="text-xl font-semibold">Đặt lại mật khẩu</h1>
      {done ? (
        <p className="mt-4 rounded-xl border border-border bg-card p-4 text-sm">
          Đã đổi mật khẩu. Đang chuyển về trang đăng nhập...
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu mới"
            className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-[var(--brand-navy)]"
          />
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Xác nhận mật khẩu"
            className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-[var(--brand-navy)]"
          />
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-navy)] text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Cập nhật mật khẩu
          </button>
        </form>
      )}
    </div>
  );
}