import { useState } from "react";
import {
  Search,
  Download,
  Star,
  TrendingUp,
  Clock,
  CheckCircle2,
  Sparkles,
  FileText,
  Database,
  Globe,
  MessageSquare,
  Calculator,
  Image,
  Mail,
  Calendar,
  Bot,
  Zap,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface SkillStoreItem {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  rating: number;
  downloads: number;
  isInstalled: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  author: string;
  tags: string[];
}

const categories = [
  { id: "all", label: "全部", icon: <Sparkles className="h-4 w-4" /> },
  { id: "nlp", label: "文本处理", icon: <FileText className="h-4 w-4" /> },
  { id: "data", label: "数据分析", icon: <Database className="h-4 w-4" /> },
  { id: "web", label: "网络搜索", icon: <Globe className="h-4 w-4" /> },
  { id: "chat", label: "对话增强", icon: <MessageSquare className="h-4 w-4" /> },
  { id: "productivity", label: "效率工具", icon: <Zap className="h-4 w-4" /> },
];

// 模拟能力商店数据
const storeItems: SkillStoreItem[] = [
  {
    id: "text-summary",
    name: "智能摘要",
    description: "一键提取长文本核心内容，支持多种摘要风格",
    category: "nlp",
    icon: <FileText className="h-6 w-6" />,
    rating: 4.8,
    downloads: 12500,
    isInstalled: false,
    isFeatured: true,
    author: "官方",
    tags: ["摘要", "提取", "AI"],
  },
  {
    id: "web-search",
    name: "网页搜索",
    description: "实时检索互联网信息，返回结构化搜索结果",
    category: "web",
    icon: <Globe className="h-6 w-6" />,
    rating: 4.6,
    downloads: 8900,
    isInstalled: true,
    author: "官方",
    tags: ["搜索", "检索", "实时"],
  },
  {
    id: "data-analysis",
    name: "数据分析",
    description: "分析表格数据，生成可视化图表和洞察报告",
    category: "data",
    icon: <Database className="h-6 w-6" />,
    rating: 4.5,
    downloads: 6700,
    isInstalled: false,
    isNew: true,
    author: "官方",
    tags: ["分析", "图表", "报告"],
  },
  {
    id: "smart-reply",
    name: "智能回复",
    description: "根据上下文自动生成专业回复建议",
    category: "chat",
    icon: <MessageSquare className="h-6 w-6" />,
    rating: 4.7,
    downloads: 15200,
    isInstalled: false,
    isFeatured: true,
    author: "社区",
    tags: ["回复", "建议", "沟通"],
  },
  {
    id: "email-composer",
    name: "邮件撰写",
    description: "快速生成专业邮件，支持多种场景模板",
    category: "productivity",
    icon: <Mail className="h-6 w-6" />,
    rating: 4.4,
    downloads: 5400,
    isInstalled: false,
    author: "社区",
    tags: ["邮件", "模板", "办公"],
  },
  {
    id: "schedule-manager",
    name: "日程管理",
    description: "智能安排日程，支持冲突检测和优化建议",
    category: "productivity",
    icon: <Calendar className="h-6 w-6" />,
    rating: 4.3,
    downloads: 3200,
    isInstalled: false,
    isNew: true,
    author: "社区",
    tags: ["日程", "提醒", "规划"],
  },
  {
    id: "image-describe",
    name: "图片描述",
    description: "自动识别图片内容并生成详细描述",
    category: "nlp",
    icon: <Image className="h-6 w-6" />,
    rating: 4.6,
    downloads: 7800,
    isInstalled: false,
    author: "官方",
    tags: ["图片", "识别", "描述"],
  },
  {
    id: "math-solver",
    name: "数学计算",
    description: "解决复杂数学问题，支持公式推导和步骤展示",
    category: "data",
    icon: <Calculator className="h-6 w-6" />,
    rating: 4.5,
    downloads: 4100,
    isInstalled: false,
    author: "社区",
    tags: ["数学", "计算", "公式"],
  },
];

interface SkillStoreProps {
  onInstall?: (skillId: string) => void;
  onCreateNew?: () => void;
}

export function SkillStore({ onInstall, onCreateNew }: SkillStoreProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [installedSkills, setInstalledSkills] = useState<Set<string>>(
    new Set(storeItems.filter(s => s.isInstalled).map(s => s.id))
  );

  const filteredItems = storeItems.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredItems = storeItems.filter(item => item.isFeatured);
  const newItems = storeItems.filter(item => item.isNew);

  const handleInstall = (skillId: string, skillName: string) => {
    setInstalledSkills(prev => new Set(prev).add(skillId));
    onInstall?.(skillId);
    toast({
      title: "安装成功",
      description: `「${skillName}」能力已添加到您的助手`,
    });
  };

  const formatDownloads = (count: number) => {
    if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* 搜索栏 */}
      <div className="p-4 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索能力..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="discover" className="h-full flex flex-col">
          <div className="px-4 pt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="discover" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                发现
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-2">
                <Filter className="h-4 w-4" />
                分类
              </TabsTrigger>
              <TabsTrigger value="installed" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                已安装
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-4 py-4">
            {/* 发现页 */}
            <TabsContent value="discover" className="mt-0 space-y-6">
              {/* 精选推荐 */}
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  精选推荐
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {featuredItems.map((item) => (
                    <SkillCard
                      key={item.id}
                      item={item}
                      isInstalled={installedSkills.has(item.id)}
                      onInstall={handleInstall}
                      formatDownloads={formatDownloads}
                    />
                  ))}
                </div>
              </section>

              {/* 新上架 */}
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  新上架
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {newItems.map((item) => (
                    <SkillCard
                      key={item.id}
                      item={item}
                      isInstalled={installedSkills.has(item.id)}
                      onInstall={handleInstall}
                      formatDownloads={formatDownloads}
                    />
                  ))}
                </div>
              </section>

              {/* 创建自己的能力 */}
              <section>
                <Card className="border-dashed border-2 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer" onClick={onCreateNew}>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Sparkles className="h-7 w-7 text-primary" />
                    </div>
                    <h4 className="font-semibold text-lg mb-2">创建自己的能力</h4>
                    <p className="text-sm text-muted-foreground text-center">
                      用自然语言描述你想要的功能，AI 帮你生成
                    </p>
                  </CardContent>
                </Card>
              </section>
            </TabsContent>

            {/* 分类页 */}
            <TabsContent value="categories" className="mt-0 space-y-4">
              {/* 分类标签 */}
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={activeCategory === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCategory(cat.id)}
                    className="gap-2"
                  >
                    {cat.icon}
                    {cat.label}
                  </Button>
                ))}
              </div>

              {/* 分类结果 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredItems.map((item) => (
                  <SkillCard
                    key={item.id}
                    item={item}
                    isInstalled={installedSkills.has(item.id)}
                    onInstall={handleInstall}
                    formatDownloads={formatDownloads}
                  />
                ))}
              </div>

              {filteredItems.length === 0 && (
                <div className="text-center py-12">
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">没有找到匹配的能力</p>
                  <Button variant="link" onClick={onCreateNew} className="mt-2">
                    创建一个新能力
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* 已安装页 */}
            <TabsContent value="installed" className="mt-0 space-y-4">
              {storeItems
                .filter((item) => installedSkills.has(item.id))
                .map((item) => (
                  <SkillCard
                    key={item.id}
                    item={item}
                    isInstalled={true}
                    onInstall={handleInstall}
                    formatDownloads={formatDownloads}
                  />
                ))}
              
              {installedSkills.size === 0 && (
                <div className="text-center py-12">
                  <Download className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">还没有安装任何能力</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    去「发现」页面浏览并安装能力
                  </p>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}

// 能力卡片组件
function SkillCard({
  item,
  isInstalled,
  onInstall,
  formatDownloads,
}: {
  item: SkillStoreItem;
  isInstalled: boolean;
  onInstall: (id: string, name: string) => void;
  formatDownloads: (count: number) => string;
}) {
  return (
    <Card className="group hover:shadow-md transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            {item.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold truncate">{item.name}</h4>
              {item.isNew && (
                <Badge variant="secondary" className="text-xs bg-status-confirm/20 text-status-confirm">
                  新
                </Badge>
              )}
              {item.isFeatured && (
                <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                  精选
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {item.description}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardFooter className="pt-2 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-primary text-primary" />
            {item.rating}
          </span>
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            {formatDownloads(item.downloads)}
          </span>
          <span>{item.author}</span>
        </div>
        <Button
          size="sm"
          variant={isInstalled ? "outline" : "default"}
          disabled={isInstalled}
          onClick={() => onInstall(item.id, item.name)}
          className="gap-1"
        >
          {isInstalled ? (
            <>
              <CheckCircle2 className="h-3 w-3" />
              已安装
            </>
          ) : (
            <>
              <Download className="h-3 w-3" />
              安装
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
