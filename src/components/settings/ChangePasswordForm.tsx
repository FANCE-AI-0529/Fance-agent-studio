import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card.tsx";
import { Alert, AlertDescription } from "../ui/alert.tsx";
import { Loader2, Eye, EyeOff, CheckCircle2, ShieldCheck } from "lucide-react";
import { supabase } from "../../integrations/supabase/client.ts";
import { useToast } from "../../hooks/use-toast.ts";
import { cn } from "../../lib/utils.ts";

// Password strength rules
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "请输入当前密码"),
  newPassword: z
    .string()
    .min(8, "密码至少8个字符")
    .regex(/[A-Z]/, "需要至少一个大写字母")
    .regex(/[a-z]/, "需要至少一个小写字母")
    .regex(/[0-9]/, "需要至少一个数字"),
  confirmPassword: z.string().min(1, "请确认新密码"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "新密码不能与当前密码相同",
  path: ["newPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

interface PasswordStrengthIndicatorProps {
  password: string;
}

function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const checks = [
    { label: "至少8个字符", valid: password.length >= 8 },
    { label: "包含大写字母", valid: /[A-Z]/.test(password) },
    { label: "包含小写字母", valid: /[a-z]/.test(password) },
    { label: "包含数字", valid: /[0-9]/.test(password) },
  ];
  
  const passedCount = checks.filter(c => c.valid).length;
  const strength = passedCount === 0 ? 0 : passedCount === 4 ? 100 : (passedCount / 4) * 100;
  
  const getStrengthColor = () => {
    if (strength === 0) return "bg-muted";
    if (strength <= 25) return "bg-destructive";
    if (strength <= 50) return "bg-orange-500";
    if (strength <= 75) return "bg-yellow-500";
    return "bg-green-500";
  };
  
  const getStrengthLabel = () => {
    if (strength === 0) return "";
    if (strength <= 25) return "弱";
    if (strength <= 50) return "中";
    if (strength <= 75) return "强";
    return "非常强";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-300", getStrengthColor())}
            style={{ width: `${strength}%` }}
          />
        </div>
        {strength > 0 && (
          <span className="text-xs text-muted-foreground">{getStrengthLabel()}</span>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-1">
        {checks.map((check, i) => (
          <div 
            key={i} 
            className={cn(
              "flex items-center gap-1 text-xs",
              check.valid ? "text-green-600" : "text-muted-foreground"
            )}
          >
            <CheckCircle2 className={cn("h-3 w-3", check.valid ? "opacity-100" : "opacity-30")} />
            {check.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChangePasswordForm() {
  const { toast } = useToast();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  const newPassword = watch("newPassword");
  
  const onSubmit = async (data: PasswordFormData) => {
    setIsSubmitting(true);
    setSuccessMessage("");
    
    try {
      // Supabase requires re-authentication or just updating password
      // For security, we'll update the password directly
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });
      
      if (error) {
        throw error;
      }
      
      setSuccessMessage("密码修改成功！为了安全，建议您重新登录。");
      reset();
      toast({
        title: "密码已更新",
        description: "您的密码已成功修改",
      });
    } catch (error: Error) {
      console.error("Password update error:", error);
      toast({
        title: "修改失败",
        description: error.message || "密码修改失败，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5 text-primary" />
          修改密码
        </CardTitle>
        <CardDescription>
          定期更改密码可以保护您的账户安全
        </CardDescription>
      </CardHeader>
      <CardContent>
        {successMessage && (
          <Alert className="mb-4 bg-green-500/10 border-green-500/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">当前密码</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                placeholder="输入当前密码"
                {...register("currentPassword")}
                className={errors.currentPassword ? "border-destructive" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.currentPassword && (
              <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>
          
          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">新密码</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                placeholder="输入新密码"
                {...register("newPassword")}
                className={errors.newPassword ? "border-destructive" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-destructive">{errors.newPassword.message}</p>
            )}
            
            {/* Password Strength Indicator */}
            {newPassword && <PasswordStrengthIndicator password={newPassword} />}
          </div>
          
          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认新密码</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="再次输入新密码"
                {...register("confirmPassword")}
                className={errors.confirmPassword ? "border-destructive" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
          
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            确认修改
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
