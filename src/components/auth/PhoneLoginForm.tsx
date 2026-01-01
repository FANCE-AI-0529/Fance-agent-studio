import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface PhoneLoginFormProps {
  onSuccess?: () => void;
}

export function PhoneLoginForm({ onSuccess }: PhoneLoginFormProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatPhoneForSupabase = (phoneNumber: string) => {
    // 移除所有非数字字符
    const cleaned = phoneNumber.replace(/\D/g, "");
    // 如果没有国家代码，添加中国的 +86
    if (!phoneNumber.startsWith("+")) {
      return `+86${cleaned}`;
    }
    return `+${cleaned}`;
  };

  const handleSendCode = async () => {
    if (!phone || phone.length < 11) {
      toast({
        title: "请输入有效的手机号",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = formatPhoneForSupabase(phone);
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) throw error;

      setStep("code");
      setCountdown(60);
      toast({
        title: "验证码已发送",
        description: "请查看您的手机短信",
      });
    } catch (error: any) {
      toast({
        title: "发送失败",
        description: error.message || "验证码发送失败，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      toast({
        title: "请输入完整的验证码",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = formatPhoneForSupabase(phone);
      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: code,
        type: "sms",
      });

      if (error) throw error;

      toast({
        title: "登录成功",
        description: "欢迎使用 Agent OS Studio！",
      });
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "验证失败",
        description: error.message || "验证码错误，请重新输入",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === "code") {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            验证码已发送至 <span className="font-medium text-foreground">{phone}</span>
          </p>
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => setStep("phone")}
          >
            更换手机号
          </button>
        </div>

        <div className="flex flex-col items-center space-y-4">
          <Label>输入6位验证码</Label>
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(value) => setCode(value)}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          onClick={handleVerifyCode}
          className="w-full gap-2"
          disabled={loading || code.length !== 6}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              验证登录
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <div className="text-center">
          {countdown > 0 ? (
            <span className="text-sm text-muted-foreground">
              {countdown}秒后可重新发送
            </span>
          ) : (
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={handleSendCode}
              disabled={loading}
            >
              重新发送验证码
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">手机号</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="phone"
            type="tel"
            placeholder="请输入手机号"
            className="pl-10"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={11}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          我们将发送验证码到您的手机
        </p>
      </div>

      <Button
        onClick={handleSendCode}
        className="w-full gap-2"
        disabled={loading || phone.length < 11}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            获取验证码
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
