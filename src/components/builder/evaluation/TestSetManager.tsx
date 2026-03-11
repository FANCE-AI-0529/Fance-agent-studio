/**
 * @file TestSetManager.tsx
 * @description 测试集管理组件
 */

import { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Copy, 
  Sparkles,
  FileText,
  Shield,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card.tsx';
import { Button } from '../../ui/button.tsx';
import { Badge } from '../../ui/badge.tsx';
import { Input } from '../../ui/input.tsx';
import { Textarea } from '../../ui/textarea.tsx';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../ui/select.tsx';
import { ScrollArea } from '../../ui/scroll-area.tsx';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../ui/dialog.tsx';
import type { TestCase, GenerateTestCasesRequest } from '../../../types/agentEvals.ts';
import { cn } from '../../../lib/utils.ts';

interface TestSetManagerProps {
  agentId: string;
  agentConfig: {
    name: string;
    systemPrompt?: string;
    department?: string;
  };
  onGenerateTests: (request: GenerateTestCasesRequest) => Promise<TestCase[]>;
}

const categoryLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  functionality: { label: '功能测试', icon: FileText, color: 'text-blue-500' },
  edge_case: { label: '边界测试', icon: AlertTriangle, color: 'text-yellow-500' },
  security: { label: '安全测试', icon: Shield, color: 'text-red-500' },
};

export function TestSetManager({ agentId, agentConfig, onGenerateTests }: TestSetManagerProps) {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // 新建测试用例表单
  const [newTestCase, setNewTestCase] = useState<Partial<TestCase>>({
    name: '',
    category: 'functionality',
    input: '',
    requiredPatterns: [],
    forbiddenPatterns: [],
  });

  // AI 生成测试用例
  const handleGenerateTests = async () => {
    setIsGenerating(true);
    try {
      const generated = await onGenerateTests({
        agentId,
        agentConfig: {
          name: agentConfig.name,
          systemPrompt: agentConfig.systemPrompt,
          department: agentConfig.department,
        },
        categories: ['functionality', 'edge_case', 'security'],
        count: 3,
      });
      setTestCases(prev => [...prev, ...generated]);
    } catch (error) {
      console.error('Failed to generate tests:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 添加手动测试用例
  const handleAddTestCase = () => {
    if (!newTestCase.name || !newTestCase.input) return;
    
    const testCase: TestCase = {
      id: `test-${Date.now()}`,
      name: newTestCase.name,
      category: (newTestCase.category as TestCase['category']) || 'functionality',
      input: newTestCase.input,
      expectedBehavior: newTestCase.expectedBehavior || '',
      requiredPatterns: newTestCase.requiredPatterns || [],
      forbiddenPatterns: newTestCase.forbiddenPatterns || [],
      riskLevel: 'medium',
    };
    
    setTestCases(prev => [...prev, testCase]);
    setNewTestCase({
      name: '',
      category: 'functionality' as const,
      input: '',
      requiredPatterns: [],
      forbiddenPatterns: [],
    });
    setShowAddDialog(false);
  };

  // 删除测试用例
  const handleDeleteTestCase = (id: string) => {
    setTestCases(prev => prev.filter(t => t.id !== id));
  };

  // 过滤测试用例
  const filteredTestCases = selectedCategory === 'all' 
    ? testCases 
    : testCases.filter(t => t.category === selectedCategory);

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-2">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="functionality">功能测试</SelectItem>
            <SelectItem value="edge_case">边界测试</SelectItem>
            <SelectItem value="security">安全测试</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleGenerateTests}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3 mr-1" />
            )}
            AI 生成
          </Button>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-3 w-3 mr-1" />
                添加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加测试用例</DialogTitle>
                <DialogDescription>
                  创建一个新的测试用例来验证 Agent 行为
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">测试名称</label>
                  <Input 
                    placeholder="例：正确回答产品咨询"
                    value={newTestCase.name}
                    onChange={e => setNewTestCase(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">测试类型</label>
                <Select 
                    value={newTestCase.category}
                    onValueChange={v => setNewTestCase(p => ({ ...p, category: v as TestCase['category'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="functionality">功能测试</SelectItem>
                      <SelectItem value="edge_case">边界测试</SelectItem>
                      <SelectItem value="security">安全测试</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">测试输入</label>
                  <Textarea 
                    placeholder="输入发送给 Agent 的消息..."
                    value={newTestCase.input}
                    onChange={e => setNewTestCase(p => ({ ...p, input: e.target.value }))}
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">期望行为（可选）</label>
                  <Textarea 
                    placeholder="描述 Agent 应该如何回应..."
                    value={newTestCase.expectedBehavior || ''}
                    onChange={e => setNewTestCase(p => ({ ...p, expectedBehavior: e.target.value }))}
                    rows={2}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleAddTestCase}>
                  添加
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(categoryLabels).map(([key, { label, icon: Icon, color }]) => {
          const count = testCases.filter(t => t.category === key).length;
          return (
            <Card key={key} className="p-2">
              <div className="flex items-center gap-2">
                <Icon className={cn('h-4 w-4', color)} />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold">{count}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 测试用例列表 */}
      <ScrollArea className="h-64">
        {filteredTestCases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无测试用例</p>
            <p className="text-xs">点击 "AI 生成" 或 "添加" 创建测试用例</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTestCases.map(testCase => {
              const { label, icon: Icon, color } = categoryLabels[testCase.category];
              return (
                <Card key={testCase.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={cn('h-3 w-3', color)} />
                        <span className="text-sm font-medium truncate">
                          {testCase.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {testCase.input}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => handleDeleteTestCase(testCase.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
