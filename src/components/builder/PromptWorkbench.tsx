/**
 * @file PromptWorkbench.tsx
 * @description Prompt 工程工作台
 */

import { useState } from 'react';
import { 
  FileText, 
  Variable, 
  GitCompare, 
  Sparkles,
  Copy,
  Check,
  Play,
  History,
  Shield,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PromptTemplates } from './PromptTemplates';
import { PromptABTest } from './PromptABTest';
import { cn } from '@/lib/utils';

interface PromptWorkbenchProps {
  currentPrompt: string;
  onChange: (prompt: string) => void;
  agentName?: string;
  onClose?: () => void;
}

interface PromptVariable {
  name: string;
  description: string;
  defaultValue: string;
}

export function PromptWorkbench({ 
  currentPrompt, 
  onChange, 
  agentName,
  onClose 
}: PromptWorkbenchProps) {
  const [activeTab, setActiveTab] = useState('editor');
  const [prompt, setPrompt] = useState(currentPrompt);
  const [variables, setVariables] = useState<PromptVariable[]>([
    { name: 'agent_name', description: '智能体名称', defaultValue: agentName || 'AI助手' },
    { name: 'current_date', description: '当前日期', defaultValue: '{{current_date}}' },
    { name: 'user_name', description: '用户名称', defaultValue: '{{user_name}}' },
  ]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [securityIssues, setSecurityIssues] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // 应用变量替换
  const applyVariables = (text: string) => {
    let result = text;
    variables.forEach(v => {
      result = result.replace(new RegExp(`{{${v.name}}}`, 'g'), v.defaultValue);
    });
    return result;
  };

  // 复制到剪贴板
  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 安全扫描
  const handleSecurityScan = async () => {
    setIsAnalyzing(true);
    // 模拟扫描
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const issues: string[] = [];
    
    // 检查常见安全问题
    if (prompt.toLowerCase().includes('ignore previous')) {
      issues.push('检测到可能的注入绕过指令');
    }
    if (prompt.includes('{{') && !prompt.includes('}}')) {
      issues.push('变量占位符不完整');
    }
    if (prompt.length < 50) {
      issues.push('提示词过短，可能缺乏足够的指导');
    }
    if (!prompt.toLowerCase().includes('不要') && !prompt.toLowerCase().includes('禁止')) {
      issues.push('建议添加明确的行为限制');
    }
    
    setSecurityIssues(issues);
    setIsAnalyzing(false);
  };

  // 应用更改
  const handleApply = () => {
    onChange(prompt);
    onClose?.();
  };

  // 添加变量
  const addVariable = () => {
    setVariables([
      ...variables,
      { name: `var_${variables.length + 1}`, description: '新变量', defaultValue: '' },
    ]);
  };

  // 插入变量到提示词
  const insertVariable = (varName: string) => {
    const insertion = `{{${varName}}}`;
    setPrompt(prev => prev + insertion);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Prompt 工程工作台</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
          <Button size="sm" onClick={handleApply}>
            应用更改
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2 grid grid-cols-4">
          <TabsTrigger value="editor" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            编辑器
          </TabsTrigger>
          <TabsTrigger value="variables" className="text-xs">
            <Variable className="h-3 w-3 mr-1" />
            变量
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs">
            <History className="h-3 w-3 mr-1" />
            模板库
          </TabsTrigger>
          <TabsTrigger value="abtest" className="text-xs">
            <GitCompare className="h-3 w-3 mr-1" />
            A/B测试
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* 编辑器 */}
          <TabsContent value="editor" className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>系统提示词</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {prompt.length} 字符
                  </Badge>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleSecurityScan}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Shield className="h-3 w-3" />
                    )}
                    <span className="ml-1">安全扫描</span>
                  </Button>
                </div>
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="定义智能体的角色、行为规范和专业知识..."
                className="min-h-[300px] font-mono text-sm"
              />
            </div>

            {/* 安全问题提示 */}
            {securityIssues.length > 0 && (
              <Card className="border-yellow-500/50">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-yellow-600">
                    <Shield className="h-4 w-4" />
                    安全建议
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <ul className="space-y-1">
                    {securityIssues.map((issue, index) => (
                      <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-yellow-500">•</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* 预览 */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  变量替换预览
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 rounded bg-muted/50 text-sm whitespace-pre-wrap max-h-40 overflow-auto">
                  {applyVariables(prompt) || '输入提示词后查看预览...'}
                </div>
              </CardContent>
            </Card>

            {/* AI 优化建议 */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI 优化建议
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <SuggestionItem 
                    title="添加角色定义"
                    description="在开头明确定义智能体的角色和身份"
                    example="你是一位专业的客服助理，专注于帮助用户解决..."
                    onApply={(text) => setPrompt(text + '\n\n' + prompt)}
                  />
                  <SuggestionItem 
                    title="添加输出格式"
                    description="规定回复的格式和结构"
                    example="回复时请遵循以下格式：\n1. 先确认理解用户问题\n2. 给出解决方案\n3. 询问是否需要进一步帮助"
                    onApply={(text) => setPrompt(prompt + '\n\n' + text)}
                  />
                  <SuggestionItem 
                    title="添加边界限制"
                    description="明确智能体不应该做的事情"
                    example="禁止事项：\n- 不要讨论政治敏感话题\n- 不要提供医疗或法律建议\n- 不要分享虚假信息"
                    onApply={(text) => setPrompt(prompt + '\n\n' + text)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 变量管理 */}
          <TabsContent value="variables" className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">变量管理</h3>
                <p className="text-xs text-muted-foreground">使用 {'{{变量名}}'} 格式插入变量</p>
              </div>
              <Button size="sm" onClick={addVariable}>
                添加变量
              </Button>
            </div>

            <div className="space-y-2">
              {variables.map((variable, index) => (
                <Card key={index}>
                  <CardContent className="p-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">变量名</Label>
                        <Input 
                          value={variable.name}
                          onChange={(e) => {
                            const newVars = [...variables];
                            newVars[index].name = e.target.value;
                            setVariables(newVars);
                          }}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">描述</Label>
                        <Input 
                          value={variable.description}
                          onChange={(e) => {
                            const newVars = [...variables];
                            newVars[index].description = e.target.value;
                            setVariables(newVars);
                          }}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">默认值</Label>
                        <Input 
                          value={variable.defaultValue}
                          onChange={(e) => {
                            const newVars = [...variables];
                            newVars[index].defaultValue = e.target.value;
                            setVariables(newVars);
                          }}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="mt-2 h-7 text-xs"
                      onClick={() => insertVariable(variable.name)}
                    >
                      插入到提示词
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 模板库 */}
          <TabsContent value="templates" className="p-4">
            <PromptTemplates onSelect={(template) => setPrompt(template)} />
          </TabsContent>

          {/* A/B 测试 */}
          <TabsContent value="abtest" className="p-4">
            <PromptABTest 
              currentPrompt={prompt}
              agentName={agentName}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

// 建议项组件
function SuggestionItem({ 
  title, 
  description, 
  example,
  onApply,
}: { 
  title: string;
  description: string;
  example: string;
  onApply: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg p-2">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <ChevronDown className={cn(
          'h-4 w-4 transition-transform',
          expanded && 'rotate-180'
        )} />
      </div>
      {expanded && (
        <div className="mt-2 pt-2 border-t">
          <pre className="text-xs bg-muted/50 p-2 rounded mb-2 whitespace-pre-wrap">
            {example}
          </pre>
          <Button size="sm" variant="outline" onClick={() => onApply(example)}>
            应用建议
          </Button>
        </div>
      )}
    </div>
  );
}
