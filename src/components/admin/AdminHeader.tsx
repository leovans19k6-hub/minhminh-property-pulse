import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Smartphone } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/AuthProvider";

export function AdminHeader() {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const profile = currentUser?.profile;
  const initials =
    (profile?.full_name ?? currentUser?.email ?? "MM")
      .split(" ")
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "MM";

  async function handleLogout() {
    await signOut();
    void navigate({ to: "/login", replace: true });
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <SidebarTrigger />
      <Link to="/admin" className="flex items-center gap-2 font-semibold">
        <span className="rounded-md bg-[var(--brand-navy)] px-2 py-1 text-xs text-primary-foreground">
          MMG
        </span>
        <span className="hidden text-sm text-foreground sm:inline">Admin Portal</span>
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <Smartphone className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Mobile App</span>
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full p-1 hover:bg-muted">
              <Avatar className="h-8 w-8">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                <AvatarFallback className="bg-[var(--brand-navy)] text-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="flex flex-col">
              <span className="text-sm">{profile?.full_name ?? currentUser?.email}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {currentUser?.systemRoles.join(", ") || "—"}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void handleLogout()}>
              <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}