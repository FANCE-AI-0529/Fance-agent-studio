import { useState, useMemo } from "react";
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
  Zap,
  Filter,
  Bot,
  Package,
  Crown,
  BadgeCheck,
  Wrench,
  ExternalLink,
} from "lucide-react";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { Badge } from "../ui/badge.tsx";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Skeleton } from "../ui/skeleton.tsx";
import { cn } from "../../lib/utils.ts";
import {
  useFeaturedSkills,
  useNewSkills,
  useMarketSkills,
  type SkillOriginFilter,
} from "../../hooks/useSkillMarket.ts";
import { useMyInstalledSkills, useInstallSkill } from "../../hooks/useSkillInstall.ts";
import { useAuth } from "../../contexts/AuthContext.tsx";
import type { MarketSkill } from "../../hooks/useSkillMarket.ts";
import { MCPSourceFilter, type SkillOrigin } from "./MCPSourceFilter.tsx";
import { MCPBadge, MCPInfoBadges } from "./MCPBadge.tsx";
import { MCPToolsPreview } from "./MCPToolsList.tsx";
import type { MCPTool, MCPResource } from "./MCPToolsList.tsx";

const categories = [
  { id: "all", label: "全部", icon: <Sparkles className="h-4 w-4" /> },
  { id: "nlp", label: "文本处理", icon: <FileText className="h-4 w-4" /> },
  { id: "data", label: "数据分析", icon: <Database className="h-4 w-4" /> },
  { id: "web", label: "网络搜索", icon: <Globe className="h-4 w-4" /> },
  { id: "chat", label: "对话增强", icon: <MessageSquare className="h-4 w-4" /> },
  { id: "productivity", label: "效率工具", icon: <Zap className="h-4 w-4" /> },
  { id: "browser", label: "浏览器", icon: <Globe className="h-4 w-4" /> },
  { id: "database", label: "数据库", icon: <Database className="h-4 w-4" /> },
  { id: "design", label: "创意设计", icon: <Sparkles className="h-4 w-4" /> },
  { id: "content", label: "内容创作", icon: <FileText className="h-4 w-4" /> },
  { id: "document", label: "文档处理", icon: <FileText className="h-4 w-4" /> },
  { id: "code", label: "开发工具", icon: <Wrench className="h-4 w-4" /> },
];

const getCategoryIcon = (category: string) => {
  const cat = categories.find((c) => c.id === category);
  return cat?.icon || <Sparkles className="h-6 w-6" />;
};

interface SkillStoreProps {
  onInstall?: (skillId: string) => void;
  onCreateNew?: () => void;
}

