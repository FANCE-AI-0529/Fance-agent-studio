import React, { useState, useMemo } from "react";
import { 
  GitCompare, 
  ArrowLeftRight, 
  ChevronDown, 
  Plus, 
  Minus, 
  Equal,
  FileCode,
  Settings,
  Zap,
  History,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface VersionSnapshot {
  id: string;
  commit_hash: string;
  commit_message: string;
  created_at: string;
  system_prompt?: string;
  mplp_policy?: string;
  mounted_skills?: string[];
  personality_config?: Record<string, any>;
  graph_data?: Record<string, any>;
}

interface VersionDiffViewerProps {
  snapshots: VersionSnapshot[];
  currentVersion?: VersionSnapshot;
  isLoading?: boolean;
  onRestore?: (snapshotId: string) => void;
  className?: string;
}

// Diff types
type DiffType = "added" | "removed" | "modified" | "unchanged";

interface DiffLine {
  type: DiffType;
  content: string;
  lineNumber?: number;
}

interface DiffSection {
  title: string;
  icon: React.ReactNode;
  leftValue: string;
  rightValue: string;
  diffLines: DiffLine[];
}

// Simple line-by-line diff algorithm
function computeLineDiff(left: string, right: string): DiffLine[] {
  const leftLines = left.split("\n");
  const rightLines = right.split("\n");
  const result: DiffLine[] = [];

  const maxLength = Math.max(leftLines.length, rightLines.length);

  for (let i = 0; i < maxLength; i++) {
    const leftLine = leftLines[i] ?? "";
    const rightLine = rightLines[i] ?? "";

    if (i >= leftLines.length) {
      result.push({ type: "added", content: rightLine, lineNumber: i + 1 });
    } else if (i >= rightLines.length) {
      result.push({ type: "removed", content: leftLine, lineNumber: i + 1 });
    } else if (leftLine !== rightLine) {
      result.push({ type: "removed", content: leftLine, lineNumber: i + 1 });
      result.push({ type: "added", content: rightLine, lineNumber: i + 1 });
    } else {
      result.push({ type: "unchanged", content: leftLine, lineNumber: i + 1 });
    }
  }

  return result;
}

// Diff line component
function DiffLineView({ line }: { line: DiffLine }) {
  const bgColors: Record<DiffType, string> = {
    added: "bg-green-500/10 border-l-2 border-green-500",
    removed: "bg-red-500/10 border-l-2 border-red-500",
    modified: "bg-yellow-500/10 border-l-2 border-yellow-500",
    unchanged: "bg-transparent",
  };

  const icons: Record<DiffType, React.ReactNode> = {
    added: <Plus className="h-3 w-3 text-green-500" />,
    removed: <Minus className="h-3 w-3 text-red-500" />,
    modified: <Equal className="h-3 w-3 text-yellow-500" />,
    unchanged: <span className="w-3" />,
  };

  return (
    <div
      className={cn(
        "flex items-start gap-2 px-3 py-0.5 font-mono text-xs",
        bgColors[line.type]
      )}
    >
      <span className="w-8 text-right text-muted-foreground/50 select-none">
        {line.lineNumber}
      </span>
      <span className="flex-shrink-0">{icons[line.type]}</span>
      <pre className="flex-1 whitespace-pre-wrap break-all">
        {line.content || " "}
      </pre>
    </div>
  );
}

// Version selector dropdown
function VersionSelector({
  snapshots,
  selectedId,
  onChange,
  label,
}: {
  snapshots: VersionSnapshot[];
  selectedId: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Select value={selectedId} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="选择版本" />
        </SelectTrigger>
        <SelectContent>
          {snapshots.map((snapshot) => (
            <SelectItem key={snapshot.id} value={snapshot.id}>
              <div className="flex items-center gap-2">
                <code className="text-xs text-muted-foreground">
                  {snapshot.commit_hash.substring(0, 7)}
                </code>
                <span className="truncate max-w-[150px]">
                  {snapshot.commit_message}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Diff stats summary
function DiffStats({ sections }: { sections: DiffSection[] }) {
  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    let modified = 0;

    sections.forEach(section => {
      section.diffLines.forEach(line => {
        if (line.type === "added") added++;
        if (line.type === "removed") removed++;
      });
      if (section.leftValue !== section.rightValue && section.leftValue && section.rightValue) {
        modified++;
      }
    });

    return { added, removed, modified };
  }, [sections]);

  return (
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-1">
        <Plus className="h-3 w-3 text-green-500" />
        <span className="text-green-500">{stats.added} 新增</span>
      </div>
      <div className="flex items-center gap-1">
        <Minus className="h-3 w-3 text-red-500" />
        <span className="text-red-500">{stats.removed} 删除</span>
      </div>
      <div className="flex items-center gap-1">
        <ArrowLeftRight className="h-3 w-3 text-yellow-500" />
        <span className="text-yellow-500">{stats.modified} 修改</span>
      </div>
    </div>
  );
}

// Main component
export function VersionDiffViewer({
  snapshots,
  currentVersion,
  isLoading,
  onRestore,
  className,
}: VersionDiffViewerProps) {
  const [leftId, setLeftId] = useState<string>(snapshots[1]?.id || "");
  const [rightId, setRightId] = useState<string>(snapshots[0]?.id || "");
  const [activeTab, setActiveTab] = useState("prompt");

  const leftSnapshot = snapshots.find(s => s.id === leftId);
  const rightSnapshot = snapshots.find(s => s.id === rightId);

  // Compute diffs for each section
  const diffSections = useMemo((): DiffSection[] => {
    if (!leftSnapshot || !rightSnapshot) return [];

    return [
      {
        title: "系统提示词",
        icon: <FileCode className="h-4 w-4" />,
        leftValue: leftSnapshot.system_prompt || "",
        rightValue: rightSnapshot.system_prompt || "",
        diffLines: computeLineDiff(
          leftSnapshot.system_prompt || "",
          rightSnapshot.system_prompt || ""
        ),
      },
      {
        title: "MPLP 策略",
        icon: <Settings className="h-4 w-4" />,
        leftValue: leftSnapshot.mplp_policy || "",
        rightValue: rightSnapshot.mplp_policy || "",
        diffLines: computeLineDiff(
          leftSnapshot.mplp_policy || "",
          rightSnapshot.mplp_policy || ""
        ),
      },
      {
        title: "挂载技能",
        icon: <Zap className="h-4 w-4" />,
        leftValue: JSON.stringify(leftSnapshot.mounted_skills || [], null, 2),
        rightValue: JSON.stringify(rightSnapshot.mounted_skills || [], null, 2),
        diffLines: computeLineDiff(
          JSON.stringify(leftSnapshot.mounted_skills || [], null, 2),
          JSON.stringify(rightSnapshot.mounted_skills || [], null, 2)
        ),
      },
      {
        title: "人设配置",
        icon: <Settings className="h-4 w-4" />,
        leftValue: JSON.stringify(leftSnapshot.personality_config || {}, null, 2),
        rightValue: JSON.stringify(rightSnapshot.personality_config || {}, null, 2),
        diffLines: computeLineDiff(
          JSON.stringify(leftSnapshot.personality_config || {}, null, 2),
          JSON.stringify(rightSnapshot.personality_config || {}, null, 2)
        ),
      },
    ];
  }, [leftSnapshot, rightSnapshot]);

  const swapVersions = () => {
    const temp = leftId;
    setLeftId(rightId);
    setRightId(temp);
  };

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (snapshots.length < 2) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">暂无可对比的版本</h3>
          <p className="text-sm text-muted-foreground mt-1">
            至少需要两个版本才能进行对比
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-primary" />
            版本对比
          </CardTitle>
          <DiffStats sections={diffSections} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Version selectors */}
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <VersionSelector
              snapshots={snapshots}
              selectedId={leftId}
              onChange={setLeftId}
              label="旧版本"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 mb-0.5"
            onClick={swapVersions}
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <VersionSelector
              snapshots={snapshots}
              selectedId={rightId}
              onChange={setRightId}
              label="新版本"
            />
          </div>
        </div>

        {/* Version info badges */}
        {leftSnapshot && rightSnapshot && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {leftSnapshot.commit_hash.substring(0, 7)}
              </Badge>
              <span>
                {format(new Date(leftSnapshot.created_at), "yyyy/MM/dd HH:mm", { locale: zhCN })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {rightSnapshot.commit_hash.substring(0, 7)}
              </Badge>
              <span>
                {format(new Date(rightSnapshot.created_at), "yyyy/MM/dd HH:mm", { locale: zhCN })}
              </span>
            </div>
          </div>
        )}

        {/* Diff tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            {diffSections.map((section, index) => (
              <TabsTrigger
                key={index}
                value={index === 0 ? "prompt" : index === 1 ? "mplp" : index === 2 ? "skills" : "personality"}
                className="gap-1 text-xs"
              >
                {section.icon}
                <span className="hidden sm:inline">{section.title}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {diffSections.map((section, index) => (
            <TabsContent
              key={index}
              value={index === 0 ? "prompt" : index === 1 ? "mplp" : index === 2 ? "skills" : "personality"}
              className="mt-4"
            >
              <ScrollArea className="h-[400px] border rounded-lg">
                <div className="min-w-[500px]">
                  {section.diffLines.map((line, lineIndex) => (
                    <DiffLineView key={lineIndex} line={line} />
                  ))}
                  {section.diffLines.length === 0 && (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      无差异
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>

        {/* Restore button */}
        {onRestore && leftSnapshot && (
          <div className="flex justify-end pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRestore(leftSnapshot.id)}
            >
              <History className="h-4 w-4 mr-2" />
              恢复到此版本
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default VersionDiffViewer;
