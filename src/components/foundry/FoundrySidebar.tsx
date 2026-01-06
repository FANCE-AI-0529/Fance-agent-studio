import { useState } from "react";
import {
  FolderTree,
  Sparkles,
  Plus,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Code2,
  FileCode,
  Package,
  History,
  Upload,
  Download,
  Search,
  BookOpen,
  Trash2,
  MoreHorizontal,
  CheckCircle2,
  Plug,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { SkillMode } from "@/components/foundry/SkillModeSwitch";

export interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  language?: string;
  children?: FileItem[];
}

export interface SkillInfo {
  id: string;
  name: string;
  version: string;
  is_published: boolean;
}

const fileIcons: Record<string, React.ElementType> = {
  md: FileText,
  py: Code2,
  yaml: FileCode,
  json: Server,
  ts: Code2,
  js: Code2,
};

function getFileIcon(filename: string): React.ElementType {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return fileIcons[ext] || FileText;
}

interface FoundrySidebarProps {
  skills: SkillInfo[];
  activeSkillId: string | null;
  onSkillSelect: (skillId: string | null) => void;
  onNewSkill: () => void;
  onDeleteSkill: () => void;
  files: FileItem[];
  activeFileId: string;
  onFileSelect: (file: FileItem) => void;
  onLoadTemplate: () => void;
  onOpenTemplates: () => void;
  onOpenImportExport: () => void;
  onOpenVersionHistory: () => void;
  isLoading?: boolean;
  skillMode?: SkillMode;
}

function FileTreeItem({
  item,
  depth,
  activeFileId,
  onSelect,
}: {
  item: FileItem;
  depth: number;
  activeFileId: string;
  onSelect: (file: FileItem) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const isActive = item.id === activeFileId;
  const FileIcon =
    item.type === "folder"
      ? isOpen
        ? FolderOpen
        : Folder
      : getFileIcon(item.name);

  return (
    <div>
      <button
        onClick={() => {
          if (item.type === "folder") {
            setIsOpen(!isOpen);
          } else {
            onSelect(item);
          }
        }}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {item.type === "folder" && (
          <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
            {isOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
        )}
        {item.type === "file" && <span className="w-4 flex-shrink-0" />}
        <FileIcon
          className={cn(
            "h-4 w-4 flex-shrink-0",
            isActive ? "text-primary" : "text-muted-foreground"
          )}
        />
        <span className="truncate">{item.name}</span>
      </button>

      {item.type === "folder" && isOpen && item.children && (
        <div>
          {item.children.map((child) => (
            <FileTreeItem
              key={child.id}
              item={child}
              depth={depth + 1}
              activeFileId={activeFileId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FoundrySidebar({
  skills,
  activeSkillId,
  onSkillSelect,
  onNewSkill,
  onDeleteSkill,
  files,
  activeFileId,
  onFileSelect,
  onLoadTemplate,
  onOpenTemplates,
  onOpenImportExport,
  onOpenVersionHistory,
  isLoading,
  skillMode = "native",
}: FoundrySidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionsOpen, setSectionsOpen] = useState({
    skills: true,
    files: true,
    templates: false,
    tools: false,
  });

  const filteredSkills = skills.filter((skill) =>
    skill.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const activeSkill = skills.find((s) => s.id === activeSkillId);

  return (
    <div className="w-72 border-r border-border flex flex-col bg-card/50">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border bg-card/80">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-cognitive" />
          <span className="font-semibold text-sm">技能工坊</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onNewSkill}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索技能..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 bg-background"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* My Skills Section */}
          <Collapsible
            open={sectionsOpen.skills}
            onOpenChange={() => toggleSection("skills")}
          >
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between px-2 py-2 rounded-md hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-2">
                  {sectionsOpen.skills ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    我的技能
                  </span>
                </div>
                <Badge variant="secondary" className="text-[10px] h-5">
                  {skills.length}
                </Badge>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-0.5 mt-1">
                {/* New Skill Button */}
                <button
                  onClick={onNewSkill}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    activeSkillId === null
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Plus className="h-4 w-4" />
                  <span>新建技能</span>
                </button>

                {/* Skill List */}
                {isLoading ? (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                    加载中...
                  </div>
                ) : filteredSkills.length === 0 && searchTerm ? (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                    未找到匹配的技能
                  </div>
                ) : (
                  filteredSkills.map((skill) => (
                    <div
                      key={skill.id}
                      className={cn(
                        "group flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer",
                        activeSkillId === skill.id
                          ? "bg-primary/10"
                          : "hover:bg-secondary/50"
                      )}
                      onClick={() => onSkillSelect(skill.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText
                          className={cn(
                            "h-4 w-4 flex-shrink-0",
                            activeSkillId === skill.id
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        />
                        <span
                          className={cn(
                            "text-sm truncate",
                            activeSkillId === skill.id
                              ? "text-primary font-medium"
                              : "text-foreground"
                          )}
                        >
                          {skill.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {skill.is_published && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-status-executing" />
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={onOpenVersionHistory}>
                              <History className="h-3.5 w-3.5 mr-2" />
                              版本历史
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                onSkillSelect(skill.id);
                                setTimeout(onDeleteSkill, 100);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* File Explorer Section */}
          <Collapsible
            open={sectionsOpen.files}
            onOpenChange={() => toggleSection("files")}
          >
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between px-2 py-2 rounded-md hover:bg-secondary/50 transition-colors mt-2">
                <div className="flex items-center gap-2">
                  {sectionsOpen.files ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <FolderTree className="h-3.5 w-3.5 text-cognitive" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    技能文件
                  </span>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1">
                {files.map((file) => (
                  <FileTreeItem
                    key={file.id}
                    item={file}
                    depth={0}
                    activeFileId={activeFileId}
                    onSelect={onFileSelect}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Templates Section */}
          <Collapsible
            open={sectionsOpen.templates}
            onOpenChange={() => toggleSection("templates")}
          >
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between px-2 py-2 rounded-md hover:bg-secondary/50 transition-colors mt-2">
                <div className="flex items-center gap-2">
                  {sectionsOpen.templates ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    模板库
                  </span>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-0.5 mt-1 pl-2">
                <button
                  onClick={onLoadTemplate}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Anthropic 标准模板</span>
                </button>
                <button
                  onClick={onOpenTemplates}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>更多模板...</span>
                </button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Tools Section */}
          <Collapsible
            open={sectionsOpen.tools}
            onOpenChange={() => toggleSection("tools")}
          >
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between px-2 py-2 rounded-md hover:bg-secondary/50 transition-colors mt-2">
                <div className="flex items-center gap-2">
                  {sectionsOpen.tools ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    工具
                  </span>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-0.5 mt-1 pl-2">
                <button
                  onClick={onOpenImportExport}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  <span>导入技能</span>
                </button>
                <button
                  onClick={onOpenImportExport}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>导出技能</span>
                </button>
                <button
                  onClick={onOpenVersionHistory}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <History className="h-4 w-4" />
                  <span>版本历史</span>
                </button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Footer - Current Skill Status */}
      {activeSkill && (
        <div className="p-3 border-t border-border bg-card/80">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{activeSkill.name}</div>
              <div className="text-xs text-muted-foreground">
                v{activeSkill.version}
              </div>
            </div>
            <Badge variant={activeSkill.is_published ? "default" : "secondary"}>
              {activeSkill.is_published ? "已发布" : "草稿"}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
