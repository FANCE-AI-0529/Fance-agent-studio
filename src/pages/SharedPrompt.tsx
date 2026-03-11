import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../integrations/supabase/client.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { ScrollArea } from "../components/ui/scroll-area.tsx";
import { Loader2, FileText, Copy, Check, Download, LogIn, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface SharedPromptData {
  id: string;
  name: string;
  prompt: string;
  share_count: number;
  created_at: string;
}

export default function SharedPrompt() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [promptData, setPromptData] = useState<SharedPromptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    async function fetchSharedPrompt() {
      if (!token) {
        setError("无效的分享链接");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("user_prompts")
          .select("id, name, prompt, share_count, created_at")
          .eq("share_token", token)
          .eq("is_shared", true)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError("提示词不存在或已取消分享");
          setLoading(false);
          return;
        }

        setPromptData(data);

        // Increment share count
        await supabase
          .from("user_prompts")
          .update({ share_count: (data.share_count || 0) + 1 })
          .eq("id", data.id);
      } catch (err) {
        console.error("Error fetching shared prompt:", err);
        setError("加载分享提示词失败");
      } finally {
        setLoading(false);
      }
    }

    fetchSharedPrompt();
  }, [token]);

  const handleCopy = async () => {
    if (!promptData) return;
    await navigator.clipboard.writeText(promptData.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("已复制到剪贴板");
  };

  const handleExport = () => {
    if (!promptData) return;
    
    const exportData = {
      name: promptData.name,
      prompt: promptData.prompt,
      exportedAt: new Date().toISOString(),
      version: "1.0"
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${promptData.name.replace(/\s+/g, "-").toLowerCase()}-prompt.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("提示词已导出为 JSON 文件");
  };

  const handleApply = async () => {
    if (!promptData || !user) return;

    setApplying(true);
    try {
      const { error: insertError } = await supabase
        .from("user_prompts")
        .insert({
          user_id: user.id,
          name: `${promptData.name} (导入)`,
          prompt: promptData.prompt,
          is_default: false,
        });

      if (insertError) throw insertError;

      toast.success("提示词已添加到你的收藏");
      navigate("/hive?tab=runtime");
    } catch (err) {
      console.error("Error applying prompt:", err);
      toast.error("应用提示词失败");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !promptData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">加载失败</CardTitle>
            <CardDescription>{error || "提示词不存在"}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>
              返回首页
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <Badge variant="secondary">分享的提示词</Badge>
          </div>
          <CardTitle className="text-xl">{promptData.name}</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {promptData.prompt.length} 字符
            <span className="text-muted-foreground">·</span>
            被查看 {promptData.share_count} 次
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-[300px] border rounded-lg p-4 bg-muted/30">
            <pre className="whitespace-pre-wrap font-mono text-sm">
              {promptData.prompt}
            </pre>
          </ScrollArea>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              className="flex-1 sm:flex-initial gap-2"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              复制
            </Button>
            <Button
              variant="outline"
              className="flex-1 sm:flex-initial gap-2"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
              导出
            </Button>
          </div>
          
          <div className="flex-1" />

          {user ? (
            <Button
              className="w-full sm:w-auto gap-2"
              onClick={handleApply}
              disabled={applying}
            >
              {applying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              一键应用
            </Button>
          ) : (
            <Button
              className="w-full sm:w-auto gap-2"
              onClick={() => navigate("/auth")}
            >
              <LogIn className="h-4 w-4" />
              登录后应用
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
