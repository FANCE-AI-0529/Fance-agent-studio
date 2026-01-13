import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTokenWallet } from "@/hooks/useTokenWallet";
import { TopupDialog } from "./TopupDialog";
import { 
  Wallet, 
  Coins, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft,
  TrendingUp,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function WalletPanel() {
  const { wallet, transactions, isLoading, availableBalance } = useTokenWallet();
  const [showTopup, setShowTopup] = useState(false);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "topup":
      case "bonus":
      case "earn":
        return <ArrowDownLeft className="h-3 w-3 text-green-500" />;
      case "consume":
      case "withdraw":
        return <ArrowUpRight className="h-3 w-3 text-red-500" />;
      default:
        return <Coins className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case "topup": return "充值";
      case "consume": return "消费";
      case "earn": return "收益";
      case "refund": return "退款";
      case "bonus": return "奖励";
      case "withdraw": return "提现";
      default: return type;
    }
  };

  const calculateMonthlySpend = () => {
    if (!transactions) return 0;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return transactions
      .filter(tx => tx.transaction_type === "consume" && new Date(tx.created_at) >= startOfMonth)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="font-medium">
              {isLoading ? "..." : `${availableBalance.toLocaleString()} T`}
            </span>
          </Button>
        </SheetTrigger>

        <SheetContent className="w-[400px] sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Token 钱包
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Balance Card */}
            <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-background border-primary/20">
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="text-center space-y-2">
                    <Skeleton className="h-4 w-20 mx-auto" />
                    <Skeleton className="h-10 w-32 mx-auto" />
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">可用余额</p>
                    <p className="text-4xl font-bold mt-1 text-foreground">
                      {availableBalance.toLocaleString()}
                      <span className="text-lg ml-1 text-muted-foreground">T</span>
                    </p>
                    {wallet && wallet.frozen_balance > 0 && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" />
                        冻结中: {wallet.frozen_balance} T
                      </p>
                    )}
                  </div>
                )}

                <Button
                  className="w-full mt-4"
                  onClick={() => setShowTopup(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  充值
                </Button>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-xs text-muted-foreground">本月消费</p>
                  <p className="text-lg font-semibold text-destructive">
                    -{calculateMonthlySpend().toLocaleString()} T
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-xs text-muted-foreground">累计消费</p>
                  <p className="text-lg font-semibold text-foreground">
                    {wallet?.lifetime_spent?.toLocaleString() || 0} T
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Earned Stats for Creators */}
            {wallet && wallet.lifetime_earned > 0 && (
              <Card className="border-green-500/20 bg-green-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">创作者收益</span>
                    </div>
                    <span className="text-lg font-semibold text-green-500">
                      +{wallet.lifetime_earned.toLocaleString()} T
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transaction History */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                最近交易
              </h4>
              <ScrollArea className="h-[240px]">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : transactions && transactions.length > 0 ? (
                  <div className="space-y-1">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-full bg-muted">
                            {getTransactionIcon(tx.transaction_type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{tx.description}</p>
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {getTransactionLabel(tx.transaction_type)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), "MM-dd HH:mm")}
                            </p>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "font-medium tabular-nums",
                            tx.amount > 0 ? "text-green-500" : "text-destructive"
                          )}
                        >
                          {tx.amount > 0 ? "+" : ""}
                          {tx.amount} T
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Coins className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无交易记录</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <TopupDialog open={showTopup} onOpenChange={setShowTopup} />
    </>
  );
}
