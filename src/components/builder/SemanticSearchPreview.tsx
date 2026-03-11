// =====================================================
// 语义搜索预览组件 - Semantic Search Preview
// 展示实时资产搜索结果
// =====================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Zap,
  Database,
  BookOpen,
  Check,
  Plus,
  Minus,
  Loader2,
  Sparkles,
  Filter,
  SortAsc,
} from 'lucide-react';
import { Button } from '../ui/button.tsx';
import { Badge } from '../ui/badge.tsx';
import { Input } from '../ui/input.tsx';
import { ScrollArea } from '../ui/scroll-area.tsx';
import { Checkbox } from '../ui/checkbox.tsx';
import { Progress } from '../ui/progress.tsx';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip.tsx';
import { cn } from '../../lib/utils.ts';
import type { SemanticAsset, AssetSearchResult } from '../../types/workflowDSL.ts';

// ========== 类型定义 ==========

interface SemanticSearchPreviewProps {
  searchResults: AssetSearchResult | null;
  selectedAssets: string[];
  isSearching: boolean;
  onAssetSelect: (assetId: string) => void;
  onAssetDeselect: (assetId: string) => void;
  onSearch?: (query: string) => void;
  className?: string;
}

interface AssetCardProps {
  asset: SemanticAsset;
  isSelected: boolean;
  onToggle: () => void;
}

// ========== 资产类型配置 ==========

const ASSET_TYPE_CONFIG = {
  skill: {
    icon: Zap,
    label: '技能',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  mcp_tool: {
    icon: Database,
    label: 'MCP 工具',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  knowledge_base: {
    icon: BookOpen,
    label: '知识库',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
};

// ========== 相似度颜色 ==========

function getSimilarityColor(similarity: number): string {
  if (similarity >= 0.8) return 'text-green-500';
  if (similarity >= 0.6) return 'text-yellow-500';
  return 'text-orange-500';
}

// ========== 资产卡片组件 ==========

function AssetCard({ asset, isSelected, onToggle }: AssetCardProps) {
  const config = ASSET_TYPE_CONFIG[asset.assetType];
  const Icon = config.icon;
  const similarityPercent = Math.round((asset.similarity || 0) * 100);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ scale: 1.01 }}
      onClick={onToggle}
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-all',
        isSelected
          ? `${config.bgColor} ${config.borderColor} border-2`
          : 'bg-card border-border hover:border-primary/30'
      )}
    >
      <div className="flex items-start gap-3">
        {/* 选择指示器 */}
        <div className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
          isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
        )}>
          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
        
        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Icon className={cn('h-4 w-4', config.color)} />
            <span className="font-medium text-sm truncate">{asset.name}</span>
            <Badge variant="outline" className={cn('text-[10px] ml-auto', config.color)}>
              {config.label}
            </Badge>
          </div>
          
          {asset.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {asset.description}
            </p>
          )}
          
          <div className="flex items-center gap-2 mt-2">
            {/* 相似度 */}
            {asset.similarity !== undefined && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Sparkles className={cn('h-3 w-3', getSimilarityColor(asset.similarity))} />
                      <span className={cn('text-[10px] font-medium', getSimilarityColor(asset.similarity))}>
                        {similarityPercent}%
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    语义相似度: {similarityPercent}%
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* 能力标签 */}
            {asset.capabilities && asset.capabilities.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {asset.capabilities.slice(0, 3).map((cap, index) => (
                  <Badge key={index} variant="secondary" className="text-[9px] py-0">
                    {cap}
                  </Badge>
                ))}
                {asset.capabilities.length > 3 && (
                  <Badge variant="secondary" className="text-[9px] py-0">
                    +{asset.capabilities.length - 3}
                  </Badge>
                )}
              </div>
            )}
            
            {/* 风险级别 */}
            <Badge
              variant="outline"
              className={cn(
                'text-[9px] py-0 ml-auto',
                asset.riskLevel === 'high' ? 'text-red-500 border-red-500/30' :
                asset.riskLevel === 'medium' ? 'text-yellow-500 border-yellow-500/30' :
                'text-green-500 border-green-500/30'
              )}
            >
              {asset.riskLevel === 'high' ? '高危' : asset.riskLevel === 'medium' ? '中危' : '低危'}
            </Badge>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ========== 主组件 ==========

