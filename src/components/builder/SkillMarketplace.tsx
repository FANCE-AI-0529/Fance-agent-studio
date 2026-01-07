import { useState, useRef, useEffect, DragEvent } from "react";
import {
  Puzzle,
  Search,
  Database,
  Image,
  MessageSquare,
  FileCode,
  Sparkles,
  GripVertical,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { usePublishedSkills, type Skill as DbSkill } from "@/hooks/useSkills";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, React.ElementType> = {
  analysis: Database,
  vision: Image,
  nlp: MessageSquare,
  code: FileCode,
};

const skillCategories = [
  { id: "all", label: "全部" },
  { id: "analysis", label: "数据分析", icon: Database },
  { id: "vision", label: "图像识别", icon: Image },
  { id: "nlp", label: "自然语言", icon: MessageSquare },
  { id: "code", label: "代码生成", icon: FileCode },
];

export interface MCPTool {
  name: string;
  description?: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  permissions: string[];
  version: string;
  inputs?: Array<{ name: string; type: string; description?: string; required?: boolean }>;
  outputs?: Array<{ name: string; type: string; description?: string }>;
  // MCP-specific fields
  origin?: 'native' | 'mcp';
  mcp_type?: string | null;
  mcp_tools?: MCPTool[] | null;
  mcp_resources?: MCPResource[] | null;
  runtime_env?: string | null;
  scope?: string | null;
  is_official?: boolean | null;
  transport_url?: string | null;
}

// Convert DB skill to component skill format
function toSkill(dbSkill: DbSkill): Skill {
  return {
    id: dbSkill.id,
    name: dbSkill.name,
    category: dbSkill.category,
    description: dbSkill.description || "",
    permissions: dbSkill.permissions || [],
    version: dbSkill.version,
    inputs: (dbSkill.inputs as Skill["inputs"]) || [],
    outputs: (dbSkill.outputs as Skill["outputs"]) || [],
    // MCP fields
    origin: (dbSkill.origin as 'native' | 'mcp') || 'native',
    mcp_type: dbSkill.mcp_type,
    mcp_tools: (dbSkill.mcp_tools as unknown as MCPTool[]) || null,
    mcp_resources: (dbSkill.mcp_resources as unknown as MCPResource[]) || null,
    runtime_env: dbSkill.runtime_env,
    scope: dbSkill.scope,
    is_official: dbSkill.is_official,
    transport_url: dbSkill.transport_url,
  };
}

interface SkillMarketplaceProps {
  onDragStart: (skill: Skill) => void;
  addedSkillIds: string[];
}

export function SkillMarketplace({ onDragStart, addedSkillIds }: SkillMarketplaceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(true);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const { data: dbSkills, isLoading } = usePublishedSkills();

  const skills = (dbSkills || []).map(toSkill);

  // Handle category scroll indicators
  useEffect(() => {
    const container = categoryScrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShowLeftGradient(container.scrollLeft > 0);
      setShowRightGradient(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 1
      );
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredSkills = skills.filter((skill) => {
    const matchesSearch =
      skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      activeCategory === "all" || skill.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDragStart = (e: DragEvent<HTMLDivElement>, skill: Skill) => {
    e.dataTransfer.setData("application/json", JSON.stringify(skill));
    e.dataTransfer.effectAllowed = "copy";
    onDragStart(skill);
  };

  if (isCollapsed) {
    return (
      <div className="w-12 border-r border-border flex flex-col bg-card/50 items-center py-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsCollapsed(false)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <Puzzle className="h-4 w-4 text-cognitive" />
          <span className="text-xs text-muted-foreground [writing-mode:vertical-rl]">
            技能市场
          </span>
        </div>
        <Badge variant="secondary" className="text-[10px] px-1">
          {skills.length}
        </Badge>
      </div>
    );
  }

  return (
    <div className="w-80 border-r border-border flex flex-col bg-card/50">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2 min-w-0">
          <Puzzle className="h-4 w-4 text-cognitive flex-shrink-0" />
          <span className="font-semibold text-sm truncate">技能市场</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="secondary" className="text-xs">
            {skills.length} 可用
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsCollapsed(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索技能..."
            className="pl-9 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="relative">
        {/* Left gradient indicator */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none transition-opacity",
            showLeftGradient ? "opacity-100" : "opacity-0"
          )}
        />
        
        <div
          ref={categoryScrollRef}
          className="flex gap-1.5 p-2 border-b border-border overflow-x-auto scrollbar-hide"
        >
          {skillCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md whitespace-nowrap transition-colors flex-shrink-0",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {cat.icon && <cat.icon className="h-3.5 w-3.5" />}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Right gradient indicator */}
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none transition-opacity",
            showRightGradient ? "opacity-100" : "opacity-0"
          )}
        />
      </div>

      {/* Skills List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : skills.length === 0 ? (
          <EmptyState
            icon={Puzzle}
            title="技能市场为空"
            description="还没有已发布的技能，前往 Foundry 创建第一个技能吧"
            action={{
              label: "创建技能",
              onClick: () => window.location.href = "/foundry",
            }}
          />
        ) : filteredSkills.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm animate-fade-in">
            未找到匹配的技能
          </div>
        ) : (
          filteredSkills.map((skill) => {
            const isAdded = addedSkillIds.includes(skill.id);
            const CategoryIcon = categoryIcons[skill.category] || Sparkles;

            return (
              <div
                key={skill.id}
                draggable={!isAdded}
                onDragStart={(e) => handleDragStart(e, skill)}
                className={cn(
                  "p-3 rounded-lg border transition-all group",
                  isAdded
                    ? "border-primary/50 bg-primary/5 opacity-60 cursor-not-allowed"
                    : "border-border bg-card hover:border-primary/50 hover:shadow-sm cursor-grab active:cursor-grabbing"
                )}
              >
                <div className="flex items-start gap-2">
                  {!isAdded && (
                    <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-center gap-2 mb-1">
                      <CategoryIcon className="h-4 w-4 text-cognitive flex-shrink-0" />
                      <span className="font-medium text-sm truncate flex-1">{skill.name}</span>
                      {isAdded && (
                        <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                          已添加
                        </Badge>
                      )}
                    </div>
                    
                    {/* Description */}
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {skill.description}
                    </p>
                    
                    {/* Bottom: permissions + version */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-1 flex-wrap flex-1 min-w-0">
                        {skill.permissions.slice(0, 2).map((perm) => (
                          <Badge
                            key={perm}
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {perm}
                          </Badge>
                        ))}
                        {skill.permissions.length > 2 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            +{skill.permissions.length - 2}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        v{skill.version}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
