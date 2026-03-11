import { useState } from "react";
import { Button } from "../ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card.tsx";
import { Checkbox } from "../ui/checkbox.tsx";
import { Label } from "../ui/label.tsx";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group.tsx";
import { Separator } from "../ui/separator.tsx";
import { Progress } from "../ui/progress.tsx";
import { 
  Download, 
  FileJson, 
  FileText, 
  Bot, 
  MessageSquare, 
  Database,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../../integrations/supabase/client.ts";
import { useAuth } from "../../contexts/AuthContext.tsx";
import { useToast } from "../../hooks/use-toast.ts";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

type ExportFormat = "json" | "markdown";
type ExportStatus = "idle" | "exporting" | "success" | "error";

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: "agents",
    label: "智能体配置",
    description: "导出所有智能体的配置、技能和提示词",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    id: "conversations",
    label: "对话历史",
    description: "导出与智能体的所有对话记录",
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    id: "knowledge",
    label: "知识库",
    description: "导出知识库元数据（不含原始文档）",
    icon: <Database className="h-4 w-4" />,
  },
];

export function DataExportForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedOptions, setSelectedOptions] = useState<string[]>(["agents"]);
  const [format, setFormat] = useState<ExportFormat>("json");
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const handleOptionChange = (optionId: string, checked: boolean) => {
    if (checked) {
      setSelectedOptions(prev => [...prev, optionId]);
    } else {
      setSelectedOptions(prev => prev.filter(id => id !== optionId));
    }
  };

  const exportData = async () => {
    if (!user || selectedOptions.length === 0) return;

    setStatus("exporting");
    setProgress(0);
    setErrorMessage("");

    try {
      const exportData: Record<string, any> = {
        exportedAt: new Date().toISOString(),
        userId: user.id,
        email: user.email,
      };

      const progressStep = 100 / selectedOptions.length;
      let currentProgress = 0;

      // Export agents
      if (selectedOptions.includes("agents")) {
        const { data: agents, error } = await supabase
          .from("agents")
          .select(`
            *,
            agent_skills (skill_id, skills (name, description, category)),
            agent_graph_nodes (*),
            agent_graph_edges (*)
          `)
          .eq("author_id", user.id);

        if (error) throw error;
        exportData.agents = agents;
        currentProgress += progressStep;
        setProgress(currentProgress);
      }

      // Export conversations
      if (selectedOptions.includes("conversations")) {
        const { data: sessions, error } = await supabase
          .from("sessions")
          .select(`
            id,
            agent_id,
            scenario_id,
            created_at,
            updated_at,
            messages (
              id,
              role,
              content,
              created_at
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        exportData.conversations = sessions;
        currentProgress += progressStep;
        setProgress(currentProgress);
      }

      // Export knowledge bases
      if (selectedOptions.includes("knowledge")) {
        const { data: knowledgeBases, error } = await supabase
          .from("knowledge_bases")
          .select(`
            id,
            name,
            description,
            intent_tags,
            documents_count,
            chunks_count,
            created_at,
            knowledge_documents (
              id,
              name,
              file_type,
              file_size,
              chunks_count,
              created_at
            )
          `)
          .eq("user_id", user.id);

        if (error) throw error;
        exportData.knowledgeBases = knowledgeBases;
        currentProgress += progressStep;
        setProgress(currentProgress);
      }

      setProgress(100);

      // Generate file content
      let fileContent: string;
      let fileName: string;
      let mimeType: string;

      if (format === "json") {
        fileContent = JSON.stringify(exportData, null, 2);
        fileName = `agent-os-export-${format}-${Date.now()}.json`;
        mimeType = "application/json";
      } else {
        // Markdown format
        fileContent = generateMarkdown(exportData);
        fileName = `agent-os-export-${format}-${Date.now()}.md`;
        mimeType = "text/markdown";
      }

      // Download file
      const blob = new Blob([fileContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus("success");
      toast({
        title: "导出成功",
        description: `数据已导出为 ${fileName}`,
      });

      // Reset after 3 seconds
      setTimeout(() => {
        setStatus("idle");
        setProgress(0);
      }, 3000);

    } catch (error: Error) {
      console.error("Export error:", error);
      setStatus("error");
      setErrorMessage(error.message || "导出失败");
      toast({
        title: "导出失败",
        description: error.message || "请稍后重试",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Download className="h-5 w-5 text-primary" />
          数据导出
        </CardTitle>
        <CardDescription>
          导出您的智能体配置、对话历史和知识库数据
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Options */}
        <div className="space-y-3">
          <Label>选择导出内容</Label>
          {EXPORT_OPTIONS.map((option) => (
            <div
              key={option.id}
              className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                id={option.id}
                checked={selectedOptions.includes(option.id)}
                onCheckedChange={(checked) => 
                  handleOptionChange(option.id, checked as boolean)
                }
              />
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor={option.id}
                  className="flex items-center gap-2 cursor-pointer font-medium"
                >
                  {option.icon}
                  {option.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Format Selection */}
        <div className="space-y-3">
          <Label>导出格式</Label>
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="json" id="format-json" />
              <Label htmlFor="format-json" className="flex items-center gap-2 cursor-pointer">
                <FileJson className="h-4 w-4" />
                JSON（结构化数据）
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="markdown" id="format-markdown" />
              <Label htmlFor="format-markdown" className="flex items-center gap-2 cursor-pointer">
                <FileText className="h-4 w-4" />
                Markdown（可读文档）
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Progress & Status */}
        {status === "exporting" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在导出...
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {status === "success" && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            导出成功！文件已开始下载
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {errorMessage}
          </div>
        )}

        {/* Export Button */}
        <Button
          className="w-full"
          onClick={exportData}
          disabled={selectedOptions.length === 0 || status === "exporting"}
        >
          {status === "exporting" ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              导出中...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              开始导出
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          导出数据仅包含您创建的内容，不包含其他用户数据
        </p>
      </CardContent>
    </Card>
  );
}

// Helper function to generate Markdown from export data
function generateMarkdown(data: Record<string, any>): string {
  const lines: string[] = [];
  
  lines.push("# FANCE 数据导出");
  lines.push("");
  lines.push(`导出时间: ${format(new Date(data.exportedAt), "yyyy年MM月dd日 HH:mm:ss", { locale: zhCN })}`);
  lines.push(`用户: ${data.email}`);
  lines.push("");

  // Agents
  if (data.agents?.length > 0) {
    lines.push("## 智能体列表");
    lines.push("");
    
    for (const agent of data.agents) {
      lines.push(`### ${agent.name}`);
      lines.push("");
      lines.push(`- **状态**: ${agent.status}`);
      lines.push(`- **模型**: ${agent.model}`);
      lines.push(`- **类别**: ${agent.category || "未分类"}`);
      lines.push(`- **创建时间**: ${format(new Date(agent.created_at), "yyyy-MM-dd HH:mm", { locale: zhCN })}`);
      
      if (agent.manifest?.systemPrompt) {
        lines.push("");
        lines.push("#### 系统提示词");
        lines.push("```");
        lines.push(agent.manifest.systemPrompt);
        lines.push("```");
      }
      
      if (agent.agent_skills?.length > 0) {
        lines.push("");
        lines.push("#### 已装载技能");
        for (const skill of agent.agent_skills) {
          if (skill.skills) {
            lines.push(`- ${skill.skills.name}: ${skill.skills.description || ""}`);
          }
        }
      }
      
      lines.push("");
    }
  }

  // Conversations
  if (data.conversations?.length > 0) {
    lines.push("## 对话历史");
    lines.push("");
    
    for (const session of data.conversations) {
      lines.push(`### 会话 ${session.id.slice(0, 8)}`);
      lines.push(`创建时间: ${format(new Date(session.created_at), "yyyy-MM-dd HH:mm", { locale: zhCN })}`);
      lines.push("");
      
      if (session.messages?.length > 0) {
        for (const msg of session.messages) {
          const role = msg.role === "user" ? "👤 用户" : "🤖 助手";
          lines.push(`**${role}** (${format(new Date(msg.created_at), "HH:mm")})`);
          lines.push("");
          lines.push(msg.content);
          lines.push("");
          lines.push("---");
          lines.push("");
        }
      }
    }
  }

  // Knowledge Bases
  if (data.knowledgeBases?.length > 0) {
    lines.push("## 知识库");
    lines.push("");
    
    for (const kb of data.knowledgeBases) {
      lines.push(`### ${kb.name}`);
      lines.push("");
      if (kb.description) {
        lines.push(kb.description);
        lines.push("");
      }
      lines.push(`- **文档数**: ${kb.documents_count || 0}`);
      lines.push(`- **分片数**: ${kb.chunks_count || 0}`);
      lines.push(`- **创建时间**: ${format(new Date(kb.created_at), "yyyy-MM-dd", { locale: zhCN })}`);
      
      if (kb.knowledge_documents?.length > 0) {
        lines.push("");
        lines.push("#### 文档列表");
        for (const doc of kb.knowledge_documents) {
          lines.push(`- ${doc.name} (${doc.file_type}, ${formatFileSize(doc.file_size)})`);
        }
      }
      
      lines.push("");
    }
  }

  return lines.join("\n");
}

function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
