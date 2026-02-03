import React, { useState, useCallback, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Terminal,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Maximize2,
  Minimize2,
  Copy,
  Settings,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

/**
 * Skill Preview Sandbox
 * 技能即时预览沙盒 - 嵌入式技能测试组件
 */

// ========== Types ==========

interface SkillInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  default?: unknown;
}

interface SkillOutput {
  name: string;
  type: string;
  description?: string;
}

interface SkillMetadata {
  name: string;
  version?: string;
  description?: string;
  inputs?: SkillInput[];
  outputs?: SkillOutput[];
}

interface ExecutionResult {
  success: boolean;
  output: Record<string, unknown>;
  logs: string[];
  duration: number;
  error?: string;
  timestamp: number;
}

interface SkillPreviewSandboxProps {
  metadata: SkillMetadata | null;
  onExecute?: (inputs: Record<string, unknown>) => Promise<ExecutionResult>;
  isEmbedded?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

// ========== Component ==========

export function SkillPreviewSandbox({
  metadata,
  onExecute,
  isEmbedded = true,
  defaultExpanded = false,
  className,
}: SkillPreviewSandboxProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isRunning, setIsRunning] = useState(false);
  const [inputValues, setInputValues] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'output'>('input');

  // Initialize input values when metadata changes
  useEffect(() => {
    if (metadata?.inputs) {
      const initial: Record<string, unknown> = {};
      metadata.inputs.forEach((input) => {
        if (input.default !== undefined) {
          initial[input.name] = input.default;
        } else {
          switch (input.type) {
            case 'string': initial[input.name] = ''; break;
            case 'number': initial[input.name] = 0; break;
            case 'boolean': initial[input.name] = false; break;
            case 'array': initial[input.name] = []; break;
            case 'object': initial[input.name] = {}; break;
          }
        }
      });
      setInputValues(initial);
    }
  }, [metadata]);

  // Auto-run when inputs change (if enabled)
  useEffect(() => {
    if (autoRun && metadata && Object.keys(inputValues).length > 0) {
      const timer = setTimeout(() => handleRun(), 500);
      return () => clearTimeout(timer);
    }
  }, [inputValues, autoRun]);

  const handleInputChange = useCallback((name: string, value: unknown) => {
    setInputValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleRun = useCallback(async () => {
    if (!metadata || isRunning) return;

    setIsRunning(true);
    setResult(null);
    setActiveTab('output');

    try {
      if (onExecute) {
        const execResult = await onExecute(inputValues);
        setResult(execResult);
      } else {
        // Simulated execution
        await simulateExecution();
      }
    } catch (error) {
      setResult({
        success: false,
        output: {},
        logs: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        duration: 0,
        error: error instanceof Error ? error.message : 'Execution failed',
        timestamp: Date.now(),
      });
    } finally {
      setIsRunning(false);
    }
  }, [metadata, inputValues, isRunning, onExecute]);

  const simulateExecution = async (): Promise<void> => {
    const startTime = Date.now();
    const logs: string[] = [];

    logs.push(`[${new Date().toISOString()}] 开始执行技能: ${metadata?.name}`);
    await new Promise((r) => setTimeout(r, 300));
    
    logs.push(`[${new Date().toISOString()}] 验证输入参数...`);
    await new Promise((r) => setTimeout(r, 200));
    
    logs.push(`[${new Date().toISOString()}] 执行技能逻辑...`);
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));

    // Generate mock output
    const mockOutput: Record<string, unknown> = {};
    metadata?.outputs?.forEach((output) => {
      switch (output.type) {
        case 'string':
          mockOutput[output.name] = `模拟输出: ${output.name}`;
          break;
        case 'number':
          mockOutput[output.name] = Math.floor(Math.random() * 100);
          break;
        case 'boolean':
          mockOutput[output.name] = Math.random() > 0.5;
          break;
        case 'array':
          mockOutput[output.name] = ['item_1', 'item_2'];
          break;
        default:
          mockOutput[output.name] = { status: 'success', input: inputValues };
      }
    });

    const duration = Date.now() - startTime;
    logs.push(`[${new Date().toISOString()}] 执行完成，耗时 ${duration}ms`);

    setResult({
      success: true,
      output: mockOutput,
      logs,
      duration,
      timestamp: Date.now(),
    });
  };

  const handleReset = useCallback(() => {
    setResult(null);
    setActiveTab('input');
    if (metadata?.inputs) {
      const initial: Record<string, unknown> = {};
      metadata.inputs.forEach((input) => {
        initial[input.name] = input.default ?? '';
      });
      setInputValues(initial);
    }
  }, [metadata]);

