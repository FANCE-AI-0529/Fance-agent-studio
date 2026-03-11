import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card.tsx";
import { Button } from "../ui/button.tsx";
import { Textarea } from "../ui/textarea.tsx";
import { Label } from "../ui/label.tsx";
import { Badge } from "../ui/badge.tsx";
import { Switch } from "../ui/switch.tsx";
import { Input } from "../ui/input.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Alert, AlertDescription } from "../ui/alert.tsx";
import { 
  Mail, 
  Send, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Sparkles
} from "lucide-react";
import { useSendInviteEmails, useAllInviteCodes } from "../../hooks/useAdminInvite.ts";
import { toast } from "../../hooks/use-toast.ts";

interface EmailResult {
  email: string;
  success: boolean;
  error?: string;
}

export function BulkEmailSender() {
  const [emailsText, setEmailsText] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [results, setResults] = useState<EmailResult[] | null>(null);

  const { data: allCodes = [] } = useAllInviteCodes();
  const sendEmails = useSendInviteEmails();

  // Get available codes (pending, not expired)
  const availableCodes = allCodes.filter(c => 
    c.status === "pending" && 
    !c.invited_user_id &&
    !c.email_sent_at &&
    (!c.expires_at || new Date(c.expires_at) > new Date())
  );

  // Parse emails from textarea
  const parseEmails = (text: string): string[] => {
    return text
      .split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  };

  const emails = parseEmails(emailsText);
  const validEmailCount = emails.length;

  const handleSend = async () => {
    if (validEmailCount === 0) {
      toast({ title: "请输入有效的邮箱地址", variant: "destructive" });
      return;
    }

    let codesToUse: string[];

    if (autoGenerate) {
      // Will generate new codes on the fly
      codesToUse = [];
    } else {
      // Use selected available codes
      if (selectedCodes.length < validEmailCount) {
        toast({ 
          title: "邀请码数量不足", 
          description: `需要 ${validEmailCount} 个邀请码，但只选择了 ${selectedCodes.length} 个`,
          variant: "destructive" 
        });
        return;
      }
      codesToUse = selectedCodes.slice(0, validEmailCount);
    }

    try {
      const result = await sendEmails.mutateAsync({
        emails,
        inviteCodes: codesToUse,
        customMessage: customMessage.trim() || undefined,
        autoGenerate,
      });

      setResults(result.results);
      
      if (result.summary.sent === result.summary.total) {
        setEmailsText("");
        setSelectedCodes([]);
      }
    } catch (error) {
      console.error("Failed to send emails:", error);
    }
  };

  const toggleCodeSelection = (code: string) => {
    setSelectedCodes(prev => 
      prev.includes(code) 
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          批量发送邀请邮件
        </CardTitle>
        <CardDescription>
          通过邮件向用户发送邀请码
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email input */}
        <div className="space-y-2">
          <Label>收件人邮箱</Label>
          <Textarea
            placeholder="输入邮箱地址，每行一个或用逗号分隔&#10;example1@mail.com&#10;example2@mail.com"
            value={emailsText}
            onChange={(e) => setEmailsText(e.target.value)}
            className="min-h-[120px] font-mono text-sm"
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              已识别 <span className="font-medium text-foreground">{validEmailCount}</span> 个有效邮箱
            </span>
            {validEmailCount > 50 && (
              <span className="text-destructive">最多支持 50 个邮箱</span>
            )}
          </div>
        </div>

        {/* Custom message */}
        <div className="space-y-2">
          <Label>自定义消息（可选）</Label>
          <Input
            placeholder="添加个性化邀请消息..."
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">{customMessage.length}/200</p>
        </div>

        {/* Code selection mode */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                自动生成新邀请码
              </Label>
              <p className="text-xs text-muted-foreground">
                {autoGenerate ? "为每个邮箱自动生成新邀请码" : "使用现有的邀请码"}
              </p>
            </div>
            <Switch checked={autoGenerate} onCheckedChange={setAutoGenerate} />
          </div>

          {!autoGenerate && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>选择邀请码</Label>
                <Badge variant="outline">
                  已选 {selectedCodes.length} / 需要 {validEmailCount}
                </Badge>
              </div>
              {availableCodes.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    没有可用的邀请码，请先生成邀请码或开启自动生成
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[150px] border rounded-lg p-2">
                  <div className="flex flex-wrap gap-2">
                    {availableCodes.slice(0, 50).map((code) => (
                      <Badge
                        key={code.id}
                        variant={selectedCodes.includes(code.invite_code) ? "default" : "outline"}
                        className="cursor-pointer font-mono"
                        onClick={() => toggleCodeSelection(code.invite_code)}
                      >
                        {code.invite_code}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-2">
            <Label>发送结果</Label>
            <ScrollArea className="h-[120px] border rounded-lg p-3">
              <div className="space-y-1">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {r.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                    <span className="truncate">{r.email}</span>
                    {r.error && (
                      <span className="text-destructive text-xs truncate">({r.error})</span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={validEmailCount === 0 || validEmailCount > 50 || sendEmails.isPending}
          className="w-full gap-2"
          size="lg"
        >
          {sendEmails.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          发送 {validEmailCount} 封邀请邮件
        </Button>
      </CardContent>
    </Card>
  );
}
