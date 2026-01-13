// =====================================================
// DSL 调试面板 - DSL Debug Panel
// 查看原始 DSL 结构、提取参数、合规报告
// =====================================================

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2,
  FileJson,
  Settings,
  Shield,
  ChevronRight,
  ChevronDown,
  Copy,
  Download,
  Search,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type {
  WorkflowDSL,
  ComplianceReport,
  StageSpec,
  NodeSpec,
  InjectedIntervention,
  GenerationWarning,
} from '@/types/workflowDSL';

// ========== 类型定义 ==========

interface DSLDebugPanelProps {
  dsl: WorkflowDSL | null;
  extractedParams?: Record<string, unknown>;
  complianceReport?: ComplianceReport | null;
  requiredPermissions?: string[];
  interventions?: InjectedIntervention[];
  warnings?: GenerationWarning[];
  isOpen: boolean;
  onClose: () => void;
}

interface TreeNodeProps {
  label: string;
  value: unknown;
  depth?: number;
  searchTerm?: string;
}

// ========== 树形节点组件 ==========

function TreeNode({ label, value, depth = 0, searchTerm = '' }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const isEmpty = isObject && Object.keys(value as object).length === 0;
  
  const highlightMatch = (text: string): React.ReactNode => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-yellow-500/30 text-yellow-700 dark:text-yellow-300">
          {part}
        </span>
      ) : (
        part
      )
    );
  };
  
  const matchesSearch = searchTerm && 
    (label.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (typeof value === 'string' && value.toLowerCase().includes(searchTerm.toLowerCase())));
  
  if (!isObject) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 py-0.5 text-xs font-mono',
          matchesSearch && 'bg-yellow-500/10 rounded'
        )}
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        <span className="text-muted-foreground">{highlightMatch(label)}:</span>
        <span className={cn(
          typeof value === 'string' ? 'text-green-600 dark:text-green-400' :
          typeof value === 'number' ? 'text-blue-600 dark:text-blue-400' :
          typeof value === 'boolean' ? 'text-purple-600 dark:text-purple-400' :
          'text-foreground'
        )}>
          {typeof value === 'string' ? `"${highlightMatch(value)}"` : String(value)}
        </span>
      </div>
    );
  }
  
  const entries = Object.entries(value as object);
  
  return (
    <div className={cn(matchesSearch && 'bg-yellow-500/10 rounded')}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 py-0.5 text-xs font-mono hover:bg-muted/50 rounded w-full text-left"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        )}
        <span className="text-muted-foreground">{highlightMatch(label)}</span>
        <span className="text-muted-foreground/50 ml-1">
          {isArray ? `[${entries.length}]` : `{${entries.length}}`}
        </span>
      </button>
      
      <AnimatePresence>
        {isExpanded && !isEmpty && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {entries.map(([key, val]) => (
              <TreeNode
                key={key}
                label={isArray ? `[${key}]` : key}
                value={val}
                depth={depth + 1}
                searchTerm={searchTerm}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ========== 参数表格组件 ==========

function ParamsTable({ params }: { params: Record<string, unknown> }) {
  const flattenParams = (obj: Record<string, unknown>, prefix = ''): Array<{ key: string; value: string; type: string }> => {
    const result: Array<{ key: string; value: string; type: string }> = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result.push(...flattenParams(value as Record<string, unknown>, fullKey));
      } else {
        result.push({
          key: fullKey,
          value: JSON.stringify(value),
          type: Array.isArray(value) ? 'array' : typeof value,
        });
      }
    }
    
    return result;
  };
  
  const flatParams = flattenParams(params);
  
  if (flatParams.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">未提取到参数</p>
      </div>
    );
  }
  
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-3 py-2 font-medium">参数路径</th>
            <th className="text-left px-3 py-2 font-medium">值</th>
            <th className="text-left px-3 py-2 font-medium">类型</th>
          </tr>
        </thead>
        <tbody>
          {flatParams.map((param, index) => (
            <tr key={param.key} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
              <td className="px-3 py-2 font-mono text-primary">{param.key}</td>
              <td className="px-3 py-2 font-mono truncate max-w-[200px]">{param.value}</td>
              <td className="px-3 py-2">
                <Badge variant="outline" className="text-[10px]">
                  {param.type}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ========== 合规报告组件 ==========

function ComplianceSection({ report, permissions }: { report: ComplianceReport; permissions: string[] }) {
  return (
    <div className="space-y-4">
      {/* 概览 */}
      <div className={cn(
        'p-4 rounded-lg border',
        report.isCompliant ? 'bg-green-500/5 border-green-500/30' : 'bg-red-500/5 border-red-500/30'
      )}>
        <div className="flex items-center gap-2">
          {report.isCompliant ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          )}
          <span className="font-medium">
            {report.isCompliant ? '符合 MPLP 规范' : '存在合规问题'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
          <div>
            <p className="text-muted-foreground">高危操作</p>
            <p className="font-medium">{report.totalRiskyOperations}</p>
          </div>
          <div>
            <p className="text-muted-foreground">已保护</p>
            <p className="font-medium text-green-600">{report.protectedOperations}</p>
          </div>
        </div>
      </div>
      
      {/* 未保护操作 */}
      {report.unprotectedOperations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-4 w-4" />
            未保护的高危操作
          </h4>
          <div className="space-y-1">
            {report.unprotectedOperations.map((op, index) => (
              <div key={index} className="text-xs p-2 rounded bg-red-500/5 border border-red-500/20">
                {op}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 自动修复 */}
      {report.autoFixedOperations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            自动修复的操作
          </h4>
          <div className="space-y-1">
            {report.autoFixedOperations.map((op, index) => (
              <div key={index} className="text-xs p-2 rounded bg-green-500/5 border border-green-500/20">
                {op}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 权限列表 */}
      {permissions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">声明的权限</h4>
          <div className="flex flex-wrap gap-1">
            {permissions.map((perm) => (
              <Badge key={perm} variant="secondary" className="text-[10px]">
                {perm}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* 建议 */}
      {report.recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4" />
            优化建议
          </h4>
          <div className="space-y-1">
            {report.recommendations.map((rec, index) => (
              <div key={index} className="text-xs p-2 rounded bg-blue-500/5 border border-blue-500/20">
                {rec}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ========== 主组件 ==========

export function DSLDebugPanel({
  dsl,
  extractedParams = {},
  complianceReport,
  requiredPermissions = [],
  interventions = [],
  warnings = [],
  isOpen,
  onClose,
}: DSLDebugPanelProps) {
  const [activeTab, setActiveTab] = useState('structure');
  const [searchTerm, setSearchTerm] = useState('');
  
  const handleCopy = () => {
    if (!dsl) return;
    navigator.clipboard.writeText(JSON.stringify(dsl, null, 2));
    toast({
      title: '已复制到剪贴板',
      description: 'DSL JSON 已复制',
    });
  };
  
  const handleDownload = () => {
    if (!dsl) return;
    const blob = new Blob([JSON.stringify(dsl, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dsl.name || 'workflow'}-dsl.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl max-h-[85vh] bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Code2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">DSL 调试面板</h2>
                <p className="text-sm text-muted-foreground">
                  {dsl?.name || '未命名工作流'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopy}>
                <Copy className="h-3.5 w-3.5" />
                复制
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5" />
                导出
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* 内容 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-6 pt-4 border-b border-border">
              <TabsList>
                <TabsTrigger value="structure" className="gap-1.5">
                  <FileJson className="h-3.5 w-3.5" />
                  结构
                </TabsTrigger>
                <TabsTrigger value="params" className="gap-1.5">
                  <Settings className="h-3.5 w-3.5" />
                  参数
                </TabsTrigger>
                <TabsTrigger value="compliance" className="gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  合规
                </TabsTrigger>
                <TabsTrigger value="raw" className="gap-1.5">
                  <Code2 className="h-3.5 w-3.5" />
                  源码
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <TabsContent value="structure" className="h-full m-0 p-0">
                <div className="p-4 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索属性或值..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <ScrollArea className="h-[calc(100%-60px)]">
                  <div className="p-4">
                    {dsl ? (
                      <TreeNode label="WorkflowDSL" value={dsl} searchTerm={searchTerm} />
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileJson className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>暂无 DSL 数据</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="params" className="h-full m-0 p-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <ParamsTable params={extractedParams} />
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="compliance" className="h-full m-0 p-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    {complianceReport ? (
                      <ComplianceSection 
                        report={complianceReport} 
                        permissions={requiredPermissions} 
                      />
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>暂无合规报告</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="raw" className="h-full m-0 p-0">
                <ScrollArea className="h-full">
                  <pre className="p-4 text-xs font-mono bg-muted/30 min-h-full">
                    {dsl ? JSON.stringify(dsl, null, 2) : '// 暂无数据'}
                  </pre>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default DSLDebugPanel;
