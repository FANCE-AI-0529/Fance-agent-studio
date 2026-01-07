import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShieldCheck, ShieldX } from "lucide-react";

interface MathCaptchaProps {
  onVerified: (verified: boolean) => void;
}

interface CaptchaQuestion {
  num1: number;
  num2: number;
  operator: "+" | "-" | "×";
  answer: number;
}

function generateQuestion(): CaptchaQuestion {
  const operators: Array<"+" | "-" | "×"> = ["+", "-", "×"];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  
  let num1: number, num2: number, answer: number;
  
  switch (operator) {
    case "+":
      num1 = Math.floor(Math.random() * 50) + 1;
      num2 = Math.floor(Math.random() * 50) + 1;
      answer = num1 + num2;
      break;
    case "-":
      num1 = Math.floor(Math.random() * 50) + 10;
      num2 = Math.floor(Math.random() * num1);
      answer = num1 - num2;
      break;
    case "×":
      num1 = Math.floor(Math.random() * 12) + 1;
      num2 = Math.floor(Math.random() * 12) + 1;
      answer = num1 * num2;
      break;
  }
  
  return { num1, num2, operator, answer };
}

export function MathCaptcha({ onVerified }: MathCaptchaProps) {
  const [question, setQuestion] = useState<CaptchaQuestion>(generateQuestion);
  const [userAnswer, setUserAnswer] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState("");

  const refreshQuestion = useCallback(() => {
    setQuestion(generateQuestion());
    setUserAnswer("");
    setIsVerified(false);
    setError("");
    onVerified(false);
  }, [onVerified]);

  // Reset on mount
  useEffect(() => {
    refreshQuestion();
  }, []);

  const handleVerify = () => {
    const parsed = parseInt(userAnswer, 10);
    
    if (isNaN(parsed)) {
      setError("请输入有效的数字");
      return;
    }
    
    if (parsed === question.answer) {
      setIsVerified(true);
      setError("");
      onVerified(true);
    } else {
      setAttempts(prev => prev + 1);
      setError("答案错误，请重试");
      onVerified(false);
      
      // After 3 failed attempts, generate a new question
      if (attempts >= 2) {
        setTimeout(() => {
          refreshQuestion();
          setAttempts(0);
        }, 1000);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleVerify();
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        安全验证 <span className="text-destructive">*</span>
      </Label>
      
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
        {/* Question display */}
        <div className="flex-1 flex items-center gap-2">
          <div className="bg-background px-3 py-2 rounded border font-mono text-lg font-semibold select-none">
            {question.num1} {question.operator} {question.num2} = ?
          </div>
          
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="答案"
            className="w-20 text-center font-mono"
            value={userAnswer}
            onChange={(e) => {
              setUserAnswer(e.target.value.replace(/[^0-9-]/g, ""));
              setError("");
            }}
            onKeyDown={handleKeyDown}
            disabled={isVerified}
          />
          
          {!isVerified ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleVerify}
              disabled={!userAnswer}
            >
              验证
            </Button>
          ) : (
            <div className="flex items-center gap-1 text-green-500">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-sm font-medium">已验证</span>
            </div>
          )}
        </div>
        
        {/* Refresh button */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={refreshQuestion}
          className="h-8 w-8"
          title="换一题"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <ShieldX className="h-3 w-3" />
          {error}
        </p>
      )}
      
      {attempts > 0 && !isVerified && (
        <p className="text-xs text-muted-foreground">
          剩余尝试次数: {3 - attempts}
        </p>
      )}
    </div>
  );
}
