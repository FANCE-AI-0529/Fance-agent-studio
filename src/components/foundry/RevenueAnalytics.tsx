import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card.tsx";
import { Button } from "../ui/button.tsx";
import { Badge } from "../ui/badge.tsx";
import { Skeleton } from "../ui/skeleton.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Progress } from "../ui/progress.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.tsx";
import { useCreatorRevenue } from "../../hooks/useCreatorRevenue.ts";
import type { PayoutMethod } from "../../types/economy.ts";
import {
  TrendingUp,
  Wallet,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  Users,
  Zap,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "../../lib/utils.ts";

export function RevenueAnalytics() {
  const { summary, settlements, skillStats, isLoading, requestWithdrawal, canWithdraw } = useCreatorRevenue();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>("alipay");

  const handleWithdraw = async () => {
    if (!withdrawAmount || withdrawAmount < (summary?.minWithdrawal || 1000)) return;
    
    await requestWithdrawal.mutateAsync({
      amount: withdrawAmount,
      payoutMethod,
      payoutDetails: {},
    });
    
    setShowWithdraw(false);
    setWithdrawAmount(0);
  };

  const getSettlementStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">已完成</Badge>;
      case "processing":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">处理中</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">待处理</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">失败</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              可提现余额
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {(summary?.availableBalance || 0).toLocaleString()} T
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ≈ ¥{((summary?.availableBalance || 0) * (summary?.exchangeRate || 0.01)).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              本月收益
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              +{(summary?.thisMonthEarnings || 0).toLocaleString()} T
            </div>
            {summary?.lastMonthEarnings !== undefined && summary.thisMonthEarnings !== undefined && (
              <p className={cn(
                "text-xs mt-1 flex items-center gap-1",
                summary.thisMonthEarnings >= summary.lastMonthEarnings ? "text-green-500" : "text-red-500"
              )}>
                <ArrowUpRight className={cn(
                  "h-3 w-3",
                  summary.thisMonthEarnings < summary.lastMonthEarnings && "rotate-90"
                )} />
                {summary.lastMonthEarnings > 0
                  ? `${Math.round(((summary.thisMonthEarnings - summary.lastMonthEarnings) / summary.lastMonthEarnings) * 100)}% vs 上月`
                  : "新增收益"
                }
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              总调用次数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(summary?.totalCalls || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              本月 +{(summary?.thisMonthCalls || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              付费用户
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(summary?.uniquePayingUsers || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              累计服务用户
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Withdraw Button */}
      <div className="flex justify-end">
        <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
          <DialogTrigger asChild>
            <Button disabled={!canWithdraw}>
              <DollarSign className="h-4 w-4 mr-2" />
              申请提现
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>申请提现</DialogTitle>
              <DialogDescription>
                将 Token 收益提现到您的账户，最低提现 {summary?.minWithdrawal || 1000} Token
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">可提现余额</p>
                <p className="text-2xl font-bold text-green-500">
                  {(summary?.availableBalance || 0).toLocaleString()} T
                </p>
              </div>

              <div className="space-y-2">
                <Label>提现金额</Label>
                <Input
                  type="number"
                  min={summary?.minWithdrawal || 1000}
                  max={summary?.availableBalance || 0}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  placeholder={`最低 ${summary?.minWithdrawal || 1000} Token`}
                />
                <p className="text-xs text-muted-foreground">
                  预计到账 ≈ ¥{(withdrawAmount * (summary?.exchangeRate || 0.01)).toFixed(2)}
                </p>
              </div>

              <div className="space-y-2">
                <Label>提现方式</Label>
                <Select value={payoutMethod} onValueChange={(v) => setPayoutMethod(v as PayoutMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alipay">支付宝</SelectItem>
                    <SelectItem value="bank">银行卡</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={handleWithdraw}
                disabled={
                  requestWithdrawal.isPending ||
                  withdrawAmount < (summary?.minWithdrawal || 1000) ||
                  withdrawAmount > (summary?.availableBalance || 0)
                }
              >
                {requestWithdrawal.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    提交中...
                  </>
                ) : (
                  "确认提现"
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                提现申请将在 T+7 个工作日内处理
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Skill Performance */}
      {skillStats && skillStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              技能收益排行
            </CardTitle>
            <CardDescription>按收益排序的技能表现</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {skillStats
                .sort((a, b) => b.totalCreatorEarnings - a.totalCreatorEarnings)
                .slice(0, 5)
                .map((stat, index) => {
                  const maxEarnings = Math.max(...skillStats.map((s) => s.totalCreatorEarnings));
                  const percentage = maxEarnings > 0 ? (stat.totalCreatorEarnings / maxEarnings) * 100 : 0;

                  return (
                    <div key={stat.skillId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground w-4">
                            {index + 1}
                          </span>
                          <span className="font-medium">{stat.skillName}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {stat.totalCalls} 次调用
                          </span>
                          <span className="text-muted-foreground">
                            {stat.uniqueUsers} 用户
                          </span>
                          <span className="font-semibold text-green-500">
                            +{stat.totalCreatorEarnings} T
                          </span>
                        </div>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settlement History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            提现记录
          </CardTitle>
          <CardDescription>历史提现申请和处理状态</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {settlements && settlements.length > 0 ? (
              <div className="space-y-3">
                {settlements.map((settlement: any) => (
                  <div
                    key={settlement.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {settlement.total_tokens.toLocaleString()} Token
                        </span>
                        {getSettlementStatusBadge(settlement.status)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>
                          实际到账: ¥{settlement.currency_amount?.toFixed(2) || "—"}
                        </span>
                        <span>
                          {format(new Date(settlement.created_at), "yyyy-MM-dd HH:mm")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {settlement.status === "completed" && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {settlement.status === "failed" && (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      {settlement.status === "processing" && (
                        <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>暂无提现记录</p>
                <p className="text-sm mt-1">开始推广您的付费技能，赚取收益后即可提现</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
