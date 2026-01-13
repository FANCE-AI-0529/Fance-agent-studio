import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTokenWallet } from "@/hooks/useTokenWallet";
import { Coins, Sparkles, Zap, Crown, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TopupPackage {
  id: string;
  tokens: number;
  bonus: number;
  price: number;
  popular?: boolean;
  icon: React.ReactNode;
  label?: string;
}

const TOPUP_PACKAGES: TopupPackage[] = [
  {
    id: "starter",
    tokens: 500,
    bonus: 0,
    price: 9.9,
    icon: <Coins className="h-5 w-5" />,
  },
  {
    id: "basic",
    tokens: 1000,
    bonus: 100,
    price: 19,
    icon: <Zap className="h-5 w-5" />,
    label: "+10%",
  },
  {
    id: "popular",
    tokens: 3000,
    bonus: 500,
    price: 49,
    popular: true,
    icon: <Sparkles className="h-5 w-5" />,
    label: "+17%",
  },
  {
    id: "pro",
    tokens: 10000,
    bonus: 2500,
    price: 149,
    icon: <Crown className="h-5 w-5" />,
    label: "+25%",
  },
];

export function TopupDialog({ open, onOpenChange }: TopupDialogProps) {
  const { createTopupOrder } = useTokenWallet();
  const [selectedPackage, setSelectedPackage] = useState<string>("popular");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTopup = async () => {
    if (!selectedPackage) return;
    
    setIsProcessing(true);
    try {
      const result = await createTopupOrder.mutateAsync({
        packageId: selectedPackage,
        paymentMethod: "stripe",
      });
      
      // Redirect to payment if URL provided
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedPkg = TOPUP_PACKAGES.find((p) => p.id === selectedPackage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            充值 Token
          </DialogTitle>
          <DialogDescription>
            选择充值套餐，获得更多 Token 调用付费技能
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {TOPUP_PACKAGES.map((pkg) => (
            <Card
              key={pkg.id}
              className={cn(
                "cursor-pointer transition-all relative overflow-hidden",
                selectedPackage === pkg.id
                  ? "ring-2 ring-primary border-primary"
                  : "hover:border-primary/50",
                pkg.popular && "border-primary/50"
              )}
              onClick={() => setSelectedPackage(pkg.id)}
            >
              {pkg.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-bl-lg font-medium">
                  热门
                </div>
              )}
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    selectedPackage === pkg.id ? "bg-primary/20 text-primary" : "bg-muted"
                  )}>
                    {pkg.icon}
                  </div>
                  {pkg.label && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {pkg.label}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{pkg.tokens.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">T</span>
                  </div>
                  {pkg.bonus > 0 && (
                    <p className="text-xs text-green-500">
                      +{pkg.bonus} 赠送
                    </p>
                  )}
                  <p className="text-lg font-semibold text-primary">
                    ¥{pkg.price}
                  </p>
                </div>

                {selectedPackage === pkg.id && (
                  <div className="absolute bottom-2 right-2">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary */}
        {selectedPkg && (
          <Card className="bg-muted/50 mt-2">
            <CardContent className="py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">到账 Token</span>
                <span className="font-semibold">
                  {(selectedPkg.tokens + selectedPkg.bonus).toLocaleString()} T
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">单价</span>
                <span className="text-muted-foreground">
                  ≈ ¥{(selectedPkg.price / (selectedPkg.tokens + selectedPkg.bonus) * 100).toFixed(2)}/100T
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          className="w-full mt-2"
          size="lg"
          onClick={handleTopup}
          disabled={!selectedPackage || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              处理中...
            </>
          ) : (
            <>
              立即支付 ¥{selectedPkg?.price}
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          支付即表示同意《服务条款》和《隐私政策》
        </p>
      </DialogContent>
    </Dialog>
  );
}
