import { DollarSign, ArrowUpRight, ArrowDownRight, Package, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx";
import { Badge } from "../ui/badge.tsx";
import { Skeleton } from "../ui/skeleton.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { useEarningsDetails } from "../../hooks/useDownloadTrends.ts";
import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";

const transactionTypeLabels: Record<string, string> = {
  sale: "技能销售",
  bundle_sale: "能力包销售",
  tip: "打赏",
  subscription: "订阅",
  refund: "退款",
};

export function EarningsDetailList() {
  const { data: earnings, isLoading } = useEarningsDetails(20);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            收益明细
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          收益明细
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {!earnings || earnings.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
            暂无收益记录
          </div>
        ) : (
          <ScrollArea className="h-[180px]">
            <div className="divide-y divide-border">
              {earnings.map((earning) => {
                const isPositive = earning.amount >= 0;
                const isBundleSale = earning.transaction_type === "bundle_sale";
                const displayName = isBundleSale ? earning.bundle_name : earning.skill_name;
                
                return (
                  <div
                    key={earning.id}
                    className="flex items-center justify-between px-6 py-3 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isPositive
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className={`text-[10px] ${isBundleSale ? "bg-primary/20 text-primary" : ""}`}
                          >
                            {transactionTypeLabels[earning.transaction_type] ||
                              earning.transaction_type}
                          </Badge>
                          {displayName && (
                            <span className="text-sm flex items-center gap-1 text-muted-foreground">
                              {isBundleSale ? (
                                <Layers className="h-3 w-3" />
                              ) : (
                                <Package className="h-3 w-3" />
                              )}
                              {displayName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(parseISO(earning.created_at), "M月d日 HH:mm", {
                            locale: zhCN,
                          })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-medium ${
                        isPositive ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {isPositive ? "+" : ""}¥{Math.abs(earning.amount).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
