import { 
  Bot, 
  Hammer, 
  Play, 
  Settings, 
  HelpCircle,
  ChevronLeft,
  LayoutDashboard
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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

const mainNavItems = [
  { title: "概览", url: "/", icon: LayoutDashboard },
  { title: "Agent 构建器", url: "/builder", icon: Bot },
  { title: "技能工坊", url: "/foundry", icon: Hammer },
  { title: "运行环境", url: "/runtime", icon: Play },
];

const bottomNavItems = [
  { title: "设置", url: "/settings", icon: Settings },
  { title: "帮助", url: "/help", icon: HelpCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
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
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="font-semibold text-sm">Agent OS</div>
                <div className="text-[10px] text-muted-foreground">Studio v1.0</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
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

        {/* Bottom Navigation */}
        <div className="mt-auto border-t border-sidebar-border">
          <SidebarMenu>
            {bottomNavItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to={item.url}
                    className={`flex items-center gap-3 px-4 py-2.5 transition-colors text-muted-foreground hover:text-foreground ${
                      collapsed ? "justify-center" : ""
                    }`}
                    activeClassName="text-foreground"
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && <span className="text-sm">{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>

          {/* Collapse Toggle */}
          <div className="p-2 flex justify-center">
            <SidebarTrigger className="h-8 w-8 rounded-lg hover:bg-sidebar-accent">
              <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
            </SidebarTrigger>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}