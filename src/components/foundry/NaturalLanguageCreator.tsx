import { useState } from "react";
import {
  Sparkles,
  Loader2,
  Send,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Wand2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface NaturalLanguageCreatorProps {
  onGenerated: (files: {
    skillMd: string;
    handlerPy: string;
    configYaml: string;
  }, skillName: string) => void;
}

const examplePrompts = [
  "帮我创建一个能够读取 PDF 文件并提取要点的能力",
  "我需要一个可以翻译多国语言的能力",
  "创建一个能分析用户情绪的能力",
  "做一个自动生成周报的能力",
  "我想要一个可以处理Excel表格的能力",
];

const creationSteps = [
  { id: "describe", label: "描述需求" },
  { id: "analyzing", label: "AI分析中" },
  { id: "generating", label: "生成能力" },
  { id: "complete", label: "完成" },
];

export function NaturalLanguageCreator({ onGenerated }: NaturalLanguageCreatorProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("describe");
  const [analysisResult, setAnalysisResult] = useState<{
    name: string;
    description: string;
    capabilities: string[];
    inputs: string[];
    outputs: string[];
  } | null>(null);

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "请输入描述",
        description: "告诉我你想要什么样的能力",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setCurrentStep("analyzing");

    try {
      // 模拟分析过程
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 分析用户需求，提取关键信息
      const mockAnalysis = {
        name: extractSkillName(prompt),
        description: prompt,
        capabilities: extractCapabilities(prompt),
        inputs: ["text: 用户输入的内容"],
        outputs: ["result: 处理后的结果"],
      };
      setAnalysisResult(mockAnalysis);
      setCurrentStep("generating");

      // 调用AI生成
      const { data, error: fnError } = await supabase.functions.invoke(
        "generate-skill-template",
        {
          body: {
            description: prompt.trim(),
            category: guessCategory(prompt),
            difficulty: "intermediate",
          },
        }
      );

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      if (data?.skillMd && data?.handlerPy && data?.configYaml) {
        const nameMatch = data.skillMd.match(/name:\s*["']?([^"'\n]+)["']?/);
        const skillName = nameMatch ? nameMatch[1].trim() : mockAnalysis.name;

        setCurrentStep("complete");
        
        setTimeout(() => {
          onGenerated(
            {
              skillMd: data.skillMd,
              handlerPy: data.handlerPy,
              configYaml: data.configYaml,
            },
            skillName
          );

          toast({
            title: "能力创建成功！",
            description: `「${skillName}」已准备就绪`,
          });

          // 重置状态
          setPrompt("");
          setCurrentStep("describe");
          setAnalysisResult(null);
        }, 500);
      } else {
        throw new Error("生成失败，请重试");
      }
    } catch (err) {
      console.error("Generate error:", err);
      toast({
        title: "生成失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
      setCurrentStep("describe");
      setAnalysisResult(null);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部标题 */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Wand2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">用自然语言创建能力</h2>
            <p className="text-sm text-muted-foreground">
              描述你想要的功能，AI 帮你实现
            </p>
          </div>
        </div>

        {/* 进度指示器 */}
        {isGenerating && (
          <div className="flex items-center gap-2 mt-4">
            {creationSteps.map((step, index) => {
              const isActive = step.id === currentStep;
              const isPast = creationSteps.findIndex(s => s.id === currentStep) > index;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    isActive && "bg-primary text-primary-foreground",
                    isPast && "bg-primary/20 text-primary",
                    !isActive && !isPast && "bg-muted text-muted-foreground"
                  )}>
                    {isPast && <CheckCircle2 className="h-3 w-3" />}
                    {isActive && <Loader2 className="h-3 w-3 animate-spin" />}
                    {step.label}
                  </div>
                  {index < creationSteps.length - 1 && (
                    <ArrowRight className="h-4 w-4 mx-1 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 主内容区 */}
      <div className="flex-1 p-6 overflow-auto">
        {/* 分析结果展示 */}
        {analysisResult && isGenerating && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="pt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                AI 理解的需求
              </h4>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">能力名称：</span>
                  <span className="font-medium">{analysisResult.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">主要功能：</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {analysisResult.capabilities.map((cap, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {cap}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 输入区 */}
        <div className="space-y-4">
          <div className="relative">
            <Textarea
              placeholder="描述你想要的能力，例如：我需要一个可以自动整理会议纪要的能力..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="resize-none pr-12 text-base"
              disabled={isGenerating}
            />
            <Button
              size="icon"
              className="absolute right-2 bottom-2"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* 示例提示 */}
          {!isGenerating && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                试试这些例子：
              </p>
              <div className="flex flex-wrap gap-2">
                {examplePrompts.map((example, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs h-auto py-1.5 px-3"
                    onClick={() => handleExampleClick(example)}
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 常见问题 */}
        {!isGenerating && (
          <div className="mt-8">
            <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              创建技巧
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TipCard
                icon={<Sparkles className="h-4 w-4" />}
                title="描述清晰"
                description="详细说明输入是什么、期望的输出是什么"
              />
              <TipCard
                icon={<CheckCircle2 className="h-4 w-4" />}
                title="举例说明"
                description="给出具体的使用场景示例效果更好"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TipCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="text-primary">{icon}</div>
          <div>
            <h5 className="font-medium text-sm">{title}</h5>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 辅助函数
function extractSkillName(prompt: string): string {
  const patterns = [
    /创建一个(.+?)的能力/,
    /做一个(.+?)的能力/,
    /我需要(.+?)的能力/,
    /能够(.+?)的能力/,
  ];
  
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match) {
      return match[1].slice(0, 10) + "能力";
    }
  }
  return "自定义能力";
}

function extractCapabilities(prompt: string): string[] {
  const capabilities: string[] = [];
  const keywords = ["读取", "分析", "生成", "翻译", "处理", "提取", "总结", "转换"];
  
  for (const keyword of keywords) {
    if (prompt.includes(keyword)) {
      capabilities.push(keyword);
    }
  }
  
  return capabilities.length > 0 ? capabilities : ["智能处理"];
}

function guessCategory(prompt: string): string {
  if (prompt.includes("翻译") || prompt.includes("语言")) return "nlp";
  if (prompt.includes("数据") || prompt.includes("表格") || prompt.includes("Excel")) return "data";
  if (prompt.includes("搜索") || prompt.includes("检索")) return "integration";
  if (prompt.includes("自动") || prompt.includes("报告")) return "automation";
  return "nlp";
}
