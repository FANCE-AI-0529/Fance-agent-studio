// P3-03: AI Emotion Avatar - Display avatar expressions based on message sentiment
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type EmotionType = 
  | "neutral" 
  | "happy" 
  | "thinking" 
  | "excited" 
  | "confused" 
  | "error" 
  | "typing"
  | "success"
  | "warning";

interface AIEmotionAvatarProps {
  emotion?: EmotionType;
  size?: "sm" | "md" | "lg";
  agentName?: string;
  agentIcon?: string;
  className?: string;
  showEmotionBadge?: boolean;
}

// Emotion configurations
const emotionConfig: Record<EmotionType, {
  emoji: string;
  label: string;
  bgColor: string;
  borderColor: string;
  animation?: string;
}> = {
  neutral: {
    emoji: "😊",
    label: "平静",
    bgColor: "bg-muted",
    borderColor: "border-border",
  },
  happy: {
    emoji: "😄",
    label: "开心",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
  thinking: {
    emoji: "🤔",
    label: "思考中",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    animation: "animate-pulse",
  },
  excited: {
    emoji: "🎉",
    label: "激动",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
  confused: {
    emoji: "😕",
    label: "困惑",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
  },
  error: {
    emoji: "😰",
    label: "出错",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
  },
  typing: {
    emoji: "✍️",
    label: "输入中",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    animation: "animate-bounce",
  },
  success: {
    emoji: "✨",
    label: "成功",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
  warning: {
    emoji: "⚠️",
    label: "警告",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
};

const sizeConfig = {
  sm: { container: "w-8 h-8", emoji: "text-sm", badge: "text-[10px]" },
  md: { container: "w-10 h-10", emoji: "text-lg", badge: "text-xs" },
  lg: { container: "w-14 h-14", emoji: "text-2xl", badge: "text-sm" },
};

// Sentiment analysis helper
export function analyzeMessageSentiment(message: string): EmotionType {
  const lowerMessage = message.toLowerCase();
  
  // Error patterns
  if (/error|错误|失败|抱歉|无法|sorry|fail/i.test(lowerMessage)) {
    return "error";
  }
  
  // Warning patterns
  if (/警告|注意|warning|caution|小心/i.test(lowerMessage)) {
    return "warning";
  }
  
  // Success patterns
  if (/成功|完成|done|success|搞定|太棒了/i.test(lowerMessage)) {
    return "success";
  }
  
  // Excited patterns
  if (/!{2,}|太好了|awesome|amazing|wonderful|fantastic|🎉|🎊/i.test(lowerMessage)) {
    return "excited";
  }
  
  // Happy patterns
  if (/谢谢|感谢|thank|好的|明白|理解|😊|😄|👍/i.test(lowerMessage)) {
    return "happy";
  }
  
  // Confused patterns
  if (/\?{2,}|不太确定|不清楚|confused|unclear|什么意思/i.test(lowerMessage)) {
    return "confused";
  }
  
  // Thinking patterns
  if (/让我想想|思考|考虑|analyzing|processing|hmm|嗯/i.test(lowerMessage)) {
    return "thinking";
  }
  
  return "neutral";
}

export function AIEmotionAvatar({
  emotion = "neutral",
  size = "md",
  agentName,
  agentIcon,
  className,
  showEmotionBadge = false,
}: AIEmotionAvatarProps) {
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>(emotion);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const config = emotionConfig[currentEmotion];
  const sizeStyles = sizeConfig[size];

  // Animate emotion changes
  useEffect(() => {
    if (emotion !== currentEmotion) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setCurrentEmotion(emotion);
        setIsTransitioning(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [emotion, currentEmotion]);

  // Get display content
  const displayContent = useMemo(() => {
    if (agentIcon) {
      return <span className={sizeStyles.emoji}>{agentIcon}</span>;
    }
    return <span className={sizeStyles.emoji}>{config.emoji}</span>;
  }, [agentIcon, config.emoji, sizeStyles.emoji]);

  return (
    <div className={cn("relative inline-flex", className)}>
      <motion.div
        initial={{ scale: 1 }}
        animate={{ 
          scale: isTransitioning ? 0.8 : 1,
          rotate: currentEmotion === "excited" ? [0, -5, 5, 0] : 0,
        }}
        transition={{ 
          duration: 0.2,
          rotate: { duration: 0.5, repeat: currentEmotion === "excited" ? Infinity : 0 }
        }}
        className={cn(
          "flex items-center justify-center rounded-full border-2 transition-colors",
          sizeStyles.container,
          config.bgColor,
          config.borderColor,
          config.animation,
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentEmotion}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.15 }}
          >
            {displayContent}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Emotion Badge */}
      {showEmotionBadge && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full border",
            config.bgColor,
            config.borderColor,
            sizeStyles.badge,
          )}
        >
          {config.label}
        </motion.div>
      )}

      {/* Typing indicator dots */}
      {currentEmotion === "typing" && (
        <motion.div
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary"
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Thinking ring */}
      {currentEmotion === "thinking" && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/30"
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Success sparkles */}
      {currentEmotion === "success" && (
        <>
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                x: [0, (i - 1) * 15],
                y: [0, -10 - i * 5],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              style={{
                top: "50%",
                left: "50%",
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

// Hook for managing emotion state in chat
export function useAIEmotion(initialEmotion: EmotionType = "neutral") {
  const [emotion, setEmotion] = useState<EmotionType>(initialEmotion);
  const [messageContent, setMessageContent] = useState<string>("");

  // Auto-detect emotion from message
  const detectEmotion = (message: string) => {
    const detected = analyzeMessageSentiment(message);
    setMessageContent(message);
    setEmotion(detected);
    return detected;
  };

  // Manually set emotion
  const setManualEmotion = (newEmotion: EmotionType) => {
    setEmotion(newEmotion);
  };

  // Reset to neutral
  const reset = () => {
    setEmotion("neutral");
    setMessageContent("");
  };

  return {
    emotion,
    messageContent,
    detectEmotion,
    setEmotion: setManualEmotion,
    reset,
  };
}
