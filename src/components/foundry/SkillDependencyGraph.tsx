import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  BackgroundVariant,
  MarkerType,
  Handle,
  Position,
  NodeProps,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Network,
  Package,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Zap,
  Shield,
  Database,
  Globe,
  Code,
  Search,
  Filter,
  Info,
  RefreshCw,
  X,
  Layers,
} from "lucide-react";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { Badge } from "../ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip.tsx";
import { cn } from "../../lib/utils.ts";

// Skill dependency types
export interface SkillDependency {
  id: string;
  name: string;
  version: string;
  category: string;
  status: "installed" | "available" | "outdated" | "conflict";
  dependencies: string[];
  dependents: string[];
  description?: string;
  author?: string;
  riskLevel?: "low" | "medium" | "high";
}

// Category icons and colors
const categoryConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  core: { icon: <Zap className="h-4 w-4" />, color: "#3b82f6", bgColor: "#3b82f620" },
  security: { icon: <Shield className="h-4 w-4" />, color: "#22c55e", bgColor: "#22c55e20" },
  data: { icon: <Database className="h-4 w-4" />, color: "#f59e0b", bgColor: "#f59e0b20" },
  integration: { icon: <Globe className="h-4 w-4" />, color: "#a855f7", bgColor: "#a855f720" },
  utility: { icon: <Code className="h-4 w-4" />, color: "#6366f1", bgColor: "#6366f120" },
};

const statusConfig = {
  installed: { color: "#22c55e", label: "已安装" },
  available: { color: "#6b7280", label: "可用" },
  outdated: { color: "#f59e0b", label: "可更新" },
  conflict: { color: "#ef4444", label: "冲突" },
};

// Custom skill node data type
interface SkillNodeData extends Record<string, unknown> {
  name: string;
  version: string;
  category: string;
  status: string;
  dependents?: string[];
}