export function SkillStore({ onInstall, onCreateNew }: SkillStoreProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"popular" | "newest" | "rating">("popular");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");
  const [originFilter, setOriginFilter] = useState<SkillOrigin>("all");

  // Fetch real data with origin filter
  const { data: featuredSkills = [], isLoading: loadingFeatured } = useFeaturedSkills();
  const { data: newSkills = [], isLoading: loadingNew } = useNewSkills();
  const { data: marketSkills = [], isLoading: loadingMarket } = useMarketSkills({
    category: activeCategory,
    sortBy,
    priceFilter,
    origin: originFilter as SkillOriginFilter,
  });
  const { data: installedData = [] } = useMyInstalledSkills();
  const installSkill = useInstallSkill();

  // Installed skill IDs set
  const installedSkillIds = useMemo(
    () => new Set(installedData.map((i: any) => i.skill_id)),
    [installedData]
  );

  // Filter by search term
  const filteredSkills = useMemo(() => {
    if (!searchTerm) return marketSkills;
    const term = searchTerm.toLowerCase();
    return marketSkills.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.description?.toLowerCase().includes(term) ||
        (s.tags || []).some((t) => t.toLowerCase().includes(term))
    );
  }, [marketSkills, searchTerm]);

  const handleInstall = async (skillId: string) => {
    if (!user) {
      onInstall?.(skillId);
      return;
    }
    await installSkill.mutateAsync(skillId);
    onInstall?.(skillId);
  };

  const formatDownloads = (count: number | null) => {
    if (!count) return "0";
    if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  const formatPrice = (price: number | null, isFree: boolean | null) => {
    if (isFree || !price || price === 0) return "免费";
    return `¥${price}`;
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
                {loadingFeatured ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[1, 2].map((i) => (
                      <SkillCardSkeleton key={i} />
                    ))}
                  </div>
                ) : featuredSkills.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {featuredSkills.map((skill) => (
                      <SkillCard
                        key={skill.id}
                        skill={skill}
                        isInstalled={installedSkillIds.has(skill.id)}
                        onInstall={handleInstall}
                        formatDownloads={formatDownloads}
                        formatPrice={formatPrice}
                        isInstalling={installSkill.isPending}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Crown className="h-8 w-8" />}
                    title="暂无精选能力"
                    description="精选能力将在这里展示"
                  />
                )}
              </section>

              {/* 新上架 */}
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  新上架
                </h3>
                {loadingNew ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[1, 2].map((i) => (
                      <SkillCardSkeleton key={i} />
                    ))}
                  </div>
                ) : newSkills.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {newSkills.slice(0, 4).map((skill) => (
                      <SkillCard
                        key={skill.id}
                        skill={skill}
                        isInstalled={installedSkillIds.has(skill.id)}
                        onInstall={handleInstall}
                        formatDownloads={formatDownloads}
                        formatPrice={formatPrice}
                        isInstalling={installSkill.isPending}
                        isNew
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Clock className="h-8 w-8" />}
                    title="暂无新能力"
                    description="最新发布的能力将在这里展示"
                  />
                )}
              </section>

              {/* 创建自己的能力 */}
              <section>
                <Card
                  className="border-dashed border-2 bg-card hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer rounded-xl"
                  onClick={onCreateNew}
                >
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
              {/* 来源过滤器 */}
              <MCPSourceFilter 
                value={originFilter} 
                onChange={setOriginFilter} 
              />

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

              {/* 排序和筛选 */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={sortBy === "popular" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSortBy("popular")}
                >
                  最热门
                </Button>
                <Button
                  variant={sortBy === "newest" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSortBy("newest")}
                >
                  最新
                </Button>
                <Button
                  variant={sortBy === "rating" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSortBy("rating")}
                >
                  最高评分
                </Button>
                <div className="w-px h-4 bg-border mx-2" />
                <Button
                  variant={priceFilter === "free" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPriceFilter(priceFilter === "free" ? "all" : "free")}
                >
                  免费
                </Button>
              </div>

              {/* 分类结果 */}
              {loadingMarket ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <SkillCardSkeleton key={i} />
                  ))}
                </div>
              ) : filteredSkills.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredSkills.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      isInstalled={installedSkillIds.has(skill.id)}
                      onInstall={handleInstall}
                      formatDownloads={formatDownloads}
                      formatPrice={formatPrice}
                      isInstalling={installSkill.isPending}
                    />
                  ))}
                </div>
              ) : (
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
              {!user ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">登录后查看已安装的能力</p>
                </div>
              ) : installedData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {installedData.map((install: any) => (
                    <SkillCard
                      key={install.id}
                      skill={install.skill}
                      isInstalled
                      onInstall={handleInstall}
                      formatDownloads={formatDownloads}
                      formatPrice={formatPrice}
                      isInstalling={false}
                    />
                  ))}
                </div>
              ) : (
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
  skill,
  isInstalled,
  onInstall,
  formatDownloads,
  formatPrice,
  isInstalling,
  isNew,
}: {
  skill: MarketSkill;
  isInstalled: boolean;
  onInstall: (id: string) => void;
  formatDownloads: (count: number | null) => string;
  formatPrice: (price: number | null, isFree: boolean | null) => string;
  isInstalling: boolean;
  isNew?: boolean;
}) {
  const icon = getCategoryIcon(skill.category);
  const isMCP = skill.origin === "mcp";
  const mcpTools = (skill.mcp_tools as MCPTool[] | null) || [];
  const mcpResources = (skill.mcp_resources as MCPResource[] | null) || [];

  return (
    <Card className="group hover:border-primary/50 hover:shadow-lg transition-all rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
            isMCP ? "bg-purple-500/10 text-purple-400" : "bg-primary/10 text-primary"
          )}>
            {isMCP ? <Wrench className="h-6 w-6" /> : icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold truncate">{skill.name}</h4>
              {isMCP && <MCPBadge />}
              {isNew && (
                <Badge variant="secondary" className="text-xs bg-status-confirm/20 text-status-confirm">
                  新
                </Badge>
              )}
              {skill.is_featured && (
                <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                  精选
                </Badge>
              )}
              {skill.is_verified && (
                <BadgeCheck className="h-4 w-4 text-primary" />
              )}
            </div>
            {/* MCP Info Badges (runtime, scope, official) */}
            {isMCP && (
              <MCPInfoBadges
                runtime={skill.runtime_env}
                scope={skill.scope}
                isOfficial={skill.is_official}
                className="mt-1"
              />
            )}
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {skill.description || "暂无描述"}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardFooter className="pt-2 flex flex-col gap-2">
        {/* MCP Tools/Resources preview */}
        {isMCP && (mcpTools.length > 0 || mcpResources.length > 0) && (
          <MCPToolsPreview tools={mcpTools} resources={mcpResources} className="w-full" />
        )}
        
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-primary text-primary" />
              {skill.rating || 0}
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              {formatDownloads(skill.downloads_count)}
            </span>
            {isMCP && skill.github_stars ? (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                {skill.github_stars}
              </span>
            ) : (
              <span className={cn(
                skill.is_free ? "text-status-executing" : "text-primary font-medium"
              )}>
                {formatPrice(skill.price, skill.is_free)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isMCP && skill.transport_url && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => globalThis.open(skill.transport_url!, "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="sm"
              variant={isInstalled ? "outline" : "default"}
              disabled={isInstalled || isInstalling}
              onClick={() => onInstall(skill.id)}
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
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

function SkillCardSkeleton() {
  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      </CardHeader>
      <CardFooter className="pt-2">
        <Skeleton className="h-8 w-full" />
      </CardFooter>
    </Card>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        {icon}
      </div>
      <p className="font-medium">{title}</p>
      <p className="text-sm mt-1">{description}</p>
    </div>
  );
}
