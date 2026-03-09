/**
 * @file Auth.tsx
 * @description 用户认证页面 - 登录、注册与密码重置 - Authentication Page
 * @author Fance Studio
 * @copyright Copyright (c) 2025 Fance Studio. MIT License.
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, User, ArrowRight, Loader2, Sparkles, Ticket, CheckCircle2, XCircle } from "lucide-react";
import logoFull from "@/assets/logo-full.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { useInviteValidation, acceptInvitationOnSignup } from "@/hooks/useInviteValidation";
import { supabase } from "@/integrations/supabase/client";
import { PasswordStrengthIndicator, usePasswordStrength } from "@/components/auth/PasswordStrengthIndicator";
import { MathCaptcha } from "@/components/auth/MathCaptcha";
import { useSecurityAudit } from "@/hooks/useSecurityAudit";

const emailSchema = z.string().email("请输入有效的邮箱地址");
// 强密码验证：至少8位，包含大小写字母、数字和特殊字符
const strongPasswordSchema = z.string()
  .min(8, "密码至少需要8个字符")
  .regex(/[A-Z]/, "密码必须包含大写字母")
  .regex(/[a-z]/, "密码必须包含小写字母")
  .regex(/[0-9]/, "密码必须包含数字")
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "密码必须包含特殊字符");
const inviteCodeSchema = z.string().min(4, "邀请码至少4位").max(20, "邀请码最多20位");
// 登录时使用简单密码验证
const loginPasswordSchema = z.string().min(1, "请输入密码");

type AuthView = "main" | "forgot" | "reset";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [view, setView] = useState<AuthView>("main");

  // Check if user is already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Check for password reset flow
  useEffect(() => {
    if (searchParams.get("reset") === "true") {
      setView("reset");
    }
  }, [searchParams]);

  // Check for invite code in URL
  useEffect(() => {
    const inviteFromUrl = searchParams.get("invite");
    if (inviteFromUrl) {
      setInviteCode(inviteFromUrl.toUpperCase());
      setActiveTab("signup");
    }
  }, [searchParams]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [inviteCode, setInviteCode] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [loginCaptchaVerified, setLoginCaptchaVerified] = useState(false);

  // Invite code validation
  const { isValid: isInviteValid, isLoading: isValidating, error: inviteError, invitationId } = useInviteValidation(inviteCode);
  
  // Password strength check
  const { isStrong: isPasswordStrong } = usePasswordStrength(signupPassword);

  // Security audit logging
  const { logLogin, logSignup } = useSecurityAudit();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate captcha first
    if (!loginCaptchaVerified) {
      toast({
        title: "请完成安全验证",
        description: "请先完成数学验证",
        variant: "destructive",
      });
      return;
    }

    try {
      emailSchema.parse(loginEmail);
      loginPasswordSchema.parse(loginPassword);
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
    const { error } = await signIn(loginEmail, loginPassword);
    setLoading(false);

    if (error) {
      let message = "登录失败，请重试";
      if (error.message.includes("Invalid login credentials")) {
        message = "邮箱或密码错误";
      } else if (error.message.includes("Email not confirmed")) {
        message = "请先验证您的邮箱";
      }
      
      // Log failed login attempt
      await logLogin('', false, message);
      
      toast({
        title: "登录失败",
        description: message,
        variant: "destructive",
      });
    } else {
      // Get user ID for successful login log
      const { data: { user: loggedInUser } } = await supabase.auth.getUser();
      if (loggedInUser) {
        await logLogin(loggedInUser.id, true);
      }
      
      toast({
        title: "登录成功",
        description: "欢迎回来！",
      });
      navigate("/");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate invite code first
    try {
      inviteCodeSchema.parse(inviteCode);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "邀请码错误",
          description: err.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    if (!isInviteValid) {
      toast({
        title: "邀请码无效",
        description: inviteError || "请输入有效的邀请码",
        variant: "destructive",
      });
      return;
    }

    // Validate captcha
    if (!captchaVerified) {
      toast({
        title: "请完成安全验证",
        description: "请先完成数学验证",
        variant: "destructive",
      });
      return;
    }

    try {
      emailSchema.parse(signupEmail);
      strongPasswordSchema.parse(signupPassword);
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

    // Additional password strength check
    if (!isPasswordStrong) {
      toast({
        title: "密码强度不足",
        description: "请设置包含大小写字母、数字和特殊字符的强密码",
        variant: "destructive",
      });
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      toast({
        title: "密码不匹配",
        description: "两次输入的密码不一致",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    // Sign up the user
    const { error } = await signUp(signupEmail, signupPassword, displayName);

    if (error) {
      setLoading(false);
      let message = "注册失败，请重试";
      if (error.message.includes("User already registered")) {
        message = "该邮箱已被注册";
      }
      
      // Log failed signup attempt
      await logSignup('', false, message);
      
      toast({
        title: "注册失败",
        description: message,
        variant: "destructive",
      });
      return;
    }

    // Wait for auth state to update and get user
    const { data: { user: newUser } } = await supabase.auth.getUser();
    
    if (newUser) {
      // Log successful signup
      await logSignup(newUser.id, true);
      
      if (invitationId) {
        // Accept the invitation using invitationId (not inviteCode)
        const result = await acceptInvitationOnSignup(invitationId, newUser.id);
        
        if (result.success) {
          toast({
            title: "注册成功",
            description: "欢迎加入！您已获得 50 积分奖励",
          });
        } else {
          console.warn('[Auth] Failed to claim invitation:', result.error);
          toast({
            title: "注册成功",
            description: "欢迎加入！",
          });
        }
      } else {
        toast({
          title: "注册成功",
          description: "欢迎加入！",
        });
      }
    }

    setLoading(false);
    navigate("/");
  };

  // Render different views
  const renderContent = () => {
    switch (view) {
      case "forgot":
        return (
          <div className="bg-card border border-border rounded-xl p-6">
            <ForgotPasswordForm onBack={() => setView("main")} />
          </div>
        );

      case "reset":
        return (
          <div className="bg-card border border-border rounded-xl p-6">
            <ResetPasswordForm />
          </div>
        );

      default:
        return (
          <>
            {/* Auth Card */}
            <div className="bg-card border border-border rounded-xl p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">登录</TabsTrigger>
                  <TabsTrigger value="signup">注册</TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">邮箱</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="your@email.com"
                          className="pl-10"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">密码</Label>
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => setView("forgot")}
                        >
                          忘记密码？
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Login CAPTCHA */}
                    <MathCaptcha onVerified={setLoginCaptchaVerified} />

                    <Button type="submit" className="w-full gap-2" disabled={loading || !loginCaptchaVerified}>
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          登录
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                {/* Signup Tab */}
                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    {/* Invite Code - Required */}
                    <div className="space-y-2">
                      <Label htmlFor="invite-code" className="flex items-center gap-1">
                        邀请码 <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="invite-code"
                          type="text"
                          placeholder="请输入邀请码"
                          className="pl-10 pr-10 uppercase"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                          required
                        />
                        {inviteCode.length >= 6 && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isValidating ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : isInviteValid ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                        )}
                      </div>
                      {inviteCode.length >= 6 && !isValidating && (
                        <p className={`text-xs ${isInviteValid ? "text-green-500" : "text-destructive"}`}>
                          {isInviteValid ? "邀请码有效" : inviteError}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="display-name">昵称</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="display-name"
                          type="text"
                          placeholder="给自己取个名字"
                          className="pl-10"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">邮箱</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="your@email.com"
                          className="pl-10"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">密码</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="包含大小写字母、数字和特殊字符"
                          className="pl-10"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          required
                        />
                      </div>
                      <PasswordStrengthIndicator password={signupPassword} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">确认密码</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="再次输入密码"
                          className="pl-10"
                          value={signupConfirmPassword}
                          onChange={(e) => setSignupConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                      {signupConfirmPassword && signupPassword !== signupConfirmPassword && (
                        <p className="text-xs text-destructive">两次输入的密码不一致</p>
                      )}
                    </div>

                    {/* Math CAPTCHA */}
                    <MathCaptcha onVerified={setCaptchaVerified} />

                    <Button 
                      type="submit" 
                      className="w-full gap-2" 
                      disabled={loading || !isInviteValid || !isPasswordStrong || !captchaVerified}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          创建账户
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Invite required notice */}
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground text-center">
                      🎫 注册需要有效的邀请码，请联系已注册用户获取
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={logoFull} alt="Fance Studio" className="h-14 w-14 rounded-xl object-cover mx-auto mb-4" />
          <p className="text-muted-foreground text-sm mt-1 flex items-center justify-center gap-1">
            <Sparkles className="h-3 w-3" />
            技能驱动，智能无限
          </p>
        </div>

        {renderContent()}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          登录即表示您同意我们的
          <button className="text-primary hover:underline mx-1">服务条款</button>
          和
          <button className="text-primary hover:underline mx-1">隐私政策</button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
