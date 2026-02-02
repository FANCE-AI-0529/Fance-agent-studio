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
  BookOpen,
  FileText,
  Layers,
  Network,
  GitBranch,
  Route,
  GitMerge,
  Zap,
  Brain,
  Code2,
  ScanSearch,
  FileCode2,
  Variable,
  Repeat,
  RefreshCcw,
  FileOutput,
} from "lucide-react";
import { MCPActionsPanel, MCPActionDragItem, InterventionDragItem } from "./MCPActionsPanel";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { usePublishedSkills, type Skill as DbSkill } from "@/hooks/useSkills";
import { useKnowledgeBases } from "@/hooks/useKnowledgeBases";
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
  { id: "design", label: "Design", labelZh: "创意设计", icon: Sparkles },
  { id: "content", label: "Content", labelZh: "内容创作", icon: FileText },
  { id: "document", label: "Document", labelZh: "文档处理", icon: FileText },
];

// Origin filter options
const originFilters = [
  { id: "all", label: "All", labelZh: "全部", icon: Sparkles },
  { id: "native", label: "Skills", labelZh: "Skills", icon: Puzzle },
  { id: "mcp", label: "MCP", labelZh: "MCP", icon: Plug },
  { id: "actions", label: "Actions", labelZh: "动作", icon: Zap },
  { id: "knowledge", label: "Knowledge", labelZh: "知识库", icon: BookOpen },
  { id: "logic", label: "Logic", labelZh: "逻辑", icon: GitBranch },
];

