import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useAdminInvite";
import {
  useWaitingList,
  useWaitingListStats,
  useUpdateWaitingListStatus,
  useDeleteWaitingListEntries,
  useSendInviteToWaitingList,
} from "@/hooks/useWaitingList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Users,
  Mail,
  Clock,
  CheckCircle,
  Send,
  Trash2,
  Search,
  Loader2,
  UserCheck,
  TrendingUp,
} from "lucide-react";

export default function WaitingListAdmin() {
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: entries = [], isLoading } = useWaitingList();
  const { data: stats } = useWaitingListStats();
  const updateStatus = useUpdateWaitingListStatus();
  const deleteEntries = useDeleteWaitingListEntries();
  const sendInvite = useSendInviteToWaitingList();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [customMessage, setCustomMessage] = useState("");
  const [showMessageInput, setShowMessageInput] = useState(false);

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">您没有权限访问此页面</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filtered = entries.filter((entry) => {
    const matchesSearch = entry.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || entry.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((e) => e.id)));
    }
  };

  const selectedEmails = entries
    .filter((e) => selectedIds.has(e.id))
    .map((e) => e.email);

  const selectedPendingEmails = entries
    .filter((e) => selectedIds.has(e.id) && e.status === "pending")
    .map((e) => e.email);

  const handleSendInvites = () => {
    if (selectedPendingEmails.length === 0) return;
    sendInvite.mutate({
      emails: selectedPendingEmails,
      customMessage: customMessage || undefined,
    });
    setSelectedIds(new Set());
    setShowMessageInput(false);
    setCustomMessage("");
  };

  const handleDelete = () => {
    deleteEntries.mutate(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const statusBadge = (status: string | null) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />等待中</Badge>;
      case "invited":
        return <Badge className="bg-primary/20 text-primary border-primary/30"><Mail className="h-3 w-3 mr-1" />已邀请</Badge>;
      case "registered":
        return <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30"><CheckCircle className="h-3 w-3 mr-1" />已注册</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">等候名单管理</h1>
            <p className="text-muted-foreground text-sm">管理 Waiting List 中的邮箱，发送邀请码</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />总计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />等待中
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pending || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />已邀请
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.invited || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />今日新增
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.todayCount || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索邮箱..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">等待中</SelectItem>
              <SelectItem value="invited">已邀请</SelectItem>
              <SelectItem value="registered">已注册</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg border bg-muted/50">
            <span className="text-sm text-muted-foreground">
              已选择 <strong>{selectedIds.size}</strong> 项
            </span>
            <div className="flex gap-2 ml-auto">
              {selectedPendingEmails.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => setShowMessageInput(!showMessageInput)}
                  disabled={sendInvite.isPending}
                >
                  <Send className="h-4 w-4 mr-1" />
                  发送邀请 ({selectedPendingEmails.length})
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="h-4 w-4 mr-1" />删除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除</AlertDialogTitle>
                    <AlertDialogDescription>
                      将删除 {selectedIds.size} 条记录，此操作不可恢复。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>确认删除</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {/* Custom Message Input */}
        {showMessageInput && (
          <div className="mb-4 p-4 rounded-lg border bg-card space-y-3">
            <p className="text-sm text-muted-foreground">
              将向 {selectedPendingEmails.length} 个邮箱发送邀请码（可附带自定义消息）
            </p>
            <Textarea
              placeholder="添加自定义消息（可选）..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button onClick={handleSendInvites} disabled={sendInvite.isPending}>
                {sendInvite.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                确认发送
              </Button>
              <Button variant="ghost" onClick={() => setShowMessageInput(false)}>
                取消
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery || filterStatus !== "all" ? "没有匹配的记录" : "等候名单为空"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.size === filtered.length && filtered.length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead>来源</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>注册时间</TableHead>
                    <TableHead>邀请时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(entry.id)}
                          onCheckedChange={() => toggleSelect(entry.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{entry.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {entry.source === "hero_cta" ? "Hero" : entry.source === "bottom_cta" ? "Bottom" : entry.source || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>{statusBadge(entry.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {entry.created_at
                          ? new Date(entry.created_at).toLocaleDateString("zh-CN", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {entry.invited_at
                          ? new Date(entry.invited_at).toLocaleDateString("zh-CN", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
