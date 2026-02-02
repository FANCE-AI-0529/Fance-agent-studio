import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";

interface HeroInputProps {
  onSubmit: (value: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  defaultValue?: string;
}

export function HeroInput({ 
  onSubmit, 
  isLoading = false, 
  placeholder = "想构建什么样的数字员工？",
  defaultValue = ""
}: HeroInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (defaultValue) {
      setValue(defaultValue);
    }
  }, [defaultValue]);

  useEffect(() => {
    // Auto focus on mount
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    if (value.trim() && !isLoading) {
      onSubmit(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="w-full max-w-3xl mx-auto px-4"
    >
      {/* Glow effect */}
      <div className="relative">
        <motion.div
          className="absolute -inset-1 rounded-2xl opacity-50 blur-xl"
          animate={{
            background: isFocused 
              ? [
                  'linear-gradient(90deg, hsl(var(--primary) / 0.5) 0%, hsl(265 89% 78% / 0.5) 100%)',
                  'linear-gradient(180deg, hsl(var(--primary) / 0.5) 0%, hsl(265 89% 78% / 0.5) 100%)',
                  'linear-gradient(270deg, hsl(var(--primary) / 0.5) 0%, hsl(265 89% 78% / 0.5) 100%)',
                  'linear-gradient(360deg, hsl(var(--primary) / 0.5) 0%, hsl(265 89% 78% / 0.5) 100%)',
                ]
              : 'linear-gradient(90deg, hsl(var(--primary) / 0.2) 0%, hsl(265 89% 78% / 0.2) 100%)',
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Input container */}
        <div 
          className={`
            relative bg-card/80 backdrop-blur-xl rounded-2xl 
            border transition-all duration-300
            ${isFocused 
              ? 'border-primary/50 shadow-lg shadow-primary/10' 
              : 'border-border/50 hover:border-border'
            }
          `}
        >
          {/* Magic icon */}
          <div className="absolute left-5 top-1/2 -translate-y-1/2">
            <Sparkles className="h-5 w-5 text-primary/70" />
          </div>

          <AutoResizeTextarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            minRows={1}
            maxRows={5}
            className="
              w-full bg-transparent py-5 pl-14 pr-16
              text-foreground text-lg placeholder:text-muted-foreground/60
              focus:outline-none border-none focus-visible:ring-0 focus-visible:ring-offset-0
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          />

          {/* Submit button */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!value.trim() || isLoading}
              className="
                h-10 w-10 rounded-xl
                bg-primary hover:bg-primary/90
                disabled:opacity-30 disabled:cursor-not-allowed
                transition-all duration-200
              "
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Hint text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-xs text-muted-foreground/60 mt-3"
      >
        按 <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> 发送，
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Shift + Enter</kbd> 换行
      </motion.p>
    </motion.div>
  );
}