  const copyOutput = useCallback(() => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result.output, null, 2));
      toast({ title: "已复制", description: "输出已复制到剪贴板" });
    }
  }, [result]);

  if (!metadata) {
    return (
      <div className={cn(
        "rounded-lg border border-dashed border-border/50 bg-muted/20 p-4",
        "flex items-center justify-center",
        className
      )}>
        <p className="text-xs text-muted-foreground">定义技能元数据后可预览</p>
      </div>
    );
  }

  // Collapsed view (embedded mode)
  if (isEmbedded && !isExpanded) {
    return (
      <motion.div
        layout
        className={cn(
          "rounded-lg border border-border/50 bg-card/50 overflow-hidden",
          className
        )}
      >
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">即时预览</span>
            {result && (
              <Badge 
                variant={result.success ? "secondary" : "destructive"}
                className="text-[10px] h-4"
              >
                {result.success ? '成功' : '失败'}
              </Badge>
            )}
          </div>
          <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      className={cn(
        "rounded-xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden",
        "flex flex-col",
        isEmbedded ? "max-h-80" : "h-full",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{metadata.name}</span>
          {metadata.version && (
            <Badge variant="outline" className="text-[10px] h-4">
              v{metadata.version}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Switch
              id="auto-run"
              checked={autoRun}
              onCheckedChange={setAutoRun}
              className="scale-75"
            />
            <Label htmlFor="auto-run" className="text-[10px] text-muted-foreground">
              自动运行
            </Label>
          </div>
          {isEmbedded && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(false)}
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'input' | 'output')} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-transparent h-8 px-2">
          <TabsTrigger value="input" className="text-xs h-7 data-[state=active]:bg-muted">
            输入参数
          </TabsTrigger>
          <TabsTrigger value="output" className="text-xs h-7 data-[state=active]:bg-muted">
            执行结果
            {result && (
              <span className={cn(
                "ml-1.5 w-1.5 h-1.5 rounded-full",
                result.success ? "bg-green-500" : "bg-red-500"
              )} />
            )}
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent value="input" className="h-full m-0">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-3">
                {metadata.inputs && metadata.inputs.length > 0 ? (
                  metadata.inputs.map((input) => (
                    <QuickInputField
                      key={input.name}
                      input={input}
                      value={inputValues[input.name]}
                      onChange={(v) => handleInputChange(input.name, v)}
                    />
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    此技能无输入参数
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="output" className="h-full m-0">
            <ScrollArea className="h-full">
              <div className="p-3">
                <AnimatePresence mode="wait">
                  {isRunning ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-8"
                    >
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                      <p className="text-xs text-muted-foreground">执行中...</p>
                    </motion.div>
                  ) : result ? (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      {/* Status */}
                      <div className={cn(
                        "flex items-center justify-between p-2 rounded-lg",
                        result.success 
                          ? "bg-green-500/10 border border-green-500/20" 
                          : "bg-red-500/10 border border-red-500/20"
                      )}>
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className={cn(
                            "text-sm font-medium",
                            result.success ? "text-green-500" : "text-red-500"
                          )}>
                            {result.success ? '执行成功' : '执行失败'}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          <Clock className="h-3 w-3 mr-1" />
                          {result.duration}ms
                        </Badge>
                      </div>

                      {/* Error */}
                      {result.error && (
                        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                          <p className="text-xs text-red-400 font-mono">{result.error}</p>
                        </div>
                      )}

                      {/* Output */}
                      {Object.keys(result.output).length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-muted-foreground uppercase">
                              输出数据
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={copyOutput}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <pre className="p-2 rounded-lg bg-muted/50 text-[10px] font-mono overflow-auto max-h-32">
                            {JSON.stringify(result.output, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Logs */}
                      {result.logs.length > 0 && (
                        <button
                          onClick={() => setShowLogs(!showLogs)}
                          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          {showLogs ? '隐藏日志' : '查看日志'} ({result.logs.length})
                        </button>
                      )}
                      {showLogs && (
                        <div className="p-2 rounded-lg bg-muted/30 text-[9px] font-mono space-y-0.5 max-h-24 overflow-auto">
                          {result.logs.map((log, i) => (
                            <div key={i} className="text-muted-foreground">{log}</div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-8"
                    >
                      <Zap className="h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-xs text-muted-foreground">点击运行查看结果</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 bg-muted/20">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleReset}
        >
          <RotateCcw className="h-3 w-3" />
          重置
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleRun}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              执行中
            </>
          ) : (
            <>
              <Play className="h-3 w-3" />
              运行
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

// ========== Quick Input Field ==========

interface QuickInputFieldProps {
  input: SkillInput;
  value: unknown;
  onChange: (value: unknown) => void;
}

function QuickInputField({ input, value, onChange }: QuickInputFieldProps) {
  const handleChange = (rawValue: string) => {
    switch (input.type) {
      case 'number':
        onChange(parseFloat(rawValue) || 0);
        break;
      case 'boolean':
        onChange(rawValue === 'true');
        break;
      case 'object':
      case 'array':
        try {
          onChange(JSON.parse(rawValue));
        } catch {
          onChange(rawValue);
        }
        break;
      default:
        onChange(rawValue);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Label className="text-[10px] font-medium">
          {input.name}
          {input.required && <span className="text-red-400 ml-0.5">*</span>}
        </Label>
        <Badge variant="outline" className="text-[9px] h-4 px-1">
          {input.type}
        </Badge>
      </div>
      {input.type === 'boolean' ? (
        <div className="flex items-center gap-2">
          <Switch
            checked={!!value}
            onCheckedChange={(checked) => onChange(checked)}
          />
          <span className="text-xs text-muted-foreground">
            {value ? 'true' : 'false'}
          </span>
        </div>
      ) : input.type === 'object' || input.type === 'array' ? (
        <Textarea
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={(e) => handleChange(e.target.value)}
          className="text-xs font-mono min-h-[48px] resize-none"
          placeholder={`Enter ${input.type}...`}
        />
      ) : (
        <input
          type={input.type === 'number' ? 'number' : 'text'}
          value={String(value ?? '')}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full h-7 px-2 text-xs rounded-md border border-input bg-background"
          placeholder={input.description || `Enter ${input.name}`}
        />
      )}
    </div>
  );
}

export default SkillPreviewSandbox;
