import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card.tsx";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group.tsx";
import { Switch } from "../ui/switch.tsx";
import { Badge } from "../ui/badge.tsx";
import { Skeleton } from "../ui/skeleton.tsx";
import { useSkillPricing } from "../../hooks/useSkillPricing.ts";
import type { PricingModel, BulkDiscount } from "../../types/economy.ts";
import { 
  Tag, 
  Coins, 
  Calendar, 
  ShoppingBag, 
  Gift,
  TrendingUp,
  Info,
  Loader2,
  Trash2
} from "lucide-react";
import { cn } from "../../lib/utils.ts";

interface SkillPricingEditorProps {
  skillId: string;
  onSaved?: () => void;
}

export function SkillPricingEditor({ skillId, onSaved }: SkillPricingEditorProps) {
  const { pricing, isLoading, updatePricing, deletePricing, isPaid } = useSkillPricing(skillId);
  
  const [model, setModel] = useState<PricingModel>("free");
  const [pricePerCall, setPricePerCall] = useState<number>(5);
  const [monthlyPrice, setMonthlyPrice] = useState<number>(100);
  const [yearlyPrice, setYearlyPrice] = useState<number>(1000);
  const [oneTimePrice, setOneTimePrice] = useState<number>(500);
  const [trialCalls, setTrialCalls] = useState<number>(5);
  const [enableTrial, setEnableTrial] = useState(false);
  const [bulkDiscounts, setBulkDiscounts] = useState<BulkDiscount[]>([]);

  // Initialize from existing pricing
  useEffect(() => {
    if (pricing) {
      setModel(pricing.pricing_model as PricingModel);
      setPricePerCall(pricing.price_per_call || 5);
      setMonthlyPrice(pricing.monthly_price || 100);
      setYearlyPrice(pricing.yearly_price || 1000);
      setOneTimePrice(pricing.one_time_price || 500);
      setTrialCalls(pricing.trial_calls || 5);
      setEnableTrial((pricing.trial_calls || 0) > 0);
      setBulkDiscounts((pricing.bulk_discounts as unknown as BulkDiscount[]) || []);
    }
  }, [pricing]);

  const handleSave = async () => {
    await updatePricing.mutateAsync({
      pricingModel: model,
      pricePerCall: model === "per_call" ? pricePerCall : undefined,
      monthlyPrice: model === "subscription" ? monthlyPrice : undefined,
      yearlyPrice: model === "subscription" ? yearlyPrice : undefined,
      oneTimePrice: model === "one_time" ? oneTimePrice : undefined,
      trialCalls: enableTrial ? trialCalls : 0,
      bulkDiscounts,
    });
    onSaved?.();
  };

  const handleDelete = async () => {
    await deletePricing.mutateAsync();
    setModel("free");
    onSaved?.();
  };

  const estimatedMonthlyRevenue = () => {
    // Rough estimation based on model
    const avgCallsPerMonth = 500; // Assumed average
    const avgSubscribers = 20;
    
    switch (model) {
      case "per_call":
        return avgCallsPerMonth * pricePerCall * 0.7;
      case "subscription":
        return avgSubscribers * monthlyPrice * 0.7;
      case "one_time":
        return (avgSubscribers / 3) * oneTimePrice * 0.7;
      default:
        return 0;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          定价设置
        </CardTitle>
        <CardDescription>
          设置技能的收费模式和价格，开始赚取收益
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Pricing Model Selection */}
        <RadioGroup value={model} onValueChange={(v) => setModel(v as PricingModel)}>
          <div className="grid grid-cols-2 gap-3">
            <Label
              htmlFor="free"
              className={cn(
                "flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all",
                model === "free" ? "ring-2 ring-primary border-primary bg-primary/5" : "hover:border-primary/50"
              )}
            >
              <RadioGroupItem value="free" id="free" className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-green-500" />
                  <span className="font-medium">免费</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">对所有用户免费开放</p>
              </div>
            </Label>

            <Label
              htmlFor="per_call"
              className={cn(
                "flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all",
                model === "per_call" ? "ring-2 ring-primary border-primary bg-primary/5" : "hover:border-primary/50"
              )}
            >
              <RadioGroupItem value="per_call" id="per_call" className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">按次计费</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">每次调用收取 Token</p>
              </div>
            </Label>

            <Label
              htmlFor="subscription"
              className={cn(
                "flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all",
                model === "subscription" ? "ring-2 ring-primary border-primary bg-primary/5" : "hover:border-primary/50"
              )}
            >
              <RadioGroupItem value="subscription" id="subscription" className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">订阅制</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">按月/年订阅无限使用</p>
              </div>
            </Label>

            <Label
              htmlFor="one_time"
              className={cn(
                "flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all",
                model === "one_time" ? "ring-2 ring-primary border-primary bg-primary/5" : "hover:border-primary/50"
              )}
            >
              <RadioGroupItem value="one_time" id="one_time" className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">一次性购买</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">买断后永久使用</p>
              </div>
            </Label>
          </div>
        </RadioGroup>

        {/* Price Settings based on model */}
        {model === "per_call" && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Label htmlFor="pricePerCall">每次调用价格</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="pricePerCall"
                  type="number"
                  min={1}
                  value={pricePerCall}
                  onChange={(e) => setPricePerCall(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-muted-foreground">Token</span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                建议: 简单查询 1-5T, 复杂计算 10-50T, 外部API 50-100T
              </p>
            </div>
          </div>
        )}

        {model === "subscription" && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyPrice">月费</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="monthlyPrice"
                    type="number"
                    min={10}
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">T/月</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearlyPrice">年费</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="yearlyPrice"
                    type="number"
                    min={100}
                    value={yearlyPrice}
                    onChange={(e) => setYearlyPrice(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">T/年</span>
                </div>
              </div>
            </div>
            {yearlyPrice < monthlyPrice * 12 && (
              <Badge variant="secondary" className="text-xs">
                年费优惠 {Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100)}%
              </Badge>
            )}
          </div>
        )}

        {model === "one_time" && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Label htmlFor="oneTimePrice">买断价格</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="oneTimePrice"
                  type="number"
                  min={50}
                  value={oneTimePrice}
                  onChange={(e) => setOneTimePrice(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-muted-foreground">Token</span>
              </div>
            </div>
          </div>
        )}

        {/* Trial Settings */}
        {model !== "free" && (
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="enableTrial">免费试用</Label>
              <p className="text-xs text-muted-foreground">
                允许用户免费试用 {trialCalls} 次
              </p>
            </div>
            <div className="flex items-center gap-3">
              {enableTrial && (
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={trialCalls}
                  onChange={(e) => setTrialCalls(Number(e.target.value))}
                  className="w-16 h-8"
                />
              )}
              <Switch
                id="enableTrial"
                checked={enableTrial}
                onCheckedChange={setEnableTrial}
              />
            </div>
          </div>
        )}

        {/* Revenue Share Info */}
        <div className="p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="font-medium text-sm">收益分成</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>开发者 70%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground" />
              <span>平台 30%</span>
            </div>
          </div>
        </div>

        {/* Estimated Revenue */}
        {model !== "free" && (
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-1">预估月收益</p>
              <div className="text-2xl font-bold text-green-500">
                ≈ {Math.round(estimatedMonthlyRevenue()).toLocaleString()} Token
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                基于同类技能平均调用量估算，实际收益取决于技能质量和推广
              </p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={updatePricing.isPending}
          >
            {updatePricing.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              "保存定价设置"
            )}
          </Button>
          
          {isPaid && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleDelete}
              disabled={deletePricing.isPending}
            >
              {deletePricing.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" />
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
