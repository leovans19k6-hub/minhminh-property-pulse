import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Building2,
  ScrollText,
  Ticket,
  CalendarDays,
  UserSquare2,
  BarChart3,
  FileClock,
  Factory,
  LayoutTemplate,
  ListChecks,
  ClipboardList,
  Activity,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/features/auth/AuthProvider";
import { canManageUsers, canReadUsers, canManageDevelopers } from "@/features/admin/access";

type Item = { to: string; label: string; icon: typeof LayoutDashboard; disabled?: boolean };

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { currentUser } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const overview: Item[] = [{ to: "/admin", label: "Bảng điều khiển", icon: LayoutDashboard }];
  const operations: Item[] = [
    { to: "/admin/operations", label: "Vận hành", icon: Activity },
    { to: "/admin/leads", label: "Khách hàng tiềm năng", icon: UserSquare2 },
    { to: "/admin/registrations", label: "Đăng ký", icon: ClipboardList },
    { to: "/admin/tasks", label: "Công việc", icon: ListChecks },
  ];
  const system: Item[] = [];
  if (canReadUsers(currentUser)) {
    system.push({ to: "/admin/users", label: "Người dùng", icon: Users });
  }
  if (canManageUsers(currentUser)) {
    system.push({ to: "/admin/users", label: "Phân quyền", icon: ShieldCheck });
  }
  const projectMgmt: Item[] = [
    { to: "/admin/projects", label: "Danh sách dự án", icon: Building2 },
  ];
  if (canManageDevelopers(currentUser)) {
    projectMgmt.push({ to: "/admin/developers", label: "Nhà phát triển", icon: Factory });
  }
  projectMgmt.push({ to: "/admin/inventory-templates", label: "Template bảng hàng", icon: LayoutTemplate });
  const comingSoon: Item[] = [
    { to: "/admin", label: "Chính sách", icon: ScrollText, disabled: true },
    { to: "/admin", label: "Voucher", icon: Ticket, disabled: true },
    { to: "/admin", label: "Sự kiện", icon: CalendarDays, disabled: true },
    { to: "/admin", label: "Báo cáo", icon: BarChart3, disabled: true },
    { to: "/admin", label: "Nhật ký hệ thống", icon: FileClock, disabled: true },
  ];

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  const renderGroup = (label: string, items: Item[]) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((it) => (
            <SidebarMenuItem key={it.label}>
              {it.disabled ? (
                <SidebarMenuButton
                  className="cursor-not-allowed opacity-50"
                  aria-disabled
                  title="Sắp phát triển"
                >
                  <it.icon className="h-4 w-4" />
                  {!collapsed && (
                    <span className="flex-1 truncate">
                      {it.label}
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                        Sắp có
                      </span>
                    </span>
                  )}
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton asChild isActive={isActive(it.to)}>
                  <Link to={it.to} className="flex items-center gap-2">
                    <it.icon className="h-4 w-4" />
                    {!collapsed && <span>{it.label}</span>}
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {renderGroup("Tổng quan", overview)}
        {renderGroup("Vận hành", operations)}
        {system.length > 0 && renderGroup("Quản trị hệ thống", system)}
        {renderGroup("Dự án", projectMgmt)}
        {renderGroup("Sắp phát triển", comingSoon)}
      </SidebarContent>
    </Sidebar>
  );
}