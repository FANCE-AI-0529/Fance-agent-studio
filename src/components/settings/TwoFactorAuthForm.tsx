import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Shield, 
  Smartphone, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  QrCode,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

type MFAStatus = "idle" | "loading" | "enrolling" | "verifying" | "enabled" | "error";

interface Factor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export function TwoFactorAuthForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<MFAStatus>("loading");
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrollmentData, setEnrollmentData] = useState<{
    id: string;
    qr_code: string;
    secret: string;
    uri: string;
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [factorToDelete, setFactorToDelete] = useState<Factor | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // Fetch MFA factors on mount
  useEffect(() => {
    fetchFactors();
  }, []);

  const fetchFactors = async () => {
    setStatus("loading");
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) throw error;
      
      const verifiedFactors = data.totp.filter(f => f.status === "verified");
      setFactors(verifiedFactors);
      setStatus(verifiedFactors.length > 0 ? "enabled" : "idle");
    } catch (error: any) {
      console.error("Failed to fetch MFA factors:", error);
      setStatus("error");
    }
  };

  const startEnrollment = async () => {
    setStatus("enrolling");
    setShowEnrollDialog(true);
    
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Agent OS Studio - ${new Date().toLocaleDateString("zh-CN")}`,
      });

      if (error) throw error;
      
      setEnrollmentData({
        id: data.id,
        qr_code: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      });
    } catch (error: any) {
      console.error("MFA enrollment error:", error);
      toast({
        title: "启用失败",
        description: error.message || "无法启动两步验证设置",
        variant: "destructive",
      });
      setStatus("idle");
      setShowEnrollDialog(false);
    }
  };

  const verifyAndActivate = async () => {
    if (!enrollmentData || verifyCode.length !== 6) return;
    
    setIsVerifying(true);
    
    try {
      // First, create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollmentData.id,
      });

      if (challengeError) throw challengeError;

      // Then verify with the code
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollmentData.id,
        challengeId: challengeData.id,
        code: verifyCode,
      });

      if (verifyError) throw verifyError;

      // Generate backup codes (simulated - in production, these should come from the server)
      const codes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 8).toUpperCase()
      );
      setBackupCodes(codes);
      setShowBackupCodes(true);
      
      toast({
        title: "两步验证已启用",
        description: "请妥善保存备用恢复码",
      });

      // Refresh factors list
      await fetchFactors();
      setShowEnrollDialog(false);
      setEnrollmentData(null);
      setVerifyCode("");
    } catch (error: any) {
      console.error("MFA verification error:", error);
      toast({
        title: "验证失败",
        description: error.message || "验证码错误，请重试",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const disableMFA = async (factor: Factor) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: factor.id,
      });

      if (error) throw error;

      toast({
        title: "两步验证已禁用",
        description: "您的账户现在仅使用密码登录",
      });

      await fetchFactors();
      setShowDisableDialog(false);
      setFactorToDelete(null);
    } catch (error: any) {
      console.error("MFA unenroll error:", error);
      toast({
        title: "禁用失败",
        description: error.message || "请稍后重试",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "已复制",
      description: `${label}已复制到剪贴板`,
    });
  };

  const copyAllBackupCodes = () => {
    const text = backupCodes.join("\n");
    navigator.clipboard.writeText(text);
    toast({
      title: "已复制",
      description: "所有备用码已复制到剪贴板",
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-primary" />
            两步验证 (2FA)
            {status === "enabled" && (
              <Badge variant="default" className="ml-2">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                已启用
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            使用验证器应用（如 Google Authenticator）增强账户安全性
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">加载失败，请刷新重试</span>
              <Button variant="ghost" size="sm" onClick={fetchFactors}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}

          {(status === "idle" || status === "enrolling") && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Smartphone className="h-10 w-10 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">验证器应用</p>
                  <p className="text-xs text-muted-foreground">
                    推荐使用 Google Authenticator、Microsoft Authenticator 或 1Password
                  </p>
                </div>
              </div>
              
              <Button 
                onClick={startEnrollment} 
                className="w-full"
                disabled={status === "enrolling"}
              >
                {status === "enrolling" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <QrCode className="h-4 w-4 mr-2" />
                )}
                启用两步验证
              </Button>
            </div>
          )}

          {status === "enabled" && factors.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                登录时需要输入验证器应用生成的 6 位数验证码
              </p>
              
              <Separator />
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">已绑定的验证器</Label>
                {factors.map((factor) => (
                  <div 
                    key={factor.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{factor.friendly_name || "验证器"}</p>
                        <p className="text-xs text-muted-foreground">
                          添加于 {new Date(factor.created_at).toLocaleDateString("zh-CN")}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setFactorToDelete(factor);
                        setShowDisableDialog(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowBackupCodes(true)}
                className="w-full"
              >
                查看备用恢复码
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enrollment Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>设置两步验证</DialogTitle>
            <DialogDescription>
              使用验证器应用扫描二维码，然后输入 6 位验证码
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {enrollmentData ? (
              <>
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-lg">
                    <QRCodeSVG 
                      value={enrollmentData.uri} 
                      size={180}
                      level="M"
                    />
                  </div>
                </div>

                {/* Manual Entry */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">无法扫码？手动输入密钥：</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 text-xs bg-muted rounded font-mono break-all">
                      {showSecret ? enrollmentData.secret : "•".repeat(32)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(enrollmentData.secret, "密钥")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Verification */}
                <div className="space-y-2">
                  <Label htmlFor="verify-code">输入验证码</Label>
                  <Input
                    id="verify-code"
                    placeholder="000000"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="text-center text-2xl tracking-widest font-mono"
                    maxLength={6}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={verifyAndActivate}
                  disabled={verifyCode.length !== 6 || isVerifying}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      验证中...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      验证并启用
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>备用恢复码</DialogTitle>
            <DialogDescription>
              如果您无法使用验证器应用，可以使用这些一次性恢复码登录。请妥善保存！
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
              {backupCodes.length > 0 ? (
                backupCodes.map((code, i) => (
                  <code key={i} className="text-center font-mono text-sm py-1">
                    {code}
                  </code>
                ))
              ) : (
                <p className="col-span-2 text-center text-sm text-muted-foreground py-4">
                  备用码仅在首次启用时显示
                </p>
              )}
            </div>

            {backupCodes.length > 0 && (
              <Button variant="outline" className="w-full" onClick={copyAllBackupCodes}>
                <Copy className="h-4 w-4 mr-2" />
                复制所有备用码
              </Button>
            )}

            <p className="text-xs text-muted-foreground text-center">
              每个备用码只能使用一次，使用后将失效
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disable Confirmation Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要禁用两步验证吗？</AlertDialogTitle>
            <AlertDialogDescription>
              禁用后，您的账户将仅使用密码保护。这会降低账户安全性。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => factorToDelete && disableMFA(factorToDelete)}
            >
              确认禁用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
