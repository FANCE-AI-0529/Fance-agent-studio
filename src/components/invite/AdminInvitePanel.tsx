import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useBatchGenerateInviteCodes,
  useAllInviteCodes,
  useDeleteInviteCode,
  useAdminInviteStats,
} from "@/hooks/useAdminInvite";
import { 
  Shield, 
  Plus, 
  Loader2, 
  Copy, 
  Trash2, 
  Check,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Helper to check if code is expired
function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

// Helper to format expiration
function formatExpiration(expiresAt: string | null): string {
  if (!expiresAt) return "永久有效";
  const date = new Date(expiresAt);
  if (date < new Date()) return "已过期";
  return date.toLocaleDateString("zh-CN");
}

export function AdminInvitePanel() {
  const [generateCount, setGenerateCount] = useState(10);
  const [expiresInDays, setExpiresInDays] = useState<string>("0"); // 0 = no expiration
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const { data: stats, isLoading: statsLoading } = useAdminInviteStats();
  const { data: allCodes = [], isLoading: codesLoading } = useAllInviteCodes();
  const batchGenerate = useBatchGenerateInviteCodes();
  const deleteCode = useDeleteInviteCode();

  const handleGenerate = async () => {
    const days = parseInt(expiresInDays);
    await batchGenerate.mutateAsync({ 
      count: generateCount, 
      expiresInDays: days > 0 ? days : null 
    });
    setDialogOpen(false);
  };

  const handleCopy = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast({ title: "已复制邀请码" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCodes = () => {
    const pendingCodes = allCodes
      .filter(c => c.status === "pending" && !c.invited_user_id && !isExpired(c.expires_at))
      .map(c => c.invite_code);
    
    if (pendingCodes.length === 0) {
      toast({ title: "没有可导出的邀请码", variant: "destructive" });
      return;
    }

    const content = pendingCodes.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invite-codes-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: `已导出 ${pendingCodes.length} 个邀请码` });
  };

  // Get code status
  const getCodeStatus = (code: any) => {
    if (code.status === "accepted" || code.invited_user_id) {
      return "used";
    }
    if (isExpired(code.expires_at)) {
      return "expired";
    }
    return "available";
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          管理员面板
        </CardTitle>
        <CardDescription>批量生成和管理邀请码</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {statsLoading ? (
            <>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="text-center p-3 bg-card rounded-lg border">
                  <Skeleton className="h-6 w-8 mx-auto mb-1" />
                  <Skeleton className="h-3 w-12 mx-auto" />
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="text-center p-3 bg-card rounded-lg border">
                <div className="text-xl font-bold">{stats?.total || 0}</div>
                <p className="text-xs text-muted-foreground">总计</p>
              </div>
              <div className="text-center p-3 bg-card rounded-lg border">
                <div className="text-xl font-bold text-primary">{stats?.pending || 0}</div>
                <p className="text-xs text-muted-foreground">可用</p>
              </div>
              <div className="text-center p-3 bg-card rounded-lg border">
                <div className="text-xl font-bold text-green-500">{stats?.accepted || 0}</div>
                <p className="text-xs text-muted-foreground">已使用</p>
              </div>
              <div className="text-center p-3 bg-card rounded-lg border">
                <div className="text-xl font-bold">{stats?.todayCount || 0}</div>
                <p className="text-xs text-muted-foreground">今日生成</p>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                批量生成
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>批量生成邀请码</DialogTitle>
                <DialogDescription>
                  一次性生成多个邀请码，可设置有效期
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>生成数量</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={generateCount}
                    onChange={(e) => setGenerateCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                  />
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => setGenerateCount(10)}
                    >
                      10 个
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => setGenerateCount(25)}
                    >
                      25 个
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => setGenerateCount(50)}
                    >
                      50 个
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    有效期
                  </Label>
                  <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择有效期" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">永久有效</SelectItem>
                      <SelectItem value="1">1 天</SelectItem>
                      <SelectItem value="3">3 天</SelectItem>
                      <SelectItem value="7">7 天</SelectItem>
                      <SelectItem value="14">14 天</SelectItem>
                      <SelectItem value="30">30 天</SelectItem>
                      <SelectItem value="90">90 天</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {expiresInDays === "0" 
                      ? "邀请码将永久有效，直到被使用" 
                      : `邀请码将在 ${expiresInDays} 天后过期`
                    }
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button 
                  onClick={handleGenerate}
                  disabled={batchGenerate.isPending}
                >
                  {batchGenerate.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  生成 {generateCount} 个
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="gap-2" onClick={handleExportCodes}>
            <Download className="h-4 w-4" />
            导出可用码
          </Button>
        </div>

        {/* Code List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">邀请码列表</h4>
            <Badge variant="secondary">{allCodes.length} 个</Badge>
          </div>

          {codesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : allCodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>暂无邀请码</p>
              <p className="text-sm">点击"批量生成"创建邀请码</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>邀请码</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>有效期</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allCodes.map((code) => {
                    const status = getCodeStatus(code);
                    return (
                      <TableRow key={code.id} className={status === "expired" ? "opacity-50" : ""}>
                        <TableCell className="font-mono font-medium">
                          {code.invite_code}
                        </TableCell>
                        <TableCell>
                          {status === "used" ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              已使用
                            </Badge>
                          ) : status === "expired" ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              已过期
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" />
                              可用
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatExpiration(code.expires_at)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(code.created_at).toLocaleDateString("zh-CN")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleCopy(code.invite_code, code.id)}
                            >
                              {copiedId === code.id ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            {status !== "used" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => deleteCode.mutate(code.id)}
                                disabled={deleteCode.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
