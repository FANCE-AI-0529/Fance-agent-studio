import { useState } from "react";
import { History, GitBranch, Calendar, GitCompare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { SnapshotTimelinePanel } from "./SnapshotTimelinePanel.tsx";

interface VersionHistoryPanelProps {
  agentId: string | null;
  onRestoreComplete?: () => void;
}

export function VersionHistoryPanel({ agentId, onRestoreComplete }: VersionHistoryPanelProps) {
  if (!agentId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
        <History className="h-12 w-12 opacity-30 mb-4" />
        <p className="text-sm text-center">保存智能体后即可查看版本历史</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          版本历史
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          浏览、对比和恢复历史版本
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <SnapshotTimelinePanel
            agentId={agentId}
            onRestoreComplete={onRestoreComplete}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