// Custom skill node component
function SkillNode({ data, selected }: NodeProps) {
  const nodeData = data as SkillNodeData;
  const category = categoryConfig[nodeData.category] || categoryConfig.utility;
  const status = statusConfig[nodeData.status as keyof typeof statusConfig];

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-xl border-2 bg-card shadow-lg transition-all",
        "min-w-[140px] max-w-[180px]",
        selected ? "border-primary shadow-primary/20" : "border-border hover:border-primary/50"
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3" />
      
      <div className="flex items-start gap-2">
        <div
          className="p-2 rounded-lg flex-shrink-0"
          style={{ backgroundColor: category.bgColor, color: category.color }}
        >
          {category.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{nodeData.name}</div>
          <div className="text-[10px] text-muted-foreground">{nodeData.version}</div>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
        <div className="flex items-center gap-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          <span className="text-[10px] text-muted-foreground">{status.label}</span>
        </div>
        {nodeData.dependents && nodeData.dependents.length > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5">
            {nodeData.dependents.length} 依赖
          </Badge>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3" />
    </div>
  );
}

const nodeTypes = {
  skillNode: SkillNode,
};

// Mock skills data
const mockSkills: SkillDependency[] = [
  {
    id: "web-search",
    name: "网页搜索",
    version: "2.1.0",
    category: "integration",
    status: "installed",
    dependencies: [],
    dependents: ["rag-retrieval", "news-monitor"],
    description: "支持多搜索引擎的网页搜索技能",
    author: "官方",
    riskLevel: "low",
  },
  {
    id: "rag-retrieval",
    name: "RAG检索",
    version: "1.5.2",
    category: "data",
    status: "installed",
    dependencies: ["web-search", "vector-store"],
    dependents: ["qa-engine"],
    description: "基于向量的知识检索技能",
    author: "官方",
    riskLevel: "low",
  },
  {
    id: "vector-store",
    name: "向量存储",
    version: "1.2.0",
    category: "data",
    status: "installed",
    dependencies: [],
    dependents: ["rag-retrieval", "semantic-search"],
    description: "高性能向量数据库连接器",
    author: "官方",
    riskLevel: "low",
  },
  {
    id: "qa-engine",
    name: "问答引擎",
    version: "3.0.1",
    category: "core",
    status: "installed",
    dependencies: ["rag-retrieval", "llm-router"],
    dependents: [],
    description: "多轮对话问答处理引擎",
    author: "官方",
    riskLevel: "medium",
  },
  {
    id: "llm-router",
    name: "模型路由",
    version: "2.0.0",
    category: "core",
    status: "outdated",
    dependencies: [],
    dependents: ["qa-engine", "text-gen"],
    description: "智能模型选择与负载均衡",
    author: "官方",
    riskLevel: "medium",
  },
  {
    id: "text-gen",
    name: "文本生成",
    version: "1.8.0",
    category: "core",
    status: "installed",
    dependencies: ["llm-router"],
    dependents: [],
    description: "高质量文本内容生成",
    author: "官方",
    riskLevel: "low",
  },
  {
    id: "news-monitor",
    name: "新闻监控",
    version: "1.0.0",
    category: "integration",
    status: "available",
    dependencies: ["web-search"],
    dependents: [],
    description: "实时新闻监控与推送",
    author: "社区",
    riskLevel: "low",
  },
  {
    id: "semantic-search",
    name: "语义搜索",
    version: "1.3.0",
    category: "data",
    status: "conflict",
    dependencies: ["vector-store"],
    dependents: [],
    description: "深度语义理解搜索",
    author: "社区",
    riskLevel: "medium",
  },
  {
    id: "auth-guard",
    name: "权限守卫",
    version: "2.2.1",
    category: "security",
    status: "installed",
    dependencies: [],
    dependents: [],
    description: "API调用权限控制",
    author: "官方",
    riskLevel: "high",
  },
];

interface SkillDependencyGraphProps {
  skills?: SkillDependency[];
  onSkillSelect?: (skill: SkillDependency) => void;
}

function SkillDependencyGraphContent({ 
  skills = mockSkills, 
  onSkillSelect 
}: SkillDependencyGraphProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<SkillDependency | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Build nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const filteredSkills = skills.filter((skill) => {
      if (searchQuery && !skill.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (categoryFilter && skill.category !== categoryFilter) {
        return false;
      }
      if (statusFilter && skill.status !== statusFilter) {
        return false;
      }
      return true;
    });

    // Calculate node positions using layered layout
    const layers: Map<string, number> = new Map();
    const visited = new Set<string>();
    
    function calculateLayer(skillId: string, depth: number) {
      if (visited.has(skillId)) return;
      visited.add(skillId);
      
      const currentLayer = layers.get(skillId) || 0;
      layers.set(skillId, Math.max(currentLayer, depth));
      
      const skill = skills.find((s) => s.id === skillId);
      skill?.dependents.forEach((depId) => {
        calculateLayer(depId, depth + 1);
      });
    }
    
    // Start from skills with no dependencies
    skills
      .filter((s) => s.dependencies.length === 0)
      .forEach((s) => calculateLayer(s.id, 0));

    // Calculate positions
    const layerCounts: Map<number, number> = new Map();
    
    const nodes: Node[] = filteredSkills.map((skill) => {
      const layer = layers.get(skill.id) || 0;
      const count = layerCounts.get(layer) || 0;
      layerCounts.set(layer, count + 1);
      
      return {
        id: skill.id,
        type: "skillNode",
        position: { 
          x: 200 + count * 220, 
          y: 80 + layer * 150 
        },
        data: {
          name: skill.name,
          version: skill.version,
          category: skill.category,
          status: skill.status,
          dependents: skill.dependents,
        },
      };
    });

    // Create edges
    const skillIds = new Set(filteredSkills.map((s) => s.id));
    const edges: Edge[] = [];
    
    filteredSkills.forEach((skill) => {
      skill.dependencies.forEach((depId) => {
        if (skillIds.has(depId)) {
          edges.push({
            id: `${depId}-${skill.id}`,
            source: depId,
            target: skill.id,
            type: "smoothstep",
            animated: skill.status === "installed",
            style: { 
              stroke: skill.status === "conflict" ? "#ef4444" : "#64748b",
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: skill.status === "conflict" ? "#ef4444" : "#64748b",
            },
          });
        }
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [skills, searchQuery, categoryFilter, statusFilter]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update when filters change
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const skill = skills.find((s) => s.id === node.id);
      setSelectedSkill(skill || null);
      onSkillSelect?.(skill!);
    },
    [skills, onSkillSelect]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setCategoryFilter(null);
    setStatusFilter(null);
    setSelectedSkill(null);
  }, []);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: skills.length,
      installed: skills.filter((s) => s.status === "installed").length,
      outdated: skills.filter((s) => s.status === "outdated").length,
      conflicts: skills.filter((s) => s.status === "conflict").length,
    };
  }, [skills]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">技能依赖图</h3>
          </div>
          <div className="flex items-center gap-2">
            {(categoryFilter || statusFilter || searchQuery) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 h-7">
                <X className="h-3 w-3" />
                清除筛选
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索技能..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8"
            />
          </div>
          
          <div className="flex items-center gap-1">
            {Object.entries(categoryConfig).map(([key, config]) => (
              <TooltipProvider key={key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={categoryFilter === key ? "secondary" : "ghost"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCategoryFilter(categoryFilter === key ? null : key)}
                    >
                      <div style={{ color: config.color }}>{config.icon}</div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{key}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs">
          <Badge variant="secondary">共 {stats.total} 个技能</Badge>
          <span className="text-status-executing">✓ {stats.installed} 已安装</span>
          {stats.outdated > 0 && (
            <span className="text-status-planning">⚠ {stats.outdated} 可更新</span>
          )}
          {stats.conflicts > 0 && (
            <span className="text-destructive">✗ {stats.conflicts} 冲突</span>
          )}
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 flex">
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                const category = categoryConfig[(node.data as any)?.category] || categoryConfig.utility;
                return category.color;
              }}
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          </ReactFlow>
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedSkill && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-border bg-card"
            >
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="p-2 rounded-lg"
                        style={{
                          backgroundColor: categoryConfig[selectedSkill.category]?.bgColor,
                          color: categoryConfig[selectedSkill.category]?.color,
                        }}
                      >
                        {categoryConfig[selectedSkill.category]?.icon}
                      </div>
                      <div>
                        <h4 className="font-medium">{selectedSkill.name}</h4>
                        <p className="text-xs text-muted-foreground">v{selectedSkill.version}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setSelectedSkill(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      style={{
                        backgroundColor: statusConfig[selectedSkill.status].color + "20",
                        color: statusConfig[selectedSkill.status].color,
                      }}
                    >
                      {statusConfig[selectedSkill.status].label}
                    </Badge>
                    {selectedSkill.riskLevel && (
                      <Badge variant="outline" className="text-xs">
                        风险: {selectedSkill.riskLevel === "low" ? "低" : selectedSkill.riskLevel === "medium" ? "中" : "高"}
                      </Badge>
                    )}
                  </div>

                  {selectedSkill.description && (
                    <p className="text-sm text-muted-foreground">
                      {selectedSkill.description}
                    </p>
                  )}

                  {/* Dependencies */}
                  {selectedSkill.dependencies.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-muted-foreground mb-2">依赖项</h5>
                      <div className="space-y-1">
                        {selectedSkill.dependencies.map((depId) => {
                          const dep = skills.find((s) => s.id === depId);
                          return (
                            <div
                              key={depId}
                              className="flex items-center gap-2 p-2 rounded bg-muted/50 cursor-pointer hover:bg-muted"
                              onClick={() => {
                                if (dep) setSelectedSkill(dep);
                              }}
                            >
                              <Package className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{dep?.name || depId}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Dependents */}
                  {selectedSkill.dependents.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-muted-foreground mb-2">被依赖</h5>
                      <div className="space-y-1">
                        {selectedSkill.dependents.map((depId) => {
                          const dep = skills.find((s) => s.id === depId);
                          return (
                            <div
                              key={depId}
                              className="flex items-center gap-2 p-2 rounded bg-muted/50 cursor-pointer hover:bg-muted"
                              onClick={() => {
                                if (dep) setSelectedSkill(dep);
                              }}
                            >
                              <Layers className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{dep?.name || depId}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedSkill.author && (
                    <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                      作者: {selectedSkill.author}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function SkillDependencyGraph(props: SkillDependencyGraphProps) {
  return (
    <ReactFlowProvider>
      <SkillDependencyGraphContent {...props} />
    </ReactFlowProvider>
  );
}