// Logic node definitions
const logicNodes = [
  {
    id: "intent-router",
    name: "意图路由器",
    nameEn: "Intent Router",
    description: "基于语义或关键词将输入路由到不同分支",
    descriptionEn: "Route input to different branches based on semantics or keywords",
    icon: Route,
    nodeType: "intentRouter" as const,
    color: "cyan",
  },
  {
    id: "condition",
    name: "条件判断",
    nameEn: "Condition",
    description: "IF/ELSE 逻辑分支判断",
    descriptionEn: "IF/ELSE conditional branching",
    icon: GitBranch,
    nodeType: "condition" as const,
    color: "yellow",
  },
  {
    id: "parallel",
    name: "并发执行",
    nameEn: "Parallel Gateway",
    description: "同时触发多个下游节点",
    descriptionEn: "Trigger multiple downstream nodes simultaneously",
    icon: GitMerge,
    nodeType: "parallel" as const,
    color: "purple",
  },
  // Phase 1: Dify-inspired core nodes
  {
    id: "llm",
    name: "LLM 调用",
    nameEn: "LLM Call",
    description: "独立的大模型调用，支持多模型切换和结构化输出",
    descriptionEn: "Independent LLM call with model selection and structured output",
    icon: Brain,
    nodeType: "llm" as const,
    color: "blue",
  },
  {
    id: "http-request",
    name: "HTTP 请求",
    nameEn: "HTTP Request",
    description: "调用外部 REST/GraphQL API",
    descriptionEn: "Call external REST/GraphQL APIs",
    icon: Globe,
    nodeType: "httpRequest" as const,
    color: "teal",
  },
  {
    id: "code",
    name: "代码执行",
    nameEn: "Code Executor",
    description: "执行 JavaScript 代码片段进行数据处理",
    descriptionEn: "Execute JavaScript code snippets for data processing",
    icon: Code2,
    nodeType: "code" as const,
    color: "amber",
  },
  {
    id: "parameter-extractor",
    name: "参数提取器",
    nameEn: "Parameter Extractor",
    description: "使用 LLM 从文本中提取结构化参数",
    descriptionEn: "Extract structured parameters from text using LLM",
    icon: ScanSearch,
    nodeType: "parameterExtractor" as const,
    color: "violet",
  },
  // Phase 2: Dify-inspired auxiliary nodes
  {
    id: "template",
    name: "模板转换",
    nameEn: "Template",
    description: "使用 Jinja2/Handlebars 语法格式化输出",
    descriptionEn: "Format output using Jinja2/Handlebars syntax",
    icon: FileCode2,
    nodeType: "template" as const,
    color: "emerald",
  },
  {
    id: "variable-aggregator",
    name: "变量聚合器",
    nameEn: "Variable Aggregator",
    description: "合并多个分支的变量为单一输出",
    descriptionEn: "Merge variables from multiple branches into single output",
    icon: Layers,
    nodeType: "variableAggregator" as const,
    color: "cyan",
  },
  {
    id: "variable-assigner",
    name: "变量赋值",
    nameEn: "Variable Assigner",
    description: "设置或修改工作流变量",
    descriptionEn: "Set or modify workflow variables",
    icon: Variable,
    nodeType: "variableAssigner" as const,
    color: "pink",
  },
  {
    id: "doc-extractor",
    name: "文档提取器",
    nameEn: "Document Extractor",
    description: "从文件中提取文本内容 (PDF/Word/Excel)",
    descriptionEn: "Extract text content from files (PDF/Word/Excel)",
    icon: FileOutput,
    nodeType: "docExtractor" as const,
    color: "orange",
  },
  {
    id: "iterator",
    name: "迭代器",
    nameEn: "Iterator",
    description: "对数组逐项执行子工作流",
    descriptionEn: "Execute sub-workflow for each array item",
    icon: Repeat,
    nodeType: "iterator" as const,
    color: "indigo",
  },
  {
    id: "loop",
    name: "循环执行",
    nameEn: "Loop",
    description: "基于条件重复执行工作流",
    descriptionEn: "Repeat workflow execution based on condition",
    icon: RefreshCcw,
    nodeType: "loop" as const,
    color: "rose",
  },
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

// Knowledge base item for drag
export interface KnowledgeBaseItem {
  type: 'knowledge_base';
  id: string;
  name: string;
  description?: string;
  documents_count: number;
  chunks_count: number;
  nodes_count?: number;
  edges_count?: number;
  index_status: string;
  graph_enabled: boolean;
}

// Logic node item for drag
export interface LogicNodeItem {
  type: 'logic_node';
  nodeType: 'intentRouter' | 'condition' | 'parallel' 
    | 'llm' | 'httpRequest' | 'code' | 'parameterExtractor'
    | 'template' | 'variableAggregator' | 'variableAssigner' 
    | 'docExtractor' | 'iterator' | 'loop';
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
}

interface SkillMarketplaceProps {
  onDragStart: (skill: Skill) => void;
  onKnowledgeDragStart?: (kb: KnowledgeBaseItem) => void;
  onLogicNodeDragStart?: (node: LogicNodeItem) => void;
  onMCPActionDragStart?: (action: MCPActionDragItem) => void;
  onInterventionDragStart?: (intervention: InterventionDragItem) => void;
  addedSkillIds: string[];
  addedKnowledgeBaseIds?: string[];
}

export function SkillMarketplace({ 
  onDragStart, 
  onKnowledgeDragStart,
  onLogicNodeDragStart,
  onMCPActionDragStart,
  onInterventionDragStart,
  addedSkillIds,
  addedKnowledgeBaseIds = [],
}: SkillMarketplaceProps) {
  const { language, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [originFilter, setOriginFilter] = useState<'all' | 'native' | 'mcp' | 'actions' | 'knowledge' | 'logic'>('all');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(true);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const { data: dbSkills, isLoading: isLoadingSkills } = usePublishedSkills();
  const { data: knowledgeBases, isLoading: isLoadingKnowledge } = useKnowledgeBases();

  const skills = (dbSkills || []).map(toSkill);
  const isLoading = isLoadingSkills || (originFilter === 'knowledge' && isLoadingKnowledge);

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
    if (originFilter === 'knowledge') {
      return [
        { id: "all", label: "All", labelZh: "全部" },
        { id: "ready", label: "Ready", labelZh: "已就绪", icon: Layers },
        { id: "graph", label: "GraphRAG", labelZh: "知识图谱", icon: Network },
      ];
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

  // Filter knowledge bases
  const filteredKnowledgeBases = (knowledgeBases || []).filter((kb) => {
    const matchesSearch =
      kb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (kb.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeCategory === 'ready') {
      return matchesSearch && kb.index_status === 'ready';
    }
    if (activeCategory === 'graph') {
      return matchesSearch && kb.graph_enabled;
    }
    return matchesSearch;
  });

  const handleDragStart = (e: DragEvent<HTMLDivElement>, skill: Skill) => {
    e.dataTransfer.setData("application/json", JSON.stringify(skill));
    e.dataTransfer.effectAllowed = "copy";
    onDragStart(skill);
  };

  const handleKnowledgeDragStart = (e: DragEvent<HTMLDivElement>, kb: KnowledgeBaseItem) => {
    e.dataTransfer.setData("application/json", JSON.stringify(kb));
    e.dataTransfer.effectAllowed = "copy";
    onKnowledgeDragStart?.(kb);
  };

  const handleLogicNodeDragStart = (e: DragEvent<HTMLDivElement>, node: typeof logicNodes[0]) => {
    const logicItem: LogicNodeItem = {
      type: 'logic_node',
      nodeType: node.nodeType,
      name: node.name,
      nameEn: node.nameEn,
      description: node.description,
      descriptionEn: node.descriptionEn,
    };
    e.dataTransfer.setData("application/json", JSON.stringify(logicItem));
    e.dataTransfer.effectAllowed = "copy";
    onLogicNodeDragStart?.(logicItem);
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
      <div className="flex gap-1 p-2 border-b border-border flex-wrap">
        {originFilters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setOriginFilter(filter.id as 'all' | 'native' | 'mcp' | 'actions' | 'knowledge' | 'logic')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-md transition-colors min-w-[60px]",
              originFilter === filter.id
                ? filter.id === 'knowledge' 
                  ? "bg-purple-500 text-white"
                  : filter.id === 'actions'
                  ? "bg-orange-500 text-white"
                  : "bg-primary text-primary-foreground"
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

      {/* Skills / Knowledge List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : originFilter === 'actions' ? (
          // MCP Actions Panel
          <MCPActionsPanel
            onActionDragStart={onMCPActionDragStart}
            onInterventionDragStart={onInterventionDragStart}
            language={language}
          />
        ) : originFilter === 'logic' ? (
          // Logic Nodes List
          <div className="space-y-2">
            {logicNodes.map((node) => {
              const Icon = node.icon;
              const colorClasses = {
                cyan: "border-cyan-500/30 hover:border-cyan-500/50 bg-cyan-500/5",
                yellow: "border-yellow-500/30 hover:border-yellow-500/50 bg-yellow-500/5",
                purple: "border-purple-500/30 hover:border-purple-500/50 bg-purple-500/5",
              };
              const iconColors = {
                cyan: "text-cyan-500 bg-cyan-500/20",
                yellow: "text-yellow-500 bg-yellow-500/20",
                purple: "text-purple-500 bg-purple-500/20",
              };
              return (
                <div
                  key={node.id}
                  draggable
                  onDragStart={(e) => handleLogicNodeDragStart(e, node)}
                  className={cn(
                    "p-3 rounded-lg border transition-all group cursor-grab active:cursor-grabbing",
                    colorClasses[node.color as keyof typeof colorClasses]
                  )}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn("w-6 h-6 rounded flex items-center justify-center", iconColors[node.color as keyof typeof iconColors])}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-medium text-sm">{language === 'zh' ? node.name : node.nameEn}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {language === 'zh' ? node.description : node.descriptionEn}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : originFilter === 'knowledge' ? (
          // Knowledge Base List
          <>
            {!knowledgeBases || knowledgeBases.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title={language === 'zh' ? "还没有知识库" : "No Knowledge Bases"}
                description={language === 'zh' ? "前往 Foundry 创建你的第一个知识库" : "Go to Foundry to create your first knowledge base"}
                action={{
                  label: language === 'zh' ? "前往创建" : "Create Now",
                  onClick: () => window.location.href = "/foundry",
                }}
              />
            ) : filteredKnowledgeBases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm animate-fade-in">
                {t("skill.market.no_match")}
              </div>
            ) : (
              filteredKnowledgeBases.map((kb) => {
                const isAdded = addedKnowledgeBaseIds.includes(kb.id);
                const kbItem: KnowledgeBaseItem = {
                  type: 'knowledge_base',
                  id: kb.id,
                  name: kb.name,
                  description: kb.description || undefined,
                  documents_count: kb.documents_count || 0,
                  chunks_count: kb.chunks_count || 0,
                  nodes_count: kb.nodes_count || 0,
                  edges_count: kb.edges_count || 0,
                  index_status: kb.index_status || 'pending',
                  graph_enabled: kb.graph_enabled || false,
                };

                return (
                  <div
                    key={kb.id}
                    draggable={!isAdded && kb.index_status === 'ready'}
                    onDragStart={(e) => handleKnowledgeDragStart(e, kbItem)}
                    className={cn(
                      "p-3 rounded-lg border transition-all group",
                      isAdded
                        ? "border-purple-500/50 bg-purple-500/5 opacity-60 cursor-not-allowed"
                        : kb.index_status !== 'ready'
                        ? "border-border bg-card opacity-60 cursor-not-allowed"
                        : "border-purple-500/30 bg-card hover:border-purple-500/50 hover:shadow-sm cursor-grab active:cursor-grabbing"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!isAdded && kb.index_status === 'ready' && (
                        <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-center gap-2 mb-1">
                          <BookOpen className="h-4 w-4 flex-shrink-0 text-purple-500" />
                          <span className="font-medium text-sm truncate flex-1">{kb.name}</span>
                          {isAdded && (
                            <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                              {t("skill.market.added")}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Status badges */}
                        <div className="flex items-center gap-1 mb-1.5">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              kb.index_status === 'ready' 
                                ? "bg-green-500/10 text-green-600 border-green-500/30"
                                : kb.index_status === 'indexing'
                                ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                                : "bg-gray-500/10 text-gray-600 border-gray-500/30"
                            )}
                          >
                            {kb.index_status === 'ready' ? (language === 'zh' ? '已索引' : 'Ready') :
                             kb.index_status === 'indexing' ? (language === 'zh' ? '索引中' : 'Indexing') :
                             (language === 'zh' ? '待处理' : 'Pending')}
                          </Badge>
                          {kb.graph_enabled && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-600 border-purple-500/30">
                              <Network className="h-2.5 w-2.5 mr-0.5" />
                              GraphRAG
                            </Badge>
                          )}
                        </div>
                        
                        {/* Description */}
                        {kb.description && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {kb.description}
                          </p>
                        )}
                        
                        {/* Stats */}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span>{kb.documents_count || 0} {language === 'zh' ? '文档' : 'docs'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            <span>{kb.chunks_count || 0} {language === 'zh' ? '切片' : 'chunks'}</span>
                          </div>
                          {kb.graph_enabled && (kb.nodes_count || 0) > 0 && (
                            <div className="flex items-center gap-1">
                              <Network className="h-3 w-3" />
                              <span>{kb.nodes_count || 0}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
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
