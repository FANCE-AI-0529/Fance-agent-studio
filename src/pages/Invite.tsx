import { useState } from "react";
import { MainLayout } from "../components/layout/MainLayout.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.tsx";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.tsx";
import { Avatar, AvatarFallback } from "../components/ui/avatar.tsx";
import { Skeleton } from "../components/ui/skeleton.tsx";
import { useAuth } from "../contexts/AuthContext.tsx";
import { 
  useMyInviteCode, 
  useSentInvitations, 
  usePointsBalance, 
  usePointsHistory,
  useInvitationStats,
  useAcceptInvitation 
} from "../hooks/useInvite.ts";
import { useIsAdmin } from "../hooks/useAdminInvite.ts";
import { AdminInvitePanel } from "../components/invite/AdminInvitePanel.tsx";
import { 
  Gift, 
  Copy, 
  Check, 
  Users, 
  Coins, 
  Share2, 
  Clock,
  TrendingUp,
  Crown,
  Sparkles
} from "lucide-react";
import { toast } from "../hooks/use-toast.ts";
import { Link } from "react-router-dom";

export default function Invite() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState("");
  
  const { data: inviteCode, isLoading: codeLoading } = useMyInviteCode();
  const { data: stats } = useInvitationStats();
  const { data: pointsBalance = 0 } = usePointsBalance();
  const { data: pointsHistory = [], isLoading: historyLoading } = usePointsHistory();
  const { data: invitations = [], isLoading: invitationsLoading } = useSentInvitations();
  const acceptInvitation = useAcceptInvitation();
  const { data: isAdmin } = useIsAdmin();

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast({ title: "已复制邀请码" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    if (!inviteCode) return;
    
    const link = `${globalThis.location.origin}/auth?invite=${inviteCode}`;
    await navigator.clipboard.writeText(link);
    toast({ title: "已复制邀请链接" });
  };

  const handleAcceptCode = () => {
    if (!inputCode.trim()) return;
    acceptInvitation.mutate(inputCode.trim().toUpperCase());
    setInputCode("");
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <Gift className="h-12 w-12 mx-auto text-primary mb-4" />
              <CardTitle>邀请好友</CardTitle>
              <CardDescription>登录后即可获取您的专属邀请码</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/auth">
                <Button className="w-full">登录 / 注册</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <Gift className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">邀请好友</h1>
            <p className="text-muted-foreground">邀请好友注册，双方都可获得积分奖励</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <Coins className="h-5 w-5 text-primary" />
                  <Badge variant="secondary">积分</Badge>
                </div>
                <div className="text-2xl font-bold">{pointsBalance}</div>
                <p className="text-xs text-muted-foreground">当前积分</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <Users className="h-5 w-5 text-cognitive" />
                </div>
                <div className="text-2xl font-bold">{stats?.total || 0}</div>
                <p className="text-xs text-muted-foreground">已邀请</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <Check className="h-5 w-5 text-status-executing" />
                </div>
                <div className="text-2xl font-bold">{stats?.accepted || 0}</div>
                <p className="text-xs text-muted-foreground">已接受</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="h-5 w-5 text-governance" />
                </div>
                <div className="text-2xl font-bold">+{stats?.totalPoints || 0}</div>
                <p className="text-xs text-muted-foreground">获得积分</p>
              </CardContent>
            </Card>
          </div>

          {/* Admin Panel */}
          {isAdmin && <AdminInvitePanel />}

          {/* Invite Code Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                我的邀请码
              </CardTitle>
              <CardDescription>分享给好友，双方各得积分奖励</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-2xl text-center tracking-widest">
                  {codeLoading ? (
                    <Skeleton className="h-8 w-32 mx-auto" />
                  ) : (
                    inviteCode
                  )}
                </div>
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={handleCopyCode}
                  disabled={!inviteCode}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Button className="w-full gap-2" onClick={handleCopyLink} disabled={!inviteCode}>
                <Share2 className="h-4 w-4" />
                复制邀请链接
              </Button>
              
              {/* Rewards Info */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <Crown className="h-6 w-6 mx-auto text-primary mb-2" />
                  <div className="font-bold text-lg">+100 积分</div>
                  <p className="text-xs text-muted-foreground">邀请人奖励</p>
                </div>
                <div className="text-center p-4 bg-cognitive/5 rounded-lg">
                  <Gift className="h-6 w-6 mx-auto text-cognitive mb-2" />
                  <div className="font-bold text-lg">+50 积分</div>
                  <p className="text-xs text-muted-foreground">被邀请人奖励</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accept Invitation */}
          <Card>
            <CardHeader>
              <CardTitle>使用邀请码</CardTitle>
              <CardDescription>如果您有好友的邀请码，可以在这里输入</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  placeholder="输入邀请码"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  className="font-mono tracking-widest"
                  maxLength={8}
                />
                <Button 
                  onClick={handleAcceptCode}
                  disabled={!inputCode.trim() || acceptInvitation.isPending}
                >
                  确认
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for History */}
          <Tabs defaultValue="invitations">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="invitations">邀请记录</TabsTrigger>
              <TabsTrigger value="points">积分明细</TabsTrigger>
            </TabsList>

            <TabsContent value="invitations" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {invitationsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-32 mb-2" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : invitations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>暂无邀请记录</p>
                      <p className="text-sm">分享您的邀请码给好友吧</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {invitations.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {inv.invited_email?.charAt(0).toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {inv.invited_email || `邀请码: ${inv.invite_code}`}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(inv.created_at).toLocaleDateString("zh-CN")}
                              </p>
                            </div>
                          </div>
                          <Badge variant={inv.status === "accepted" ? "default" : "secondary"}>
                            {inv.status === "accepted" ? "已接受" : "待接受"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="points" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {historyLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      ))}
                    </div>
                  ) : pointsHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>暂无积分记录</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pointsHistory.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                          <div>
                            <p className="font-medium">{tx.description || tx.transaction_type}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(tx.created_at).toLocaleDateString("zh-CN")}
                            </p>
                          </div>
                          <span className={`font-bold ${tx.amount > 0 ? "text-status-executing" : "text-destructive"}`}>
                            {tx.amount > 0 ? "+" : ""}{tx.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
