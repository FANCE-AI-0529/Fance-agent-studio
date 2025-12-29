import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  RotateCcw, 
  Save, 
  Sparkles, 
  Copy, 
  Check,
  Wand2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SystemPromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  agentName?: string;
  disabled?: boolean;
}

const promptTemplates = [
  {
    id: "assistant",
    name: "通用助手",
    description: "友好专业的通用AI助手",
    prompt: `你是一个友好、专业的AI助手。

## 核心原则
1. 提供准确、有帮助的回答
2. 保持友好和专业的语气
3. 必要时询问澄清问题
4. 承认不确定性或知识限制

## 回复风格
- 使用清晰简洁的语言
- 适当使用 Markdown 格式化
- 重要信息用列表或加粗突出`,
  },
  {
    id: "coder",
    name: "编程助手",
    description: "专注于代码和技术问题",
    prompt: `你是一个专业的编程助手，精通多种编程语言和技术栈。

## 核心能力
1. 代码编写和调试
2. 架构设计建议
3. 最佳实践推荐
4. 性能优化指导

## 回复要求
- 代码必须使用代码块包裹
- 解释关键逻辑和设计决策
- 提供可运行的完整示例
- 注意安全性和错误处理`,
  },
  {
    id: "analyst",
    name: "数据分析师",
    description: "数据分析和报告生成",
    prompt: `你是一个专业的数据分析师，擅长数据解读和可视化建议。

## 核心能力
1. 数据趋势分析
2. 统计指标解读
3. 可视化方案建议
4. 商业洞察提炼

## 回复要求
- 用数据支撑结论
- 提供可操作的建议
- 使用表格展示结构化数据
- 说明分析方法和假设`,
  },
  {
    id: "mplp",
    name: "MPLP Agent",
    description: "遵循MPLP协议的安全Agent",
    prompt: `你是运行在 Agent OS 平台上的智能助手，严格遵循 MPLP 协议。

## MPLP 权限级别
- 🟢 低风险 (read): 读取、查询 - 可直接执行
- 🟡 中风险 (write/network): 写入、外部调用 - 需确认
- 🔴 高风险 (execute/admin): 执行、删除、支付 - 需严格确认

## 工作原则
1. 安全第一：敏感操作前明确告知风险
2. 透明可控：说明将执行的操作和所需权限
3. 高效专业：给出简洁可操作的回复

## 回复格式
- 使用 Markdown 格式化
- 操作结果用 emoji 提示状态
- 涉及权限时列出所需权限`,
  },
];

export function SystemPromptEditor({ 
  value, 
  onChange, 
  agentName,
  disabled 
}: SystemPromptEditorProps) {
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [copied, setCopied] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalValue(value);
    setHasChanges(false);
  }, [value]);

  useEffect(() => {
    setHasChanges(localValue !== value);
  }, [localValue, value]);

  const handleSave = () => {
    if (localValue.trim().length < 10) {
      toast.error("提示词太短，请至少输入10个字符");
      return;
    }
    if (localValue.length > 4000) {
      toast.error("提示词过长，请控制在4000字符以内");
      return;
    }
    onChange(localValue);
    toast.success("System Prompt 已保存");
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalValue(value);
    setHasChanges(false);
  };

  const handleApplyTemplate = (template: typeof promptTemplates[0]) => {
    setLocalValue(template.prompt);
    toast.success(`已应用「${template.name}」模板`);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(localValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("已复制到剪贴板");
  };

  const charCount = localValue.length;
  const isOverLimit = charCount > 4000;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 gap-1.5 text-xs"
          disabled={disabled}
        >
          <FileText className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">System Prompt</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            System Prompt 编辑器
          </SheetTitle>
          <SheetDescription>
            自定义 {agentName || "Agent"} 的行为和回复风格
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 flex flex-col gap-4 py-4 overflow-hidden">
          {/* Templates */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              快速模板
            </Label>
            <div className="flex flex-wrap gap-2">
              {promptTemplates.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleApplyTemplate(template)}
                >
                  <Sparkles className="h-3 w-3" />
                  {template.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="system-prompt" className="text-sm font-medium">
                提示词内容
              </Label>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs",
                  isOverLimit ? "text-destructive" : "text-muted-foreground"
                )}>
                  {charCount} / 4000
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1 border rounded-lg">
              <Textarea
                id="system-prompt"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                placeholder="输入 System Prompt，定义 Agent 的行为、风格和能力..."
                className="min-h-[300px] border-0 resize-none font-mono text-sm focus-visible:ring-0"
              />
            </ScrollArea>
          </div>

          {/* Tips */}
          <div className="bg-secondary/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">💡 提示词编写技巧：</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>明确定义 Agent 的角色和身份</li>
              <li>列出核心能力和限制条件</li>
              <li>规定回复的格式和风格</li>
              <li>使用 Markdown 格式让提示词更清晰</li>
            </ul>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 sm:justify-between">
          <div className="flex gap-2">
            {hasChanges && (
              <Badge variant="secondary" className="text-xs">
                有未保存的更改
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!hasChanges}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              重置
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || isOverLimit}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              保存
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
