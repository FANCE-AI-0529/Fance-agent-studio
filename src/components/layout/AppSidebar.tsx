import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Settings, 
  HelpCircle,
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  User,
  Users,
  Lock,
  Sparkles,
  Hexagon,
  Loader2,
} from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";
import { useAppModeStore } from "@/stores/appModeStore";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserManagementDialog } from "@/components/user/UserManagementDialog";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { HelpDialog } from "@/components/help/HelpDialog";
import { useMyAgents } from "@/hooks/useAgents";
import { AgentAvatarDisplay, type AgentAvatar } from "@/components/builder/AgentAvatarPicker";
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
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

const mainNavItems = [
  { title: "工作台", url: "/", icon: LayoutDashboard },
  { title: "HIVE", url: "/hive", icon: Hexagon },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const { toggleMode } = useAppModeStore();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: myAgents = [], isLoading: agentsLoading } = useMyAgents();

  const handleReturnToMagic = () => {
    toggleMode();
    navigate('/');
  };

  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "用户";
  const email = user?.email || "";

  const handleSignOut = async () => {
    await signOut();
  };

  const handleAgentClick = (agent: any) => {
    if (agent.status === 'deployed') {
      navigate(`/hive?tab=runtime&agentId=${agent.id}`);
    } else {
      navigate(`/hive?tab=builder&agentId=${agent.id}`);
    }
  };

  const displayedAgents = myAgents.slice(0, 10);

  return (
    <>
      <Sidebar
        className={`border-r border-border transition-all duration-300 ${
          collapsed ? "w-16" : "w-60"
        }`}
        collapsible="icon"
      >
        <div className="h-full flex flex-col bg-sidebar">
          {/* Logo & Brand */}
          <div className="p-4 border-b border-sidebar-border">
            <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
              <img src={logoIcon} alt="FANCE" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-foreground">FANCE</div>
                  <div className="text-[10px] text-muted-foreground">技能驱动，智能无限！</div>
                </div>
              )}
            </div>
          </div>

          {/* MPLP Protocol Status */}
          {!collapsed && (
            <div className="px-4 py-3 border-b border-sidebar-border">
              <div className="protocol-badge w-full justify-center">
                <Lock className="h-3 w-3" />
                <span>MPLP v1.0.0</span>
                <Badge variant="outline" className="h-4 text-[9px] px-1.5 border-primary/30 text-primary">
                  已锁定
                </Badge>
              </div>
            </div>
          )}

          <SidebarContent className="flex-1 py-2 overflow-hidden flex flex-col">
            {/* Main Navigation */}
            <SidebarGroup>
              {!collapsed && (
                <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-4 py-2">
                  导航
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="px-2">
                  {mainNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            <NavLink 
                              to={item.url} 
                              end={item.url === "/"}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:bg-sidebar-accent ${
                                collapsed ? "justify-center" : ""
                              }`}
                              activeClassName="bg-primary/10 text-primary border border-primary/20"
                            >
                              <item.icon className="h-4 w-4 flex-shrink-0" />
                              {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        {collapsed && (
                          <TooltipContent side="right" className="font-medium">
                            {item.title}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* My Agents List */}
            <SidebarGroup className="flex-1 overflow-hidden flex flex-col">
              {!collapsed && (
                <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-4 py-2 flex items-center justify-between">
                  <span>我的智能体</span>
                  {myAgents.length > 10 && (
                    <button 
                      onClick={() => navigate('/hive?tab=builder')}
                      className="text-[10px] text-primary hover:underline"
                    >
                      全部
                    </button>
                  )}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="px-2 space-y-0.5">
                    {agentsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : displayedAgents.length === 0 ? (
                      !collapsed && (
                        <button
                          onClick={() => navigate('/hive?tab=builder')}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent transition-colors"
                        >
                          <Hexagon className="h-4 w-4" />
                          <span>创建第一个智能体</span>
                        </button>
                      )
                    ) : (
                      displayedAgents.map((agent) => {
                        const avatar = (agent.manifest as any)?.avatar as AgentAvatar | undefined;
                        const isActive = location.search.includes(`agentId=${agent.id}`);
                        
                        return (
                          <Tooltip key={agent.id}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleAgentClick(agent)}
                                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all hover:bg-sidebar-accent group ${
                                  collapsed ? "justify-center" : ""
                                } ${isActive ? "bg-primary/10 text-primary" : ""}`}
                              >
                                <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
                                  <AgentAvatarDisplay 
                                    avatar={avatar || { iconId: 'bot', colorId: 'primary' }} 
                                    size="sm" 
                                  />
                                </div>
                                {!collapsed && (
                                  <>
                                    <span className="text-sm truncate flex-1 text-left">
                                      {agent.name}
                                    </span>
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                      agent.status === 'deployed' 
                                        ? "bg-emerald-500" 
                                        : "border border-muted-foreground/40"
                                    }`} />
                                  </>
                                )}
                              </button>
                            </TooltipTrigger>
                            {collapsed && (
                              <TooltipContent side="right" className="font-medium">
                                <div className="flex items-center gap-2">
                                  <span>{agent.name}</span>
                                  <div className={`w-1.5 h-1.5 rounded-full ${
                                    agent.status === 'deployed' ? "bg-emerald-500" : "border border-muted-foreground/40"
                                  }`} />
                                </div>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Protocol Runtime Status */}
            {!collapsed && (
              <div className="mx-4 mt-2 p-3 rounded-lg bg-card/50 border border-border flex-shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-status-executing animate-pulse" />
                  <span className="text-xs font-medium text-foreground">治理引擎</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-port-data" />
                    <span className="text-muted-foreground">数据流</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-port-control" />
                    <span className="text-muted-foreground">控制流</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-port-perception" />
                    <span className="text-muted-foreground">感知流</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-status-planning" />
                    <span className="text-muted-foreground">规划中</span>
                  </div>
                </div>
              </div>
            )}
          </SidebarContent>

          {/* Magic Mode Toggle */}
          <div className="px-3 py-2 border-t border-sidebar-border">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleReturnToMagic}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 ${
                    collapsed ? "justify-center" : ""
                  }`}
                >
                  <Sparkles className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span className="text-sm font-medium">返回魔法界面</span>}
                </button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" className="font-medium">
                  返回魔法界面
                </TooltipContent>
              )}
            </Tooltip>
          </div>

          {/* User Section */}
          <div className="mt-auto border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`w-full flex items-center gap-3 p-4 hover:bg-sidebar-accent transition-colors ${
                    collapsed ? "justify-center" : ""
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/20">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  {!collapsed && (
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-medium truncate text-foreground">{displayName}</div>
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
                  帮助中心
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
              <SidebarTrigger className="h-8 w-8 rounded-lg hover:bg-sidebar-accent transition-colors">
                <ChevronLeft className={`h-4 w-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} />
              </SidebarTrigger>
            </div>
          </div>
        </div>
      </Sidebar>

      {/* Dialogs */}
      <UserManagementDialog open={userManagementOpen} onOpenChange={setUserManagementOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
