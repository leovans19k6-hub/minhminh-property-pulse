import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/unauthorized")({
  component: UnauthorizedPage,
  head: () => ({
    meta: [
      { title: "Không có quyền truy cập — Minh Minh Sales Hub" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-2xl font-semibold">Bạn không có quyền truy cập</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tài khoản của bạn không có quyền vào Admin Portal. Vui lòng liên hệ quản trị viên.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link to="/">Về trang chủ</Link>
          </Button>
          <Button asChild>
            <Link to="/account">Tài khoản</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}