import { useState } from "react";
import {
  Share2,
  Link,
  Image,
  Copy,
  Check,
  Download,
  Twitter,
  MessageCircle,
  Mail,
  QrCode,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ShareDialogProps {
  messages: Message[];
  sessionTitle?: string;
  trigger?: React.ReactNode;
}

export function ShareDialog({ messages, sessionTitle, trigger }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [includeUser, setIncludeUser] = useState(true);
  const [includeTimestamp, setIncludeTimestamp] = useState(false);

  const generateShareLink = async () => {
    setIsGenerating(true);
    // 模拟生成分享链接
    await new Promise(resolve => setTimeout(resolve, 800));
    const mockId = Math.random().toString(36).substring(7);
    setShareLink(`https://app.example.com/share/${mockId}`);
    setIsGenerating(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "已复制",
        description: "分享链接已复制到剪贴板",
      });
    } catch (err) {
      toast({
        title: "复制失败",
        description: "请手动复制链接",
        variant: "destructive",
      });
    }
  };

  const copyAsText = async () => {
    const text = messages
      .filter(m => includeUser || m.role === "assistant")
      .map(m => `${m.role === "user" ? "用户" : "助手"}: ${m.content}`)
      .join("\n\n");
    
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "已复制",
        description: "对话内容已复制到剪贴板",
      });
      setOpen(false);
    } catch (err) {
      toast({
        title: "复制失败",
        variant: "destructive",
      });
    }
  };

  const downloadAsImage = async () => {
    toast({
      title: "生成图片中",
      description: "正在生成对话截图...",
    });
    // 实际实现需要使用 html2canvas 或类似库
    setTimeout(() => {
      toast({
        title: "图片已生成",
        description: "对话截图已保存",
      });
      setOpen(false);
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Share2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            分享对话
          </DialogTitle>
          <DialogDescription>
            {sessionTitle || `${messages.length} 条消息`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* 分享选项 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="include-user" className="text-sm">包含用户消息</Label>
              <Switch
                id="include-user"
                checked={includeUser}
                onCheckedChange={setIncludeUser}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="include-timestamp" className="text-sm">显示时间戳</Label>
              <Switch
                id="include-timestamp"
                checked={includeTimestamp}
                onCheckedChange={setIncludeTimestamp}
              />
            </div>
          </div>

          {/* 生成链接 */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">分享链接</Label>
            {shareLink ? (
              <div className="flex gap-2">
                <Input value={shareLink} readOnly className="flex-1" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-status-executing" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={generateShareLink}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link className="h-4 w-4" />
                )}
                生成分享链接
              </Button>
            )}
          </div>

          {/* 快速分享方式 */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">快速分享</Label>
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                className="flex-col gap-1 h-16"
                onClick={copyAsText}
              >
                <Copy className="h-5 w-5" />
                <span className="text-xs">复制文本</span>
              </Button>
              <Button
                variant="outline"
                className="flex-col gap-1 h-16"
                onClick={downloadAsImage}
              >
                <Image className="h-5 w-5" />
                <span className="text-xs">保存图片</span>
              </Button>
              <Button
                variant="outline"
                className="flex-col gap-1 h-16"
                disabled
              >
                <QrCode className="h-5 w-5" />
                <span className="text-xs">二维码</span>
              </Button>
              <Button
                variant="outline"
                className="flex-col gap-1 h-16"
                disabled
              >
                <Mail className="h-5 w-5" />
                <span className="text-xs">邮件</span>
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            分享链接有效期 7 天，可随时删除
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 快捷分享按钮
export function QuickShareButton({
  messages,
  className,
}: {
  messages: Message[];
  className?: string;
}) {
  const copyLastResponse = async () => {
    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
    if (lastAssistant) {
      await navigator.clipboard.writeText(lastAssistant.content);
      toast({
        title: "已复制",
        description: "最后一条回复已复制",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-8 w-8", className)}>
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={copyLastResponse}>
          <Copy className="h-4 w-4 mr-2" />
          复制最后回复
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Image className="h-4 w-4 mr-2" />
          保存为图片
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <ShareDialog
          messages={messages}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Link className="h-4 w-4 mr-2" />
              更多分享选项
            </DropdownMenuItem>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
