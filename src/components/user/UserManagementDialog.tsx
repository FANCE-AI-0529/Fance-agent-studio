import { useState } from "react";
import { Copy, Gift, Link, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  useMyInviteCode, 
  useSentInvitations, 
  usePointsBalance, 
  useInvitationStats,
  useAcceptInvitation 
} from "@/hooks/useInvite";
import { AdminInvitePanel } from "@/components/invite/AdminInvitePanel";
import { format } from "date-fns";

interface UserManagementDialogProps {
  trigger?: React.ReactNode;
}

export function UserManagementDialog({ trigger }: UserManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [friendCode, setFriendCode] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { data: inviteCode } = useMyInviteCode();
  const { data: invitations, isLoading } = useSentInvitations();
  const { data: pointsBalance } = usePointsBalance();
  const { data: stats } = useInvitationStats();
  const acceptInvitation = useAcceptInvitation();

  const copyCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      toast({ title: "已复制", description: "邀请码已复制到剪贴板" });
    }
  };

  const copyLink = () => {
    if (inviteCode) {
      const link = `${window.location.origin}/auth?invite=${inviteCode}`;
      navigator.clipboard.writeText(link);
      toast({ title: "已复制", description: "邀请链接已复制到剪贴板" });
    }
  };

  const handleAcceptInvite = async () => {
    if (!friendCode.trim()) {
      toast({ title: "请输入邀请码", variant: "destructive" });
      return;
    }
    
    acceptInvitation.mutate(friendCode.trim());
    setFriendCode("");
  };

  // Check if user is admin (you may want to implement proper admin check)
  const isAdmin = user?.user_metadata?.is_admin === true;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" className="w-full justify-start">
            <Users className="h-4 w-4 mr-2" />
            用户管理
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            用户管理
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="my-invites" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-invites">我的邀请</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin">管理员面板</TabsTrigger>}
          </TabsList>

          <TabsContent value="my-invites" className="space-y-4 mt-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardHeader className="p-3">
                  <CardDescription className="text-xs">当前积分</CardDescription>
                  <CardTitle className="text-lg">{pointsBalance || 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="p-3">
                  <CardDescription className="text-xs">已邀请</CardDescription>
                  <CardTitle className="text-lg">{stats?.total || 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="p-3">
                  <CardDescription className="text-xs">已接受</CardDescription>
                  <CardTitle className="text-lg">{stats?.accepted || 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="p-3">
                  <CardDescription className="text-xs">获得积分</CardDescription>
                  <CardTitle className="text-lg">{stats?.totalPoints || 0}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* My Invite Code */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  我的邀请码
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded-md font-mono text-sm">
                    {inviteCode || "加载中..."}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyCode}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={copyLink}>
                    <Link className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  邀请好友注册，双方各获得 100 积分
                </p>
              </CardContent>
            </Card>

            {/* Accept Invite */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">使用好友邀请码</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="输入邀请码"
                    value={friendCode}
                    onChange={(e) => setFriendCode(e.target.value)}
                  />
                  <Button onClick={handleAcceptInvite} disabled={acceptInvitation.isPending}>
                    {acceptInvitation.isPending ? "验证中..." : "确认"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Invitation Records */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">邀请记录</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">加载中...</p>
                ) : invitations && invitations.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {invitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                        <span className="text-muted-foreground">
                          {inv.invited_email || "未使用"}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant={inv.status === "accepted" ? "default" : "secondary"}>
                            {inv.status === "accepted" ? "已接受" : "待使用"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(inv.created_at), "MM/dd")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">暂无邀请记录</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin" className="mt-4">
              <AdminInvitePanel />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
