import { useState } from "react";
import { 
  Bot, 
  Hammer, 
  Play, 
  Settings, 
  HelpCircle,
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  User,
  Plug,
  Users,
} from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserManagementDialog } from "@/components/user/UserManagementDialog";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { HelpDialog } from "@/components/help/HelpDialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mainNavItems = [
  { title: "概览", url: "/", icon: LayoutDashboard },
  { title: "Agent 构建器", url: "/builder", icon: Bot },
  { title: "Skills工坊", url: "/foundry", icon: Hammer },
  { title: "测试平台", url: "/runtime", icon: Play },
  { title: "API 中心", url: "/api-hub", icon: Plug },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut } = useAuth();

  // Dialog states
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "用户";
  const email = user?.email || "";

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      <Sidebar
        className={`border-r border-border transition-all duration-300 ${
          collapsed ? "w-16" : "w-56"
        }`}
        collapsible="icon"
      >
        <div className="h-full flex flex-col bg-sidebar">
          {/* Logo */}
          <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center gap-2">
                <img src={logoIcon} alt="F" className="w-8 h-8 rounded-lg" />
                <div>
                  <div className="font-semibold text-sm">Fance OS</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">技能驱动，智能无限</div>
                </div>
              </div>
            )}
            {collapsed && (
              <img src={logoIcon} alt="F" className="w-8 h-8 rounded-lg mx-auto" />
            )}
          </div>

          <SidebarContent className="flex-1">
            {/* Main Navigation */}
            <SidebarGroup>
              {!collapsed && (
                <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-4 py-2">
                  工作台
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {mainNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url} 
                          end={item.url === "/"}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                            collapsed ? "justify-center" : ""
                          }`}
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                        >
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          {!collapsed && <span className="text-sm">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Protocol Status */}
            {!collapsed && (
              <div className="mx-4 mt-4 p-3 rounded-lg bg-card/50 border border-sidebar-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-status-executing animate-pulse" />
                  <span className="text-xs font-medium">MPLP Protocol</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  治理引擎运行中
                </div>
              </div>
            )}
          </SidebarContent>

          {/* User Section */}
          <div className="mt-auto border-t border-sidebar-border">
            {/* User Info */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`w-full flex items-center gap-3 p-4 hover:bg-sidebar-accent transition-colors ${
                    collapsed ? "justify-center" : ""
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  {!collapsed && (
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-medium truncate">{displayName}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{email}</div>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <div className="text-sm font-medium">{displayName}</div>
                  <div className="text-xs text-muted-foreground">{email}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <div className="cursor-pointer">
                    <ThemeToggle />
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setUserManagementOpen(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  用户管理
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  设置
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setHelpOpen(true)}>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  帮助
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Collapse Toggle */}
            <div className="p-2 flex justify-center border-t border-sidebar-border">
              <SidebarTrigger className="h-8 w-8 rounded-lg hover:bg-sidebar-accent">
                <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
              </SidebarTrigger>
            </div>
          </div>
        </div>
      </Sidebar>

      {/* Dialogs rendered outside DropdownMenu to avoid nesting issues */}
      <UserManagementDialog open={userManagementOpen} onOpenChange={setUserManagementOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
