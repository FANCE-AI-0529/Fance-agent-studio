import { useState, useRef } from "react";
import { toPng } from "html-to-image";
import { QRCodeSVG } from "qrcode.react";
import {
  Share2,
  Link,
  Image,
  Copy,
  Check,
  QrCode,
  Loader2,
  Mail,
  ExternalLink,
  Clock,
  Download,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCreateSharedConversation } from "@/hooks/useSharedConversation";
import { ShareCardPreview } from "./ShareCardPreview";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ShareDialogProps {
  messages: Message[];
  sessionId?: string;
  sessionTitle?: string;
  agentName?: string;
  agentAvatar?: Record<string, unknown>;
  trigger?: React.ReactNode;
}

export function ShareDialog({ 
  messages, 
  sessionId,
  sessionTitle, 
  agentName,
  agentAvatar,
  trigger,
}: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [includeUser, setIncludeUser] = useState(true);
  const [expiresIn, setExpiresIn] = useState<string>("7");
  const [showQrCode, setShowQrCode] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const createShare = useCreateSharedConversation();

  const generateShareLink = async () => {
    if (!sessionId) {
      toast.error("请先保存会话");
      return;
    }

    try {
      const result = await createShare.mutateAsync({
        sessionId,
        title: sessionTitle,
        agentName,
        agentAvatar,
        includeUserMessages: includeUser,
        expiresInDays: expiresIn === "never" ? undefined : parseInt(expiresIn),
      });
      setShareLink(result.shareUrl);
      toast.success("分享链接已生成");
    } catch {
      toast.error("生成链接失败");
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("链接已复制到剪贴板");
    } catch {
      toast.error("复制失败");
    }
  };

  const copyAsText = async () => {
    const text = messages
      .filter(m => includeUser || m.role === "assistant")
      .map(m => `${m.role === "user" ? "用户" : "助手"}: ${m.content}`)
      .join("\n\n");
    
    try {
      await navigator.clipboard.writeText(text);
      toast.success("对话内容已复制");
      setOpen(false);
    } catch {
      toast.error("复制失败");
    }
  };

  const downloadAsImage = async () => {
    if (!cardRef.current) {
      toast.error("无法生成图片");
      return;
    }

    setIsGeneratingImage(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
      });
      
      const link = document.createElement("a");
      link.download = `chat-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success("图片已保存");
    } catch (err) {
      console.error("Failed to generate image:", err);
      toast.error("生成图片失败");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const sendByEmail = () => {
    const subject = encodeURIComponent(`分享对话: ${sessionTitle || "AI对话"}`);
    const body = encodeURIComponent(
      `我想和你分享一段有趣的AI对话：\n\n${shareLink || "请先生成分享链接"}\n\n来自 AI Agent Platform`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const openShareLink = () => {
    if (shareLink) {
      window.open(shareLink, "_blank");
    }
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
          {/* Share options */}
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
              <Label className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                有效期
              </Label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 天</SelectItem>
                  <SelectItem value="7">7 天</SelectItem>
                  <SelectItem value="30">30 天</SelectItem>
                  <SelectItem value="never">永久</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Generate link */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">分享链接</Label>
            {shareLink ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input value={shareLink} readOnly className="flex-1 text-xs" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={openShareLink}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  点击右侧按钮复制或在新窗口打开
                </p>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={generateShareLink}
                disabled={createShare.isPending || !sessionId}
              >
                {createShare.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link className="h-4 w-4" />
                )}
                {!sessionId ? "请先保存会话" : "生成分享链接"}
              </Button>
            )}
          </div>

          {/* Quick share methods */}
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
                disabled={isGeneratingImage}
              >
                {isGeneratingImage ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                <span className="text-xs">保存图片</span>
              </Button>
              <Button
                variant="outline"
                className={cn("flex-col gap-1 h-16", showQrCode && "border-primary")}
                onClick={() => setShowQrCode(!showQrCode)}
                disabled={!shareLink}
              >
                <QrCode className="h-5 w-5" />
                <span className="text-xs">二维码</span>
              </Button>
              <Button
                variant="outline"
                className="flex-col gap-1 h-16"
                onClick={sendByEmail}
              >
                <Mail className="h-5 w-5" />
                <span className="text-xs">邮件</span>
              </Button>
            </div>
          </div>

          {/* QR Code Display */}
          {showQrCode && shareLink && (
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <QRCodeSVG value={shareLink} size={160} level="M" />
            </div>
          )}

          {/* Hidden card for image generation */}
          <div className="fixed -left-[9999px]">
            <ShareCardPreview
              ref={cardRef}
              messages={messages}
              shareUrl={shareLink}
              agentName={agentName}
              includeUser={includeUser}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Quick share button
export function QuickShareButton({
  messages,
  sessionId,
  agentName,
  agentAvatar,
  className,
}: {
  messages: Message[];
  sessionId?: string;
  agentName?: string;
  agentAvatar?: Record<string, unknown>;
  className?: string;
}) {
  const copyLastResponse = async () => {
    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
    if (lastAssistant) {
      await navigator.clipboard.writeText(lastAssistant.content);
      toast.success("最后一条回复已复制");
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
          sessionId={sessionId}
          agentName={agentName}
          agentAvatar={agentAvatar}
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
