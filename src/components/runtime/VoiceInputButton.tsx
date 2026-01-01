import React, { useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  disabled = false,
  className,
}) => {
  const {
    isListening,
    isSupported,
    transcript,
    toggleListening,
    stopListening,
  } = useVoiceInput({
    onTranscript: (text) => {
      onTranscript(text);
      toast.success("语音识别完成");
    },
    onError: (error) => {
      toast.error(error);
    },
    language: "zh-CN",
    continuous: false,
  });

  // Show interim transcript as toast
  useEffect(() => {
    if (transcript && isListening) {
      // Show current transcript in a subtle way
    }
  }, [transcript, isListening]);

  // Stop listening when disabled
  useEffect(() => {
    if (disabled && isListening) {
      stopListening();
    }
  }, [disabled, isListening, stopListening]);

  if (!isSupported) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled
            className={cn("opacity-50", className)}
          >
            <MicOff className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>您的浏览器不支持语音识别</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isListening ? "default" : "ghost"}
          size="icon"
          onClick={toggleListening}
          disabled={disabled}
          className={cn(
            "relative transition-all duration-200",
            isListening && "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
            className
          )}
        >
          {isListening ? (
            <>
              <Mic className="h-5 w-5 animate-pulse" />
              {/* Pulsing ring effect */}
              <span className="absolute inset-0 rounded-md animate-ping bg-destructive/30" />
            </>
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isListening ? "点击停止录音" : "点击开始语音输入"}</p>
        {transcript && isListening && (
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
            识别中: {transcript}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

export default VoiceInputButton;
