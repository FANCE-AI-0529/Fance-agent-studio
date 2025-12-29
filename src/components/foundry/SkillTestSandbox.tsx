import { useState, useEffect } from "react";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Terminal,
  RotateCcw,
  Copy,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { SkillMetadata } from "./SkillValidator";

interface InputParam {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  default?: any;
}

interface TestResult {
  success: boolean;
  output: Record<string, any>;
  executionTime: number;
  logs: string[];
  error?: string;
}

interface SkillTestSandboxProps {
  metadata: SkillMetadata | null;
  trigger: React.ReactNode;
}

export function SkillTestSandbox({ metadata, trigger }: SkillTestSandboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValues, setInputValues] = useState<Record<string, any>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<TestResult[]>([]);

  // Initialize input values when metadata changes
  useEffect(() => {
    if (metadata?.inputs) {
      const initialValues: Record<string, any> = {};
      metadata.inputs.forEach((input) => {
        const inputWithDefault = input as InputParam;
        if (inputWithDefault.default !== undefined) {
          initialValues[input.name] = inputWithDefault.default;
        } else {
          // Set default values based on type
          switch (input.type) {
            case "string":
              initialValues[input.name] = "";
              break;
            case "number":
              initialValues[input.name] = 0;
              break;
            case "boolean":
              initialValues[input.name] = false;
              break;
            case "array":
              initialValues[input.name] = [];
              break;
            case "object":
              initialValues[input.name] = {};
              break;
            default:
              initialValues[input.name] = "";
          }
        }
      });
      setInputValues(initialValues);
    }
  }, [metadata]);

  const handleInputChange = (name: string, value: any, type: string) => {
    let processedValue = value;
    
    // Convert value based on type
    if (type === "number") {
      processedValue = parseFloat(value) || 0;
    } else if (type === "boolean") {
      processedValue = value;
    } else if (type === "array" || type === "object") {
      try {
        processedValue = JSON.parse(value);
      } catch {
        processedValue = value;
      }
    }
    
    setInputValues((prev) => ({ ...prev, [name]: processedValue }));
  };

  const simulateExecution = async () => {
    setIsRunning(true);
    setResult(null);

    // Simulate execution delay
    const startTime = Date.now();
    const logs: string[] = [];

    logs.push(`[${new Date().toISOString()}] 开始执行技能: ${metadata?.name}`);
    logs.push(`[${new Date().toISOString()}] 输入参数: ${JSON.stringify(inputValues, null, 2)}`);

    // Simulate some processing
    await new Promise((resolve) => setTimeout(resolve, 500));
    logs.push(`[${new Date().toISOString()}] 验证输入参数...`);

    // Validate required inputs
    const missingRequired = metadata?.inputs?.filter(
      (input) => input.required && !inputValues[input.name]
    );

    if (missingRequired && missingRequired.length > 0) {
      const executionTime = Date.now() - startTime;
      logs.push(`[${new Date().toISOString()}] 错误: 缺少必填参数`);
      
      const errorResult: TestResult = {
        success: false,
        output: {},
        executionTime,
        logs,
        error: `缺少必填参数: ${missingRequired.map((i) => i.name).join(", ")}`,
      };
      
      setResult(errorResult);
      setExecutionHistory((prev) => [errorResult, ...prev].slice(0, 10));
      setIsRunning(false);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
    logs.push(`[${new Date().toISOString()}] 参数验证通过`);

    // Simulate processing based on skill type
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));
    logs.push(`[${new Date().toISOString()}] 执行技能逻辑...`);

    // Generate mock output based on metadata outputs
    const mockOutput: Record<string, any> = {};
    
    if (metadata?.outputs) {
      metadata.outputs.forEach((output) => {
        switch (output.type) {
          case "string":
            mockOutput[output.name] = `模拟输出: ${output.name} - 基于输入 "${JSON.stringify(inputValues).slice(0, 50)}..."`;
            break;
          case "number":
            mockOutput[output.name] = Math.floor(Math.random() * 100);
            break;
          case "boolean":
            mockOutput[output.name] = Math.random() > 0.5;
            break;
          case "array":
            mockOutput[output.name] = ["result_1", "result_2", "result_3"];
            break;
          case "object":
            mockOutput[output.name] = { status: "success", data: inputValues };
            break;
          default:
            mockOutput[output.name] = `模拟结果`;
        }
      });
    }

    const executionTime = Date.now() - startTime;
    logs.push(`[${new Date().toISOString()}] 执行完成，耗时 ${executionTime}ms`);

    const successResult: TestResult = {
      success: true,
      output: mockOutput,
      executionTime,
      logs,
    };

    setResult(successResult);
    setExecutionHistory((prev) => [successResult, ...prev].slice(0, 10));
    setIsRunning(false);

    toast({
      title: "执行完成",
      description: `技能执行成功，耗时 ${executionTime}ms`,
    });
  };

  const resetInputs = () => {
    if (metadata?.inputs) {
      const initialValues: Record<string, any> = {};
      metadata.inputs.forEach((input) => {
        const inputWithDefault = input as InputParam;
        initialValues[input.name] = inputWithDefault.default ?? "";
      });
      setInputValues(initialValues);
    }
    setResult(null);
  };

  const copyOutput = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result.output, null, 2));
      toast({
        title: "已复制",
        description: "输出结果已复制到剪贴板",
      });
    }
  };

  const renderInputField = (input: InputParam) => {
    const value = inputValues[input.name];

    switch (input.type) {
      case "boolean":
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={!!value}
              onCheckedChange={(checked) =>
                handleInputChange(input.name, checked, input.type)
              }
            />
            <Label className="text-xs">{value ? "true" : "false"}</Label>
          </div>
        );
      case "number":
        return (
          <Input
            type="number"
            value={value ?? ""}
            onChange={(e) =>
              handleInputChange(input.name, e.target.value, input.type)
            }
            className="h-8 text-sm font-mono"
            placeholder={`输入 ${input.type} 类型值`}
          />
        );
      case "array":
      case "object":
        return (
          <Textarea
            value={
              typeof value === "string" ? value : JSON.stringify(value, null, 2)
            }
            onChange={(e) =>
              handleInputChange(input.name, e.target.value, input.type)
            }
            className="text-sm font-mono min-h-[60px]"
            placeholder={`输入 JSON ${input.type === "array" ? "数组" : "对象"}`}
          />
        );
      default:
        return (
          <Input
            value={value ?? ""}
            onChange={(e) =>
              handleInputChange(input.name, e.target.value, input.type)
            }
            className="h-8 text-sm"
            placeholder={input.description || `输入 ${input.name}`}
          />
        );
    }
  };

  if (!metadata) {
    return (
      <Dialog>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>测试沙箱</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            请先创建有效的技能元数据
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            技能测试沙箱
            <Badge variant="outline" className="ml-2">
              {metadata.name} v{metadata.version || "1.0.0"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4">
          {/* Left: Inputs */}
          <div className="w-1/2 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-primary" />
                输入参数
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={resetInputs}
              >
                <RotateCcw className="h-3 w-3" />
                重置
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-4">
                {metadata.inputs && metadata.inputs.length > 0 ? (
                  metadata.inputs.map((input) => (
                    <div key={input.name} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-medium">
                          {input.name}
                          {input.required && (
                            <span className="text-destructive ml-0.5">*</span>
                          )}
                        </Label>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {input.type}
                        </Badge>
                      </div>
                      {input.description && (
                        <p className="text-[10px] text-muted-foreground">
                          {input.description}
                        </p>
                      )}
                      {renderInputField(input)}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    此技能没有定义输入参数
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="pt-4 mt-4 border-t border-border">
              <Button
                className="w-full gap-2"
                onClick={simulateExecution}
                disabled={isRunning}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    执行中...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    运行测试
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right: Results */}
          <div className="w-1/2 flex flex-col min-h-0 border-l border-border pl-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">执行结果</h3>
              {result && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={copyOutput}
                >
                  <Copy className="h-3 w-3" />
                  复制
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1">
              {result ? (
                <div className="space-y-4 pr-4">
                  {/* Status */}
                  <div
                    className={`p-3 rounded-lg border ${
                      result.success
                        ? "bg-status-executing/10 border-status-executing/20"
                        : "bg-destructive/10 border-destructive/20"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle2 className="h-4 w-4 text-status-executing" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          result.success
                            ? "text-status-executing"
                            : "text-destructive"
                        }`}
                      >
                        {result.success ? "执行成功" : "执行失败"}
                      </span>
                      <Badge variant="secondary" className="ml-auto text-[10px]">
                        <Clock className="h-3 w-3 mr-1" />
                        {result.executionTime}ms
                      </Badge>
                    </div>
                    {result.error && (
                      <p className="mt-2 text-xs text-destructive">
                        {result.error}
                      </p>
                    )}
                  </div>

                  {/* Output */}
                  {result.success && Object.keys(result.output).length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        输出数据
                      </label>
                      <div className="p-3 rounded-lg border border-border bg-secondary/30">
                        <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(result.output, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Logs */}
                  <Collapsible open={showLogs} onOpenChange={setShowLogs}>
                    <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                      {showLogs ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                      执行日志 ({result.logs.length})
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 p-2 rounded border border-border bg-card font-mono text-[10px] space-y-0.5 max-h-40 overflow-y-auto">
                        {result.logs.map((log, i) => (
                          <div key={i} className="text-muted-foreground">
                            {log}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  <div className="text-center">
                    <Terminal className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>点击"运行测试"开始执行</p>
                    <p className="text-xs mt-1">结果将在此处显示</p>
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Execution History */}
            {executionHistory.length > 1 && (
              <div className="pt-3 mt-3 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>历史记录:</span>
                  {executionHistory.slice(0, 5).map((hist, i) => (
                    <Badge
                      key={i}
                      variant={hist.success ? "secondary" : "destructive"}
                      className="text-[10px] px-1.5 py-0 cursor-pointer"
                      onClick={() => setResult(hist)}
                    >
                      {hist.success ? "✓" : "✗"} {hist.executionTime}ms
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
