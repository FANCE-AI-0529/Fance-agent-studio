import React, { useEffect, useCallback } from "react";
import {
  GitBranch,
  Database,
  Zap,
  Users,
  Link,
  History,
  Bug,
  ChevronUp,
  ChevronDown,
  Keyboard,
  X,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  useDevToolsState,
  DEVTOOLS_SHORTCUTS,
  DEVTOOLS_TABS,
  type DevToolsTab,
} from "@/hooks/useDevToolsState";

// 内联 Tab 图标映射
const TAB_ICONS: Record<string, React.ElementType> = {
  GitBranch,
  Database,
  Zap,
  Users,
  Link,
  History,
  Bug,
};

interface DevToolsPanelProps {
  // 子组件渲染函数
  renderTrace?: () => React.ReactNode;
  renderContext?: () => React.ReactNode;
  renderCircuit?: () => React.ReactNode;
  renderCollaboration?: () => React.ReactNode;
  renderTaskChain?: () => React.ReactNode;
  renderHistory?: () => React.ReactNode;
  renderDebug?: () => React.ReactNode;
  
  // 回调
  onClose?: () => void;
}

export function DevToolsPanel({
  renderTrace,
  renderContext,
  renderCircuit,
  renderCollaboration,
  renderTaskChain,
  renderHistory,
  renderDebug,
  onClose,
}: DevToolsPanelProps) {
  const {
    isCollapsed,
    activeTab,
    hasCircuitWarning,
    hasDriftWarning,
    pendingTaskCount,
    setActiveTab,
    toggleCollapsed,
  } = useDevToolsState();

  // 快捷键处理
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ctrl + ` 切换折叠
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        toggleCollapsed();
        return;
      }

      // Ctrl + 1-7 切换标签页
      if (e.ctrlKey && !e.shiftKey) {
        const tabIndex = parseInt(e.key) - 1;
        if (tabIndex >= 0 && tabIndex < DEVTOOLS_TABS.length) {
          e.preventDefault();
          setActiveTab(DEVTOOLS_TABS[tabIndex].id);
        }
      }
    },
    [toggleCollapsed, setActiveTab]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // 渲染器映射
  const renderContent = (tab: DevToolsTab): React.ReactNode => {
    const renderers: Record<DevToolsTab, (() => React.ReactNode) | undefined> = {
      trace: renderTrace,
      context: renderContext,
      circuit: renderCircuit,
      collaboration: renderCollaboration,
      taskchain: renderTaskChain,
      history: renderHistory,
      debug: renderDebug,
    };

    const renderer = renderers[tab];
    if (renderer) {
      return renderer();
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
          {React.createElement(TAB_ICONS[DEVTOOLS_TABS.find((t) => t.id === tab)?.icon || "Bug"], {
            className: "h-6 w-6 opacity-50",
          })}
        </div>
        <p className="text-sm font-medium">
          {DEVTOOLS_TABS.find((t) => t.id === tab)?.label || "未知"}
        </p>
        <p className="text-xs mt-1 opacity-70">此功能模块尚未加载</p>
      </div>
    );
  };

  // 获取标签页的警告指示器
  const getTabIndicator = (tabId: DevToolsTab) => {
    if (tabId === "circuit" && hasCircuitWarning) {
      return <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full animate-pulse" />;
    }
    if (tabId === "collaboration" && hasDriftWarning) {
      return <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full" />;
    }
    if (tabId === "taskchain" && pendingTaskCount > 0) {
      return (
        <Badge
          variant="secondary"
          className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px] bg-primary text-primary-foreground"
        >
          {pendingTaskCount}
        </Badge>
      );
    }
    return null;
  };

  // 折叠状态的迷你栏
  if (isCollapsed) {
    return (
      <div className="h-10 border-t bg-card/80 backdrop-blur-sm flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={toggleCollapsed}
          >
            <ChevronUp className="h-3.5 w-3.5 mr-1" />
            展开开发者工具
          </Button>
          
          {/* 快速状态指示 */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {hasCircuitWarning && (
              <Badge variant="destructive" className="h-5 text-[10px]">
                <Zap className="h-3 w-3 mr-1" />
                熔断
              </Badge>
            )}
            {hasDriftWarning && (
              <Badge variant="outline" className="h-5 text-[10px] border-amber-500 text-amber-500">
                漂移告警
              </Badge>
            )}
            {pendingTaskCount > 0 && (
              <Badge variant="secondary" className="h-5 text-[10px]">
                {pendingTaskCount} 待处理
              </Badge>
            )}
          </div>
        </div>

        {/* 快捷键提示 */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Keyboard className="h-3 w-3" />
          <span>Ctrl+` 展开</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-t bg-card/80 backdrop-blur-sm">
      {/* 标签页头部 */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as DevToolsTab)}
        className="flex flex-col h-full"
      >
        <div className="flex items-center justify-between px-2 py-1 border-b bg-muted/30">
          <TabsList className="h-8 p-0.5 bg-transparent gap-0.5">
            {DEVTOOLS_TABS.map((tab, index) => {
              const Icon = TAB_ICONS[tab.icon];
              return (
                <Tooltip key={tab.id}>
                  <TooltipTrigger asChild>
                    <TabsTrigger
                      value={tab.id}
                      className={cn(
                        "relative h-7 px-2.5 text-xs gap-1.5",
                        "data-[state=active]:bg-background data-[state=active]:shadow-sm"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      {getTabIndicator(tab.id)}
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {tab.label}
                    <kbd className="ml-2 px-1.5 py-0.5 bg-muted rounded text-[10px]">
                      Ctrl+{index + 1}
                    </kbd>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TabsList>

          <div className="flex items-center gap-1">
            {/* 快捷键指南 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Keyboard className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <div className="text-xs space-y-1">
                  <p className="font-medium mb-2">快捷键</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <span>切换面板</span>
                    <kbd className="px-1 bg-muted rounded">Ctrl+`</kbd>
                    <span>切换标签</span>
                    <kbd className="px-1 bg-muted rounded">Ctrl+1~7</kbd>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>

            {/* 折叠按钮 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={toggleCollapsed}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>

            {/* 关闭按钮 */}
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={onClose}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 min-h-0">
          {DEVTOOLS_TABS.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="h-full m-0 data-[state=inactive]:hidden"
            >
              <ScrollArea className="h-full">
                <div className="p-3">{renderContent(tab.id)}</div>
              </ScrollArea>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
