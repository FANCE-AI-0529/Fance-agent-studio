// =====================================================
// 语义搜索测试面板
// Semantic Search Panel - 统一资产语义检索
// =====================================================

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Zap,
  Database,
  Brain,
  Loader2,
  X,
  Package,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSemanticAssetSearch } from "@/hooks/useSemanticAssetSearch";
import type { SemanticAsset, AssetSearchResult } from "@/types/workflowDSL";

// ========== 类型定义 ==========

type AssetType = "skill" | "mcp_tool" | "knowledge_base";

interface SemanticSearchPanelProps {
  onAssetSelect?: (asset: SemanticAsset) => void;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

// ========== 资产类型配置 ==========

const ASSET_TYPE_CONFIG: Record<
  AssetType,
  { icon: typeof Zap; color: string; label: string; bgColor: string }
> = {
  skill: {
    icon: Zap,
    color: "text-blue-500",
    label: "技能",
    bgColor: "bg-blue-500/10",
  },
  mcp_tool: {
    icon: Package,
    color: "text-purple-500",
    label: "MCP工具",
    bgColor: "bg-purple-500/10",
  },
  knowledge_base: {
    icon: Database,
    color: "text-green-500",
    label: "知识库",
    bgColor: "bg-green-500/10",
  },
};

const RISK_LEVEL_CONFIG: Record<
  "low" | "medium" | "high",
  { color: string; label: string }
> = {
  low: { color: "text-green-500", label: "低风险" },
  medium: { color: "text-yellow-500", label: "中风险" },
  high: { color: "text-red-500", label: "高风险" },
};

// ========== 主组件 ==========

export function SemanticSearchPanel({
  onAssetSelect,
  isOpen,
  onClose,
  className,
}: SemanticSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<AssetType | "all">("all");

  const { searchAssets, isSearching, lastResult, error } =
    useSemanticAssetSearch();

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    try {
      await searchAssets({
        query,
        assetTypes: selectedType === "all" ? undefined : [selectedType],
        maxResults: 20,
      });
    } catch (err) {
      console.error("Search failed:", err);
    }
  }, [query, selectedType, searchAssets]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleAssetClick = (asset: SemanticAsset) => {
    onAssetSelect?.(asset);
  };

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  // 将搜索结果转换为统一格式并分组
  const allAssets = useMemo(() => {
    if (!lastResult) return [];
    
    const assets: Array<SemanticAsset & { similarity?: number }> = [];
    
    // 添加 skills
    lastResult.skills.forEach((skill, idx) => {
      assets.push({
        ...skill,
        similarity: 0.9 - idx * 0.05, // 模拟相似度
      });
    });
    
    // 添加 MCP tools
    lastResult.mcpTools.forEach((tool, idx) => {
      assets.push({
        ...tool,
        similarity: 0.85 - idx * 0.05,
      });
    });
    
    // 添加 knowledge bases
    lastResult.knowledgeBases.forEach((kb, idx) => {
      assets.push({
        ...kb,
        similarity: 0.8 - idx * 0.05,
      });
    });
    
    return assets.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
  }, [lastResult]);

  // 按类型分组结果
  const groupedResults = useMemo(() => {
    return allAssets.reduce(
      (acc, asset) => {
        const type = asset.assetType;
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(asset);
        return acc;
      },
      {} as Record<AssetType, typeof allAssets>
    );
  }, [allAssets]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className={cn(
          "fixed right-4 top-20 bottom-20 w-[380px] bg-card border border-border rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden",
          className
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">语义资产搜索</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            用自然语言描述需求，AI 将匹配最合适的技能、MCP工具和知识库
          </p>

          {/* Search Input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="例如：帮我查公司财务状况..."
                className="pl-9 pr-3"
                disabled={isSearching}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={!query.trim() || isSearching}
              size="sm"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 mt-3">
            <Button
              variant={selectedType === "all" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedType("all")}
            >
              全部
            </Button>
            {(
              Object.entries(ASSET_TYPE_CONFIG) as [
                AssetType,
                (typeof ASSET_TYPE_CONFIG)[AssetType],
              ][]
            ).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <Button
                  key={type}
                  variant={selectedType === type ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setSelectedType(type)}
                >
                  <Icon className="h-3 w-3" />
                  {config.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Results */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Error Display */}
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Empty State */}
            {!isSearching && allAssets.length === 0 && !error && (
              <div className="text-center py-12">
                <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">
                  输入自然语言查询
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  例如："发送邮件"、"查询数据库"、"FAQ 知识库"
                </p>
              </div>
            )}

            {/* Loading State */}
            {isSearching && (
              <div className="text-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 mx-auto mb-4 rounded-full border-2 border-primary border-t-transparent"
                />
                <p className="text-sm text-muted-foreground">
                  正在语义检索...
                </p>
              </div>
            )}

            {/* Grouped Results */}
            {!isSearching &&
              Object.entries(groupedResults).map(([type, assets]) => {
                const config = ASSET_TYPE_CONFIG[type as AssetType];
                const Icon = config.icon;

                return (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", config.color)} />
                      <span className="text-sm font-medium">{config.label}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {assets.length}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      {assets.map((asset, index) => (
                        <AssetCard
                          key={asset.id}
                          asset={asset}
                          onClick={() => handleAssetClick(asset)}
                          index={index}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </ScrollArea>

        {/* Footer */}
        {allAssets.length > 0 && (
          <div className="p-3 border-t border-border bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">
              找到 {allAssets.length} 个匹配资产 · 点击添加到画布
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ========== 资产卡片组件 ==========

function AssetCard({
  asset,
  onClick,
  index,
}: {
  asset: SemanticAsset & { similarity?: number };
  onClick: () => void;
  index: number;
}) {
  const config = ASSET_TYPE_CONFIG[asset.assetType];
  const riskConfig = RISK_LEVEL_CONFIG[asset.riskLevel];
  const Icon = config.icon;

  // 计算匹配度百分比
  const matchPercent = asset.similarity
    ? Math.round(asset.similarity * 100)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg border border-border cursor-pointer transition-all",
        "hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm",
        "group"
      )}
    >
      <div className="flex items-start gap-2">
        <div className={cn("p-1.5 rounded-md", config.bgColor)}>
          <Icon className={cn("h-3.5 w-3.5", config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{asset.name}</span>
            {matchPercent !== null && (
              <Badge
                variant="outline"
                className="text-[10px] shrink-0 ml-auto"
              >
                {matchPercent}% 匹配
              </Badge>
            )}
          </div>
          {asset.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {asset.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {asset.capabilities.slice(0, 3).map((cap) => (
              <Badge
                key={cap}
                variant="secondary"
                className="text-[10px] px-1.5 py-0"
              >
                {cap}
              </Badge>
            ))}
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0", riskConfig.color)}
            >
              {riskConfig.label}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

export default SemanticSearchPanel;
