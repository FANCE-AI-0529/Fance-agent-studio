import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Bot, Mail, Lock, User, ArrowRight, Loader2, Phone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { PhoneLoginForm } from "@/components/auth/PhoneLoginForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

const emailSchema = z.string().email("请输入有效的邮箱地址");
const passwordSchema = z.string().min(6, "密码至少需要6个字符");

type AuthView = "main" | "phone" | "forgot" | "reset";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [view, setView] = useState<AuthView>("main");

  // 检查是否是密码重置流程
  useEffect(() => {
    if (searchParams.get("reset") === "true") {
      setView("reset");
    }
  }, [searchParams]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const handleGuestMode = () => {
    // 存储访客状态
    sessionStorage.setItem("guestMode", "true");
    toast({
      title: "体验模式",
      description: "您正在以访客身份体验，部分功能受限",
    });
    navigate("/");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
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
      toast({
        title: "登录失败",
        description: message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "登录成功",
        description: "欢迎回来！",
      });
      navigate("/");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
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

    if (signupPassword !== signupConfirmPassword) {
      toast({
        title: "密码不匹配",
        description: "两次输入的密码不一致",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, displayName);
    setLoading(false);

    if (error) {
      let message = "注册失败，请重试";
      if (error.message.includes("User already registered")) {
        message = "该邮箱已被注册";
      }
      toast({
        title: "注册失败",
        description: message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "注册成功",
        description: "欢迎加入！",
      });
      navigate("/");
    }
  };

  // 渲染不同视图
  const renderContent = () => {
    switch (view) {
      case "phone":
        return (
          <div className="bg-card border border-border rounded-xl p-6">
            <PhoneLoginForm onSuccess={() => navigate("/")} />
            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={() => setView("main")}
            >
              返回其他登录方式
            </Button>
          </div>
        );

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

                    <Button type="submit" className="w-full gap-2" disabled={loading}>
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

                  {/* 手机号登录入口 */}
                  <Button
                    variant="outline"
                    className="w-full mt-3 gap-2"
                    onClick={() => setView("phone")}
                  >
                    <Phone className="h-4 w-4" />
                    手机号登录
                  </Button>
                </TabsContent>

                {/* Signup Tab */}
                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
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
                          placeholder="至少6个字符"
                          className="pl-10"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          required
                        />
                      </div>
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
                    </div>

                    <Button type="submit" className="w-full gap-2" disabled={loading}>
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
                </TabsContent>
              </Tabs>

              {/* 社交登录 */}
              <div className="mt-6">
                <SocialLoginButtons onGuestMode={handleGuestMode} />
              </div>
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
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Agent OS Studio</h1>
          <p className="text-muted-foreground text-sm mt-1 flex items-center justify-center gap-1">
            <Sparkles className="h-3 w-3" />
            打造你的专属AI助手
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
