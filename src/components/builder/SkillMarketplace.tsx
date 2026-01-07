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
  Globe,
  Plug,
  Terminal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { usePublishedSkills, type Skill as DbSkill } from "@/hooks/useSkills";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/settings/LanguageSwitcher";
import { mcpCategories, getMCPCategoryById, runtimeEnvConfig, scopeConfig } from "@/data/mcpCategories";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, React.ElementType> = {
  analysis: Database,
  vision: Image,
  nlp: MessageSquare,
  code: FileCode,
};

// Native skill categories
const nativeCategories = [
  { id: "all", label: "All", labelZh: "全部" },
  { id: "analysis", label: "Data Analysis", labelZh: "数据分析", icon: Database },
  { id: "vision", label: "Vision", labelZh: "图像识别", icon: Image },
  { id: "nlp", label: "NLP", labelZh: "自然语言", icon: MessageSquare },
  { id: "code", label: "Code Gen", labelZh: "代码生成", icon: FileCode },
];

// Origin filter options
const originFilters = [
  { id: "all", label: "All", labelZh: "全部", icon: Sparkles },
  { id: "native", label: "Agent Skills", labelZh: "Agent Skills", icon: Puzzle },
  { id: "mcp", label: "MCP", labelZh: "MCP 生态", icon: Plug },
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
  description_zh?: string;
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
  const { language, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [originFilter, setOriginFilter] = useState<'all' | 'native' | 'mcp'>('all');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(true);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const { data: dbSkills, isLoading } = usePublishedSkills();

  const skills = (dbSkills || []).map(toSkill);

  // Get categories based on origin filter
  const getActiveCategories = () => {
    if (originFilter === 'mcp') {
      return [{ id: "all", label: "All", labelZh: "全部" }, ...mcpCategories.map(c => ({
        id: c.id,
        label: c.label,
        labelZh: c.labelZh,
        icon: c.icon,
      }))];
    }
    return nativeCategories;
  };

  const activeCategories = getActiveCategories();

  // Reset category when origin filter changes
  useEffect(() => {
    setActiveCategory("all");
  }, [originFilter]);

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
  }, [activeCategories]);

  const filteredSkills = skills.filter((skill) => {
    const matchesSearch =
      skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Origin filter
    const matchesOrigin = originFilter === 'all' || skill.origin === originFilter;
    
    // Category filter - use mcp_type for MCP skills, category for native
    const skillCategory = skill.origin === 'mcp' ? skill.mcp_type : skill.category;
    const matchesCategory = activeCategory === 'all' || skillCategory === activeCategory;
    
    return matchesSearch && matchesOrigin && matchesCategory;
  });

  const handleDragStart = (e: DragEvent<HTMLDivElement>, skill: Skill) => {
    e.dataTransfer.setData("application/json", JSON.stringify(skill));
    e.dataTransfer.effectAllowed = "copy";
    onDragStart(skill);
  };

  // Get localized category label
  const getCategoryLabel = (cat: { label: string; labelZh: string }) => {
    return language === 'zh' ? cat.labelZh : cat.label;
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
            {t("skill.market.title")}
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
          <span className="font-semibold text-sm truncate">{t("skill.market.title")}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <LanguageSwitcher />
          <Badge variant="secondary" className="text-xs">
            {skills.length} {t("skill.market.available")}
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
            placeholder={t("skill.market.search")}
            className="pl-9 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Origin Filter */}
      <div className="flex gap-1 p-2 border-b border-border">
        {originFilters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setOriginFilter(filter.id as 'all' | 'native' | 'mcp')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-md transition-colors",
              originFilter === filter.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            <filter.icon className="h-3 w-3" />
            {language === 'zh' ? filter.labelZh : filter.label}
          </button>
        ))}
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
          {activeCategories.map((cat) => {
            const CatIcon = 'icon' in cat ? cat.icon : undefined;
            return (
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
                {CatIcon && <CatIcon className="h-3.5 w-3.5" />}
                {getCategoryLabel(cat)}
              </button>
            );
          })}
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
            title={t("skill.market.empty")}
            description={t("skill.market.empty_desc")}
            action={{
              label: t("skill.market.create"),
              onClick: () => window.location.href = "/foundry",
            }}
          />
        ) : filteredSkills.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm animate-fade-in">
            {t("skill.market.no_match")}
          </div>
        ) : (
          filteredSkills.map((skill) => {
            const isAdded = addedSkillIds.includes(skill.id);
            const isMCP = skill.origin === 'mcp';
            const CategoryIcon = isMCP 
              ? (getMCPCategoryById(skill.mcp_type || '')?.icon || Plug)
              : (categoryIcons[skill.category] || Sparkles);
            const runtimeEnv = skill.runtime_env ? runtimeEnvConfig[skill.runtime_env] : null;
            const scope = skill.scope ? scopeConfig[skill.scope] : null;

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
                      <CategoryIcon className={cn(
                        "h-4 w-4 flex-shrink-0",
                        isMCP 
                          ? getMCPCategoryById(skill.mcp_type || '')?.color || "text-muted-foreground"
                          : "text-cognitive"
                      )} />
                      <span className="font-medium text-sm truncate flex-1">{skill.name}</span>
                      {isMCP && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-600 border-purple-500/30 flex-shrink-0">
                          MCP
                        </Badge>
                      )}
                      {isAdded && (
                        <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                          {t("skill.market.added")}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Runtime & Scope badges for MCP */}
                    {isMCP && (runtimeEnv || scope) && (
                      <div className="flex items-center gap-1 mb-1.5">
                        {runtimeEnv && (
                          <span className="text-[10px]" title={runtimeEnv.label}>
                            {runtimeEnv.emoji}
                          </span>
                        )}
                        {scope && (
                          <span className="text-[10px]" title={scope.label}>
                            {scope.emoji}
                          </span>
                        )}
                        {skill.is_official && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 bg-green-500/10 text-green-600 border-green-500/30">
                            ✓ {language === 'zh' ? '官方' : 'Official'}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* Description - use localized version if available */}
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {language === 'zh' && skill.description_zh 
                        ? skill.description_zh 
                        : skill.description}
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
