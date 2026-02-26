import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, XCircle, Coins, ArrowRight, Home } from "lucide-react";
import { useTokenWallet } from "@/hooks/useTokenWallet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type PaymentStatus = "loading" | "success" | "error";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { refresh, wallet } = useTokenWallet();
  
  const [status, setStatus] = useState<PaymentStatus>("loading");
  const [tokensAdded, setTokensAdded] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  // Get session_id from URL (Stripe redirect)
  const sessionId = searchParams.get("session_id");
  const orderId = searchParams.get("order_id");
  
  useEffect(() => {
    const verifyPayment = async () => {
      if (!user) {
        setStatus("error");
        setErrorMessage("请先登录");
        return;
      }

      // If we have an order_id, verify and complete it
      if (orderId) {
        try {
          const { data, error } = await supabase.functions.invoke("wallet-topup", {
            body: { action: "complete_order", orderId },
          });
          
          if (error || data.error) {
            throw new Error(data?.error || error?.message || "验证失败");
          }
          
          setTokensAdded(data.tokensAdded || 0);
          setStatus("success");
          refresh();
        } catch (err: any) {
          console.error("Payment verification error:", err);
          setStatus("error");
          setErrorMessage(err.message || "支付验证失败");
        }
        return;
      }
      
      // If we have a session_id from Stripe, verify it
      if (sessionId) {
        try {
          const { data, error } = await supabase.functions.invoke("wallet-topup", {
            body: { action: "verify_session", sessionId },
          });
          
          if (error || data.error) {
            throw new Error(data?.error || error?.message || "验证失败");
          }
          
          setTokensAdded(data.tokensAdded || 0);
          setStatus("success");
          refresh();
        } catch (err: any) {
          console.error("Session verification error:", err);
          setStatus("error");
          setErrorMessage(err.message || "支付验证失败");
        }
        return;
      }
      
      // No session or order, show generic success
      setStatus("success");
      refresh();
    };
    
    verifyPayment();
  }, [sessionId, orderId, user, refresh]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <CardTitle>正在验证支付...</CardTitle>
              <CardDescription>请稍候，正在确认您的支付状态</CardDescription>
            </>
          )}
          
          {status === "success" && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle className="text-green-600">支付成功！</CardTitle>
              <CardDescription>Token 已充值到您的账户</CardDescription>
            </>
          )}
          
          {status === "error" && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-destructive">支付处理失败</CardTitle>
              <CardDescription>{errorMessage || "请联系客服获取帮助"}</CardDescription>
            </>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          {status === "success" && (
            <>
              {tokensAdded > 0 && (
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary">
                    <Coins className="h-6 w-6" />
                    +{tokensAdded.toLocaleString()} Token
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    当前余额: {wallet?.balance?.toLocaleString() || 0} Token
                  </p>
                </div>
              )}
              
              <div className="space-y-3">
                <Button 
                  className="w-full gap-2" 
                  onClick={() => navigate("/hive?tab=runtime")}
                >
                  开始使用
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => navigate("/")}
                >
                  <Home className="h-4 w-4" />
                  返回首页
                </Button>
              </div>
            </>
          )}
          
          {status === "error" && (
            <div className="space-y-3">
              <Button 
                className="w-full" 
                onClick={() => navigate("/")}
              >
                返回首页
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                如有问题，请联系客服或发送邮件至 support@example.com
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
