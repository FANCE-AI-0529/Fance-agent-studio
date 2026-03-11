import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card.tsx";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { Textarea } from "../ui/textarea.tsx";
import { Switch } from "../ui/switch.tsx";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar.tsx";
import { Separator } from "../ui/separator.tsx";
import { useToast } from "../../hooks/use-toast.ts";
import { useAuth } from "../../contexts/AuthContext.tsx";
import { useLanguage } from "../../contexts/LanguageContext.tsx";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../integrations/supabase/client.ts";
import { useUpdateProfile, useUploadAvatar } from "../../hooks/useProfileUpdate.ts";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "../../hooks/useNotificationPreferences.ts";
import { useIsAdmin } from "../../hooks/useAdminInvite.ts";
import { GlobalModelSettings } from "./GlobalModelSettings.tsx";
import { MCPServerManager } from "./MCPServerManager.tsx";
import { ModelProviderSettings } from "./ModelProviderSettings.tsx";
import { ChangePasswordForm } from "./ChangePasswordForm.tsx";
import { TwoFactorAuthForm } from "./TwoFactorAuthForm.tsx";
import { DataExportForm } from "./DataExportForm.tsx";
import { cn } from "../../lib/utils.ts";
import {
  Settings,
  User,
  Bell,
  Globe,
  Shield,
  Info,
  Camera,
  Loader2,
  ExternalLink,
  Cpu,
  Server,
} from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { data: isAdmin } = useIsAdmin();
  
  // Profile state
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  
  // Notification preferences
  const { data: notificationPrefs } = useNotificationPreferences();
  const updateNotificationPrefs = useUpdateNotificationPreferences();

  // Fetch profile data
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Initialize form when profile loads or dialog opens
  useEffect(() => {
    if (profile && open) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatar_url || "");
      setAvatarPreview(profile.avatar_url || "");
    }
  }, [profile, open]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "文件过大", description: "头像大小不能超过2MB", variant: "destructive" });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({ title: "格式错误", description: "请选择图片文件", variant: "destructive" });
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    try {
      const url = await uploadAvatar.mutateAsync(file);
      setAvatarUrl(url);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  const handleSaveProfile = () => {
    updateProfile.mutate({
      display_name: displayName,
      bio,
      avatar_url: avatarUrl,
    }, {
      onSuccess: () => {
        toast({ title: "保存成功", description: "个人资料已更新" });
      }
    });
  };

  const handleNotificationChange = (key: "push" | "email" | "marketing", value: boolean) => {
    if (notificationPrefs) {
      updateNotificationPrefs.mutate({
        ...notificationPrefs,
        [key]: value,
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            设置
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className={cn("grid w-full", isAdmin ? "grid-cols-8" : "grid-cols-7")}>
            <TabsTrigger value="profile" className="text-xs sm:text-sm">
              <User className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">资料</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm">
              <Bell className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">通知</span>
            </TabsTrigger>
            <TabsTrigger value="language" className="text-xs sm:text-sm">
              <Globe className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">语言</span>
            </TabsTrigger>
            <TabsTrigger value="model-providers" className="text-xs sm:text-sm">
              <Cpu className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">模型</span>
            </TabsTrigger>
            <TabsTrigger value="mcp-servers" className="text-xs sm:text-sm">
              <Server className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">MCP</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs sm:text-sm">
              <Shield className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">安全</span>
            </TabsTrigger>
            <TabsTrigger value="about" className="text-xs sm:text-sm">
              <Info className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">关于</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="global-model-config" className="text-xs sm:text-sm">
                <Settings className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">全局</span>
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-4 m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">个人资料</CardTitle>
                  <CardDescription>更新您的个人信息</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={avatarPreview} />
                        <AvatarFallback className="text-lg">
                          {displayName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <label className="absolute bottom-0 right-0 p-1 bg-primary rounded-full cursor-pointer hover:bg-primary/90">
                        <Camera className="h-4 w-4 text-primary-foreground" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarChange}
                        />
                      </label>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>点击更换头像</p>
                      <p>支持 JPG、PNG，最大 2MB</p>
                    </div>
                  </div>

                  {/* Display Name */}
                  <div className="space-y-2">
                    <Label htmlFor="displayName">昵称</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="输入昵称"
                    />
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label htmlFor="bio">个人简介</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="介绍一下自己..."
                      rows={3}
                    />
                  </div>

                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={updateProfile.isPending}
                    className="w-full sm:w-auto"
                  >
                    {updateProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    保存修改
                  </Button>
                </CardContent>
              </Card>

              {/* Data Export in Profile Tab */}
              <DataExportForm />
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-4 m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">通知设置</CardTitle>
                  <CardDescription>管理您的通知偏好</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>推送通知</Label>
                      <p className="text-sm text-muted-foreground">接收浏览器推送通知</p>
                    </div>
                    <Switch
                      checked={notificationPrefs?.push ?? true}
                      onCheckedChange={(checked) => handleNotificationChange("push", checked)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>邮件通知</Label>
                      <p className="text-sm text-muted-foreground">接收重要更新邮件</p>
                    </div>
                    <Switch
                      checked={notificationPrefs?.email ?? true}
                      onCheckedChange={(checked) => handleNotificationChange("email", checked)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>营销邮件</Label>
                      <p className="text-sm text-muted-foreground">接收产品更新和优惠信息</p>
                    </div>
                    <Switch
                      checked={notificationPrefs?.marketing ?? false}
                      onCheckedChange={(checked) => handleNotificationChange("marketing", checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Language Tab */}
            <TabsContent value="language" className="space-y-4 m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">语言与显示</CardTitle>
                  <CardDescription>设置界面语言和主题</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Language */}
                  <div className="space-y-3">
                    <Label>界面语言</Label>
                    <RadioGroup value={language} onValueChange={(v) => setLanguage(v as "zh" | "en")}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="zh" id="lang-zh" />
                        <Label htmlFor="lang-zh" className="cursor-pointer">🇨🇳 中文</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="en" id="lang-en" />
                        <Label htmlFor="lang-en" className="cursor-pointer">🇺🇸 English</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator />

                  {/* Theme */}
                  <div className="space-y-3">
                    <Label>主题</Label>
                    <RadioGroup value={theme || "system"} onValueChange={setTheme}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="light" id="theme-light" />
                        <Label htmlFor="theme-light" className="cursor-pointer">浅色</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="dark" id="theme-dark" />
                        <Label htmlFor="theme-dark" className="cursor-pointer">深色</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="system" id="theme-system" />
                        <Label htmlFor="theme-system" className="cursor-pointer">跟随系统</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Model Providers Tab */}
            <TabsContent value="model-providers" className="space-y-4 m-0">
              <ModelProviderSettings />
            </TabsContent>

            {/* MCP Servers Tab */}
            <TabsContent value="mcp-servers" className="space-y-4 m-0">
              <MCPServerManager />
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-4 m-0">
              {/* Password Change */}
              <ChangePasswordForm />
              
              {/* Two-Factor Auth */}
              <TwoFactorAuthForm />

              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-base text-destructive">危险区域</CardTitle>
                  <CardDescription>此操作不可撤销</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>退出登录</Label>
                      <p className="text-sm text-muted-foreground">退出当前账户</p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleSignOut}>
                      退出
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* About Tab */}
            <TabsContent value="about" className="space-y-4 m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">关于 Fance Studio</CardTitle>
                  <CardDescription>版本信息和相关链接</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">版本</span>
                      <span>v1.0.0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">构建日期</span>
                      <span>2026-01-04</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start" asChild>
                      <a href="https://example.com/privacy" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        隐私政策
                      </a>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" asChild>
                      <a href="https://example.com/terms" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        服务条款
                      </a>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" asChild>
                      <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        开源许可
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Global Model Config Tab (Admin Only) */}
            {isAdmin && (
              <TabsContent value="global-model-config" className="space-y-4 m-0">
                <GlobalModelSettings />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
