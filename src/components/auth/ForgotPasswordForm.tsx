import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowRight, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const emailSchema = z.string().email("请输入有效的邮箱地址");

interface ForgotPasswordFormProps {
  onBack?: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(email);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "输入错误",
          description: err.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      setSent(true);
      toast({
        title: "邮件已发送",
        description: "请检查您的邮箱并点击重置链接",
      });
    } catch (error: any) {
      toast({
        title: "发送失败",
        description: error.message || "重置邮件发送失败，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">邮件已发送</h3>
          <p className="text-sm text-muted-foreground">
            我们已向 <span className="font-medium text-foreground">{email}</span> 发送了密码重置链接
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            没有收到邮件？请检查垃圾邮件文件夹
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setSent(false)}
          >
            重新发送
          </Button>
          {onBack && (
            <Button
              variant="ghost"
              className="w-full gap-2"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
              返回登录
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h3 className="text-lg font-semibold">找回密码</h3>
        <p className="text-sm text-muted-foreground">
          输入您的邮箱，我们将发送密码重置链接
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-email">邮箱地址</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="reset-email"
              type="email"
              placeholder="your@email.com"
              className="pl-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full gap-2" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              发送重置链接
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      {onBack && (
        <Button
          variant="ghost"
          className="w-full gap-2"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          返回登录
        </Button>
      )}
    </div>
  );
}
