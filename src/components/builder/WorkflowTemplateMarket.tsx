import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store,
  Search,
  Download,
  Star,
  Clock,
  Users,
  Filter,
  ChevronRight,
  Sparkles,
  Workflow,
  Zap,
  Shield,
  Brain,
  Database,
  Globe,
  CheckCircle2,
  Loader2,
  X,
  Tag,
  Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { Badge } from "../ui/badge.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card.tsx";
import { Skeleton } from "../ui/skeleton.tsx";
import { cn } from "../../lib/utils.ts";
import { toast } from "sonner";

// Workflow template types
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  previewImage?: string;
  author: string;
  downloads: number;
  rating: number;
  tags: string[];
  nodeCount: number;
  estimatedTime: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  features: string[];
  createdAt: Date;
  graphData: {
    nodes: any[];
    edges: any[];
  };
}

// Mock workflow templates
const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "rag-qa-basic",
    name: "RAG问答基础流",
    description: "基于知识库的问答系统，支持文档检索、上下文增强和智能回答生成",
    category: "知识检索",
    icon: <Database className="h-5 w-5" />,
    author: "官方",
    downloads: 12580,
    rating: 4.8,
    tags: ["RAG", "问答", "知识库"],
    nodeCount: 5,
    estimatedTime: "5分钟",
    difficulty: "beginner",
    features: ["向量检索", "上下文注入", "引用追溯"],
    createdAt: new Date("2024-01-15"),
    graphData: { nodes: [], edges: [] },
  },
  {
    id: "multi-agent-collab",
    name: "多智能体协作流",
    description: "多个专业智能体协同工作，支持任务分解、并行处理和结果聚合",
    category: "多智能体",
    icon: <Users className="h-5 w-5" />,
    author: "社区精选",
    downloads: 8420,
    rating: 4.6,
    tags: ["多智能体", "协作", "任务分解"],
    nodeCount: 8,
    estimatedTime: "15分钟",
    difficulty: "advanced",
    features: ["任务路由", "并行执行", "结果融合"],
    createdAt: new Date("2024-02-20"),
    graphData: { nodes: [], edges: [] },
  },
  {
    id: "code-review-flow",
    name: "代码审查工作流",
    description: "自动化代码审查流程，包含静态分析、安全检查和优化建议",
    category: "开发工具",
    icon: <Zap className="h-5 w-5" />,
    author: "DevOps团队",
    downloads: 5630,
    rating: 4.7,
    tags: ["代码审查", "安全", "自动化"],
    nodeCount: 6,
    estimatedTime: "10分钟",
    difficulty: "intermediate",
    features: ["语法检查", "安全扫描", "性能分析"],
    createdAt: new Date("2024-03-10"),
    graphData: { nodes: [], edges: [] },
  },
  {
    id: "customer-service-bot",
    name: "智能客服工作流",
    description: "完整的客服对话流程，支持意图识别、情绪分析和人工转接",
    category: "客服场景",
    icon: <Brain className="h-5 w-5" />,
    author: "官方",
    downloads: 15200,
    rating: 4.9,
    tags: ["客服", "意图识别", "情绪分析"],
    nodeCount: 7,
    estimatedTime: "8分钟",
    difficulty: "intermediate",
    features: ["多轮对话", "情绪监测", "工单创建"],
    createdAt: new Date("2024-01-25"),
    graphData: { nodes: [], edges: [] },
  },
  {
    id: "data-etl-pipeline",
    name: "数据ETL管道",
    description: "数据提取、转换、加载的自动化流程，支持多数据源和格式转换",
    category: "数据处理",
    icon: <Database className="h-5 w-5" />,
    author: "数据工程师",
    downloads: 4320,
    rating: 4.5,
    tags: ["ETL", "数据转换", "自动化"],
    nodeCount: 9,
    estimatedTime: "20分钟",
    difficulty: "advanced",
    features: ["多源连接", "格式转换", "增量同步"],
    createdAt: new Date("2024-02-15"),
    graphData: { nodes: [], edges: [] },
  },
  {
    id: "content-moderation",
    name: "内容审核工作流",
    description: "自动化内容审核，包含文本过滤、图像识别和风险评估",
    category: "安全合规",
    icon: <Shield className="h-5 w-5" />,
    author: "安全团队",
    downloads: 6780,
    rating: 4.7,
    tags: ["审核", "安全", "合规"],
    nodeCount: 6,
    estimatedTime: "12分钟",
    difficulty: "intermediate",
    features: ["敏感词检测", "图像审核", "风险分级"],
    createdAt: new Date("2024-03-01"),
    graphData: { nodes: [], edges: [] },
  },
  {
    id: "web-scraper-flow",
    name: "网页抓取工作流",
    description: "结构化数据抓取流程，支持动态页面和反爬虫处理",
    category: "数据采集",
    icon: <Globe className="h-5 w-5" />,
    author: "社区贡献",
    downloads: 7890,
    rating: 4.4,
    tags: ["爬虫", "数据采集", "自动化"],
    nodeCount: 5,
    estimatedTime: "10分钟",
    difficulty: "intermediate",
    features: ["动态渲染", "数据解析", "定时任务"],
    createdAt: new Date("2024-02-28"),
    graphData: { nodes: [], edges: [] },
  },
  {
    id: "report-generator",
    name: "智能报告生成",
    description: "自动化报告生成流程，支持数据分析、图表生成和文档输出",
    category: "办公自动化",
    icon: <Sparkles className="h-5 w-5" />,
    author: "官方",
    downloads: 9450,
    rating: 4.8,
    tags: ["报告", "自动化", "数据分析"],
    nodeCount: 7,
    estimatedTime: "15分钟",
    difficulty: "intermediate",
    features: ["数据聚合", "图表生成", "格式输出"],
    createdAt: new Date("2024-01-30"),
    graphData: { nodes: [], edges: [] },
  },
];