export function SemanticSearchPreview({
  searchResults,
  selectedAssets,
  isSearching,
  onAssetSelect,
  onAssetDeselect,
  onSearch,
  className,
}: SemanticSearchPreviewProps) {
  const [filterType, setFilterType] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'similarity' | 'name'>('similarity');
  const [localSearch, setLocalSearch] = useState('');
  
  // 合并所有资产
  const allAssets = React.useMemo(() => {
    if (!searchResults) return [];
    return [
      ...searchResults.skills,
      ...searchResults.mcpTools,
      ...searchResults.knowledgeBases,
    ];
  }, [searchResults]);
  
  // 过滤和排序
  const filteredAssets = React.useMemo(() => {
    let assets = [...allAssets];
    
    // 类型过滤
    if (filterType) {
      assets = assets.filter((a) => a.assetType === filterType);
    }
    
    // 搜索过滤
    if (localSearch) {
      const search = localSearch.toLowerCase();
      assets = assets.filter(
        (a) =>
          a.name.toLowerCase().includes(search) ||
          (a.description && a.description.toLowerCase().includes(search))
      );
    }
    
    // 排序
    if (sortBy === 'similarity') {
      assets.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
    } else {
      assets.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return assets;
  }, [allAssets, filterType, localSearch, sortBy]);
  
  const handleToggle = (assetId: string) => {
    if (selectedAssets.includes(assetId)) {
      onAssetDeselect(assetId);
    } else {
      onAssetSelect(assetId);
    }
  };
  
  // 统计
  const stats = {
    skills: searchResults?.skills.length || 0,
    mcpTools: searchResults?.mcpTools.length || 0,
    knowledgeBases: searchResults?.knowledgeBases.length || 0,
    selected: selectedAssets.length,
  };
  
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 头部 */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">语义资产搜索</span>
          {isSearching && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
        </div>
        
        {/* 搜索输入 */}
        {onSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索资产..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
        )}
        
        {/* 过滤器 */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={filterType === null ? 'secondary' : 'ghost'}
            className="h-7 text-xs"
            onClick={() => setFilterType(null)}
          >
            全部 ({allAssets.length})
          </Button>
          <Button
            size="sm"
            variant={filterType === 'skill' ? 'secondary' : 'ghost'}
            className="h-7 text-xs gap-1"
            onClick={() => setFilterType('skill')}
          >
            <Zap className="h-3 w-3" />
            技能 ({stats.skills})
          </Button>
          <Button
            size="sm"
            variant={filterType === 'mcp_tool' ? 'secondary' : 'ghost'}
            className="h-7 text-xs gap-1"
            onClick={() => setFilterType('mcp_tool')}
          >
            <Database className="h-3 w-3" />
            MCP ({stats.mcpTools})
          </Button>
          <Button
            size="sm"
            variant={filterType === 'knowledge_base' ? 'secondary' : 'ghost'}
            className="h-7 text-xs gap-1"
            onClick={() => setFilterType('knowledge_base')}
          >
            <BookOpen className="h-3 w-3" />
            知识库 ({stats.knowledgeBases})
          </Button>
        </div>
        
        {/* 选中统计 */}
        {stats.selected > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-primary" />
            已选择 {stats.selected} 个资产
          </div>
        )}
      </div>
      
      {/* 资产列表 */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {isSearching ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">正在搜索资产...</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">未找到匹配的资产</p>
              <p className="text-xs mt-1">尝试调整搜索条件或过滤器</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  isSelected={selectedAssets.includes(asset.id)}
                  onToggle={() => handleToggle(asset.id)}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
      
      {/* 底部操作 */}
      {stats.selected > 0 && (
        <div className="p-4 border-t border-border">
          <Button className="w-full gap-2" size="sm">
            <Check className="h-4 w-4" />
            使用选中的 {stats.selected} 个资产
          </Button>
        </div>
      )}
    </div>
  );
}

export default SemanticSearchPreview;
