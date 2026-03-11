/**
 * @file IntentHeatmap.tsx
 * @description 意图分类热力图组件
 */

import { useMemo } from 'react';
import { cn } from '../../lib/utils.ts';

interface IntentRecord {
  turn: number;
  intent: string;
  confidence: number;
  driftScore: number;
  timestamp: string;
}

interface IntentHeatmapProps {
  data: IntentRecord[];
  className?: string;
}

// 预定义的意图类别
const intentCategories = [
  '产品咨询',
  '价格询问',
  '竞品对比',
  '技术支持',
  '购买决策',
  '售后服务',
  '其他',
];

export function IntentHeatmap({ data, className }: IntentHeatmapProps) {
  // 计算每个意图类别的频率和置信度
  const heatmapData = useMemo(() => {
    const categoryStats: Record<string, { count: number; totalConfidence: number }> = {};
    
    // 初始化
    intentCategories.forEach(cat => {
      categoryStats[cat] = { count: 0, totalConfidence: 0 };
    });

    // 统计
    data.forEach(record => {
      const category = intentCategories.includes(record.intent) 
        ? record.intent 
        : '其他';
      categoryStats[category].count++;
      categoryStats[category].totalConfidence += record.confidence;
    });

    // 计算热度值 (归一化)
    const maxCount = Math.max(...Object.values(categoryStats).map(s => s.count), 1);
    
    return intentCategories.map(category => ({
      category,
      count: categoryStats[category].count,
      avgConfidence: categoryStats[category].count > 0 
        ? categoryStats[category].totalConfidence / categoryStats[category].count 
        : 0,
      heat: categoryStats[category].count / maxCount,
    }));
  }, [data]);

  // 获取热度颜色
  const getHeatColor = (heat: number) => {
    if (heat === 0) return 'bg-muted';
    if (heat < 0.25) return 'bg-blue-500/20';
    if (heat < 0.5) return 'bg-blue-500/40';
    if (heat < 0.75) return 'bg-blue-500/60';
    return 'bg-blue-500/80';
  };

  // 按时间展示意图流
  const intentFlow = useMemo(() => {
    const rows: string[][] = [];
    const chunkSize = Math.ceil(data.length / 3);
    
    for (let i = 0; i < 3; i++) {
      rows.push(data.slice(i * chunkSize, (i + 1) * chunkSize).map(d => d.intent));
    }
    
    return rows;
  }, [data]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* 类别热力图 */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">意图类别分布</p>
        <div className="grid grid-cols-4 gap-1">
          {heatmapData.map(item => (
            <div
              key={item.category}
              className={cn(
                'p-2 rounded text-center transition-colors',
                getHeatColor(item.heat)
              )}
              title={`${item.category}: ${item.count} 次, 平均置信度 ${Math.round(item.avgConfidence * 100)}%`}
            >
              <div className="text-xs font-medium truncate">{item.category}</div>
              <div className="text-[10px] text-muted-foreground">{item.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 意图流可视化 */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">意图转换流</p>
        <div className="space-y-1">
          {intentFlow.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1">
              {row.map((intent, colIndex) => {
                const globalIndex = rowIndex * Math.ceil(data.length / 3) + colIndex;
                const record = data[globalIndex];
                const isDrift = record && record.driftScore < 0.7;
                
                return (
                  <div
                    key={colIndex}
                    className={cn(
                      'flex-1 h-6 rounded text-[10px] flex items-center justify-center truncate px-1',
                      isDrift ? 'bg-yellow-500/30 text-yellow-700 dark:text-yellow-300' : 'bg-primary/10'
                    )}
                    title={intent}
                  >
                    {intent.slice(0, 4)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t">
        <div className="flex items-center gap-2">
          <span>低频</span>
          <div className="flex gap-0.5">
            <div className="w-3 h-3 rounded bg-muted" />
            <div className="w-3 h-3 rounded bg-blue-500/20" />
            <div className="w-3 h-3 rounded bg-blue-500/40" />
            <div className="w-3 h-3 rounded bg-blue-500/60" />
            <div className="w-3 h-3 rounded bg-blue-500/80" />
          </div>
          <span>高频</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-500/30" />
          <span>意图漂移</span>
        </div>
      </div>
    </div>
  );
}