const categories = [
  { id: "all", label: "全部", icon: <Store className="h-4 w-4" /> },
  { id: "知识检索", label: "知识检索", icon: <Database className="h-4 w-4" /> },
  { id: "多智能体", label: "多智能体", icon: <Users className="h-4 w-4" /> },
  { id: "客服场景", label: "客服场景", icon: <Brain className="h-4 w-4" /> },
  { id: "开发工具", label: "开发工具", icon: <Zap className="h-4 w-4" /> },
  { id: "数据处理", label: "数据处理", icon: <Database className="h-4 w-4" /> },
  { id: "安全合规", label: "安全合规", icon: <Shield className="h-4 w-4" /> },
];

const difficultyColors = {
  beginner: "bg-status-executing/10 text-status-executing",
  intermediate: "bg-status-planning/10 text-status-planning",
  advanced: "bg-destructive/10 text-destructive",
};

const difficultyLabels = {
  beginner: "入门",
  intermediate: "进阶",
  advanced: "高级",
};

interface WorkflowTemplateMarketProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTemplate: (template: WorkflowTemplate) => void;
}

export function WorkflowTemplateMarket({
  isOpen,
  onClose,
  onImportTemplate,
}: WorkflowTemplateMarketProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"downloads" | "rating" | "newest">("downloads");
  const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplate | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    const filtered = workflowTemplates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );
      const matchesCategory =
        selectedCategory === "all" || template.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort
    if (sortBy === "downloads") {
      filtered.sort((a, b) => b.downloads - a.downloads);
    } else if (sortBy === "rating") {
      filtered.sort((a, b) => b.rating - a.rating);
    } else {
      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return filtered;
  }, [searchQuery, selectedCategory, sortBy]);

  const handleImport = async (template: WorkflowTemplate) => {
    setIsImporting(true);
    
    // Simulate import process
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    onImportTemplate(template);
    setIsImporting(false);
    setPreviewTemplate(null);
    onClose();
    
    toast.success(`已导入模板: ${template.name}`, {
      description: `包含 ${template.nodeCount} 个节点，预计配置时间 ${template.estimatedTime}`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Store className="h-5 w-5 text-primary" />
            工作流模板市场
          </DialogTitle>
          <DialogDescription>
            选择预构建的工作流模板，一键导入到画布开始编辑
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[calc(90vh-140px)]">
          {/* Sidebar */}
          <div className="w-52 border-r border-border p-3 flex flex-col gap-1">
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "secondary" : "ghost"}
                className={cn(
                  "justify-start gap-2 h-9",
                  selectedCategory === cat.id && "bg-secondary"
                )}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.icon}
                <span className="text-sm">{cat.label}</span>
              </Button>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Search and Sort */}
            <div className="p-4 border-b border-border flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索模板名称、描述或标签..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-1.5">
                {[
                  { value: "downloads", label: "最热门" },
                  { value: "rating", label: "最高分" },
                  { value: "newest", label: "最新" },
                ].map((option) => (
                  <Badge
                    key={option.value}
                    variant={sortBy === option.value ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSortBy(option.value as typeof sortBy)}
                  >
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Template Grid */}
            <ScrollArea className="flex-1 p-4">
              <div className="grid grid-cols-2 gap-4">
                {filteredTemplates.map((template, index) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-lg hover:border-primary/50",
                        "group relative overflow-hidden"
                      )}
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div
                            className={cn(
                              "p-2.5 rounded-lg",
                              "bg-primary/10 text-primary"
                            )}
                          >
                            {template.icon}
                          </div>
                          <Badge
                            className={cn(
                              "text-[10px]",
                              difficultyColors[template.difficulty]
                            )}
                          >
                            {difficultyLabels[template.difficulty]}
                          </Badge>
                        </div>
                        <CardTitle className="text-base mt-2 group-hover:text-primary transition-colors">
                          {template.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 text-xs">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <div className="flex flex-wrap gap-1 mb-3">
                          {template.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-[10px] px-1.5"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Download className="h-3 w-3" />
                              {template.downloads.toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-primary text-primary" />
                              {template.rating}
                            </span>
                          </div>
                          <span className="flex items-center gap-1">
                            <Workflow className="h-3 w-3" />
                            {template.nodeCount} 节点
                          </span>
                        </div>
                      </CardContent>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                        <Button size="sm" className="gap-1.5">
                          <Eye className="h-3.5 w-3.5" />
                          预览详情
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {filteredTemplates.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Workflow className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>没有找到匹配的模板</p>
                  <p className="text-sm mt-1">尝试调整搜索条件或选择其他分类</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Template Preview Dialog */}
        <AnimatePresence>
          {previewTemplate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-8"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              >
                <div className="p-6 border-b border-border">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-primary/10 text-primary">
                        {previewTemplate.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">
                          {previewTemplate.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {previewTemplate.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>作者: {previewTemplate.author}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            {previewTemplate.downloads.toLocaleString()} 次下载
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPreviewTemplate(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <ScrollArea className="max-h-[50vh] p-6">
                  <div className="space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: "节点数", value: previewTemplate.nodeCount, icon: <Workflow className="h-4 w-4" /> },
                        { label: "配置时间", value: previewTemplate.estimatedTime, icon: <Clock className="h-4 w-4" /> },
                        { label: "评分", value: previewTemplate.rating, icon: <Star className="h-4 w-4" /> },
                        { label: "难度", value: difficultyLabels[previewTemplate.difficulty], icon: <Zap className="h-4 w-4" /> },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="p-3 rounded-lg border border-border bg-muted/30 text-center"
                        >
                          <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                            {stat.icon}
                            <span className="text-[10px]">{stat.label}</span>
                          </div>
                          <div className="font-semibold">{stat.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Features */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">功能特性</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {previewTemplate.features.map((feature) => (
                          <div
                            key={feature}
                            className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-status-executing" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">标签</h4>
                      <div className="flex flex-wrap gap-2">
                        {previewTemplate.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="p-4 border-t border-border flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPreviewTemplate(null)}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={() => handleImport(previewTemplate)}
                    disabled={isImporting}
                    className="gap-2"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        导入中...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        导入模板
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
