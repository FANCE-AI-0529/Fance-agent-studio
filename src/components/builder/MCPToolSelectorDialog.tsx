import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { Button } from "../ui/button.tsx";
import { Checkbox } from "../ui/checkbox.tsx";
import { Badge } from "../ui/badge.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Input } from "../ui/input.tsx";
import { Wrench, Search, Shield, CheckCircle2 } from "lucide-react";
import { MCPBadge, MCPInfoBadges } from "../foundry/MCPBadge.tsx";
import { calculateMCPPermissions, permissionMeta, type MPLPPermission } from "../../data/mcpPermissionMapping.ts";

export interface MCPTool {
  name: string;
  description?: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
}

export interface MCPSkillData {
  id: string;
  name: string;
  description?: string;
  category: string;
  mcp_tools?: MCPTool[];
  mcp_resources?: Array<{ uri: string; name: string; description?: string }>;
  runtime_env?: string;
  scope?: string;
  is_official?: boolean;
}

interface MCPToolSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: MCPSkillData | null;
  onConfirm: (selectedTools: string[], detectedPermissions: string[]) => void;
  onCancel: () => void;
}

export function MCPToolSelectorDialog({
  open,
  onOpenChange,
  skill,
  onConfirm,
  onCancel,
}: MCPToolSelectorDialogProps) {
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const tools = skill?.mcp_tools || [];
  
  // 过滤工具
  const filteredTools = useMemo(() => {
    if (!searchTerm) return tools;
    const term = searchTerm.toLowerCase();
    return tools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(term) ||
        tool.description?.toLowerCase().includes(term)
    );
  }, [tools, searchTerm]);

  // 计算检测到的权限
  const detectedPermissions = useMemo(() => {
    return calculateMCPPermissions(
      skill?.category || "other",
      Array.from(selectedTools)
    );
  }, [skill?.category, selectedTools]);

  const handleToggleTool = (toolName: string) => {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolName)) {
        next.delete(toolName);
      } else {
        next.add(toolName);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedTools(new Set(tools.map((t) => t.name)));
  };

  const handleDeselectAll = () => {
    setSelectedTools(new Set());
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedTools), detectedPermissions);
    setSelectedTools(new Set());
    setSearchTerm("");
  };

  const handleCancel = () => {
    onCancel();
    setSelectedTools(new Set());
    setSearchTerm("");
  };

  // 当对话框打开时，默认全选
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && tools.length > 0) {
      setSelectedTools(new Set(tools.map((t) => t.name)));
    }
    onOpenChange(isOpen);
  };

  if (!skill) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <DialogTitle>配置 MCP 技能工具</DialogTitle>
          </div>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground">{skill.name}</span>
            <MCPBadge />
            <MCPInfoBadges
              runtime={skill.runtime_env}
              scope={skill.scope}
              isOfficial={skill.is_official}
            />
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* 搜索和全选按钮 */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索工具..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={selectedTools.size === tools.length ? handleDeselectAll : handleSelectAll}
            >
              {selectedTools.size === tools.length ? "取消全选" : "全选"}
            </Button>
          </div>

          {/* 工具列表 */}
          <ScrollArea className="flex-1 border rounded-md">
            <div className="p-2 space-y-1">
              {filteredTools.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {searchTerm ? "未找到匹配的工具" : "该技能没有可用的工具"}
                </div>
              ) : (
                filteredTools.map((tool) => (
                  <label
                    key={tool.name}
                    className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedTools.has(tool.name)}
                      onCheckedChange={() => handleToggleTool(tool.name)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm flex items-center gap-2">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {tool.name}
                        </code>
                      </div>
                      {tool.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {tool.description}
                        </p>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </ScrollArea>

          {/* 权限检测结果 */}
          <div className="border rounded-md p-3 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">检测到的 MPLP 权限</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {detectedPermissions.length === 0 ? (
                <span className="text-xs text-muted-foreground">请选择至少一个工具</span>
              ) : (
                detectedPermissions.map((perm) => {
                  const meta = permissionMeta[perm as MPLPPermission];
                  return (
                    <Badge
                      key={perm}
                      variant="outline"
                      className={`text-xs ${meta?.color || ""}`}
                    >
                      {meta?.label || perm}
                    </Badge>
                  );
                })
              )}
            </div>
          </div>

          {/* 统计信息 */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                已选择 {selectedTools.size}/{tools.length} 个工具
              </span>
            </div>
            {skill.mcp_resources && skill.mcp_resources.length > 0 && (
              <span>
                + {skill.mcp_resources.length} 个 Resources
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedTools.size === 0}
          >
            确认绑定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
