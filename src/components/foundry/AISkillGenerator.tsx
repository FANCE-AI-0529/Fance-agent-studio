import { useState } from "react";
import { Sparkles, Loader2, Wand2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AISkillGeneratorProps {
  onGenerated: (files: {
    skillMd: string;
    handlerPy: string;
    configYaml: string;
  }, skillName: string) => void;
  trigger?: React.ReactNode;
}

const categories = [
  { value: "nlp", label: "自然语言处理" },
  { value: "data", label: "数据处理" },
  { value: "integration", label: "系统集成" },
  { value: "automation", label: "自动化" },
  { value: "analysis", label: "分析与洞察" },
  { value: "utility", label: "实用工具" },
];

const difficulties = [
  { value: "beginner", label: "初级 - 简单功能" },
  { value: "intermediate", label: "中级 - 标准功能" },
  { value: "advanced", label: "高级 - 复杂功能" },
];

export function AISkillGenerator({ onGenerated, trigger }: AISkillGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("nlp");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError("请输入技能描述");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "generate-skill-template",
        {
          body: {
            description: description.trim(),
            category,
            difficulty,
          },
        }
      );

      if (fnError) {
        throw fnError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.skillMd && data?.handlerPy && data?.configYaml) {
        // Clean up generated content - trim leading/trailing whitespace
        let cleanedSkillMd = (data.skillMd as string).trim();
        const cleanedHandlerPy = (data.handlerPy as string).trim();
        const cleanedConfigYaml = (data.configYaml as string).trim();

        // Ensure skillMd starts with YAML frontmatter
        if (!cleanedSkillMd.startsWith("---")) {
          cleanedSkillMd = "---\n" + cleanedSkillMd;
        }

        // Extract skill name from the generated SKILL.md
        const nameMatch = cleanedSkillMd.match(/name:\s*["']?([^"'\n]+)["']?/);
        const skillName = nameMatch ? nameMatch[1].trim() : "ai-generated-skill";

        onGenerated(
          {
            skillMd: cleanedSkillMd,
            handlerPy: cleanedHandlerPy,
            configYaml: cleanedConfigYaml,
          },
          skillName
        );

        toast({
          title: "技能生成成功",
          description: `已生成 "${skillName}" 技能模板`,
        });

        setOpen(false);
        setDescription("");
      } else {
        throw new Error("生成的内容格式不正确");
      }
    } catch (err) {
      console.error("Generate skill error:", err);
      const message = err instanceof Error ? err.message : "生成失败，请重试";
      setError(message);
      toast({
        title: "生成失败",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI 生成
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            AI 技能生成器
          </DialogTitle>
          <DialogDescription>
            描述你想要的技能功能，AI 将自动生成完整的技能代码模板
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">技能描述 *</Label>
            <Textarea
              id="description"
              placeholder="例如：创建一个能够分析用户情绪的技能，接收文本输入并返回情绪分类（积极/消极/中性）和置信度评分..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              详细描述技能的功能、输入输出和使用场景
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>技能类别</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>复杂度</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {difficulties.map((diff) => (
                    <SelectItem key={diff.value} value={diff.value}>
                      {diff.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !description.trim()}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  生成技能
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
