import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  User,
  Settings,
  CreditCard,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Crown,
  Moon,
  Sun,
  Trophy,
  Target,
  Gift,
  FileText,
} from "lucide-react";
import { useTheme } from "next-themes";
import { LanguageSwitcher } from "@/components/settings/LanguageSwitcher";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import { EditProfileDialog } from "@/components/profile/EditProfileDialog";
import { SecurityAuditDashboard } from "@/components/profile/SecurityAuditDashboard";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("account");
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Notification preferences
  const { data: notifPrefs } = useNotificationPreferences();
  const updateNotifPrefs = useUpdateNotificationPreferences();

  const handleNotifChange = (key: "push" | "email" | "marketing", value: boolean) => {
    if (notifPrefs) {
      updateNotifPrefs.mutate({ ...notifPrefs, [key]: value });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
    toast({
      title: "已退出登录",
    });
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "用户";

  return (
    <div className="flex-1 overflow-auto pb-20 md:pb-0">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* 用户信息卡片 */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url} />
              <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{profile?.display_name || displayName}</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {profile?.bio && (
                <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">
                  <Crown className="h-3 w-3 mr-1" />
                  免费版
                </Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
              编辑资料
            </Button>
          </div>
        </div>

        {/* 快捷入口 */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground px-1">快捷入口</h2>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => navigate("/leaderboard")}
              className="bg-card border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors text-center"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
              <p className="font-medium text-sm">排行榜</p>
              <p className="text-xs text-muted-foreground mt-0.5">查看榜单</p>
            </button>
            <button
              onClick={() => navigate("/challenges")}
              className="bg-card border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors text-center"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <p className="font-medium text-sm">挑战活动</p>
              <p className="text-xs text-muted-foreground mt-0.5">参与活动</p>
            </button>
            <button
              onClick={() => navigate("/invite")}
              className="bg-card border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors text-center"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                <Gift className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="font-medium text-sm">邀请好友</p>
              <p className="text-xs text-muted-foreground mt-0.5">得奖励</p>
            </button>
          </div>
        </div>

        <EditProfileDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} />

        {/* 设置标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="account" className="gap-2">
              <User className="h-4 w-4" />
              账户
            </TabsTrigger>
            <TabsTrigger value="subscription" className="gap-2">
              <CreditCard className="h-4 w-4" />
              订阅
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Settings className="h-4 w-4" />
              偏好
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              通知
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <FileText className="h-4 w-4" />
              安全日志
            </TabsTrigger>
          </TabsList>

          {/* 账户设置 */}
          <TabsContent value="account" className="space-y-4 mt-6">
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium">个人信息</p>
                    <p className="text-sm text-muted-foreground">管理你的账户信息</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
              <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium">安全设置</p>
                    <p className="text-sm text-muted-foreground">密码、两步验证等</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <Button
              variant="destructive"
              className="w-full gap-2"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </Button>
          </TabsContent>

          {/* 订阅管理 */}
          <TabsContent value="subscription" className="mt-6">
            <PricingPlans currentPlan="free" />
          </TabsContent>

          {/* 偏好设置 */}
          <TabsContent value="preferences" className="space-y-4 mt-6">
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              {/* 主题设置 */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  {theme === "dark" ? (
                    <Moon className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Sun className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">深色模式</p>
                    <p className="text-sm text-muted-foreground">切换深色/浅色主题</p>
                  </div>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                />
              </div>

              {/* 语言设置 */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🌐</span>
                  <div>
                    <p className="font-medium">语言</p>
                    <p className="text-sm text-muted-foreground">选择界面语言</p>
                  </div>
                </div>
                <LanguageSwitcher />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 mt-6">
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">推送通知</p>
                  <p className="text-sm text-muted-foreground">接收重要更新和提醒</p>
                </div>
                <Switch 
                  checked={notifPrefs?.push ?? true}
                  onCheckedChange={(checked) => handleNotifChange("push", checked)}
                  disabled={updateNotifPrefs.isPending}
                />
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">邮件通知</p>
                  <p className="text-sm text-muted-foreground">接收周报和活动通知</p>
                </div>
                <Switch 
                  checked={notifPrefs?.email ?? true}
                  onCheckedChange={(checked) => handleNotifChange("email", checked)}
                  disabled={updateNotifPrefs.isPending}
                />
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">营销邮件</p>
                  <p className="text-sm text-muted-foreground">接收产品更新和优惠信息</p>
                </div>
                <Switch 
                  checked={notifPrefs?.marketing ?? false}
                  onCheckedChange={(checked) => handleNotifChange("marketing", checked)}
                  disabled={updateNotifPrefs.isPending}
                />
              </div>
            </div>
          </TabsContent>

          {/* 安全审计日志 */}
          <TabsContent value="security" className="mt-6">
            <SecurityAuditDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
