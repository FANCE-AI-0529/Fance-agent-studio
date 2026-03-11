import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { Badge } from "../ui/badge.tsx";
import { cn } from "../../lib/utils.ts";
import { supabase } from "../../integrations/supabase/client.ts";
import VoiceInputButton from "../runtime/VoiceInputButton.tsx";
import PersonalityConfigurator from "./PersonalityConfigurator.tsx";
import { PersonalityConfig, getDefaultPersonalityConfig, personalityPresets } from "../../utils/personalityToPrompt.ts";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface GeneratedConfig {
  name: string;
  department: string;
  systemPrompt: string;
  suggestedSkills: string[];
  personalityConfig: PersonalityConfig;
}

interface ConversationalCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (config: {
    name: string;
    department: string;
    systemPrompt: string;
    selectedSkillIds: string[];
    personalityConfig?: PersonalityConfig;
  }) => void;
  useVoice?: boolean;
}

export function ConversationalCreator({
  isOpen,
  onClose,
  onComplete,
  useVoice = false,
}: ConversationalCreatorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<GeneratedConfig | null>(null);
  const [personalityConfig, setPersonalityConfig] = useState<PersonalityConfig>(getDefaultPersonalityConfig());
  const [showPersonality, setShowPersonality] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize first message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const initialMessage = useVoice 
        ? "🎙️ 语音创建模式已启动！\n\n点击麦克风按钮，用语音告诉我你想创建什么样的AI助手。\n\n或者直接输入文字描述也可以~"
        : "你好！告诉我你想创建什么样的AI助手？\n\n比如：\"帮我写小红书文案的助手\" 或 \"一个专业的数据分析师\"";
      
      setTimeout(() => addAssistantMessage(initialMessage), 300);
    }
  }, [isOpen, useVoice]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current && !useVoice) {
      inputRef.current.focus();
    }
  }, [isOpen, useVoice]);

  const addAssistantMessage = (content: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content,
      }]);
      setIsTyping(false);
    }, 400);
  };

  const generateConfigFromDescription = async (description: string) => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("agent-config-generator", {
        body: { description }
      });

      if (error) throw error;

      const config = data as GeneratedConfig;
      setGeneratedConfig(config);
      setPersonalityConfig(config.personalityConfig || getDefaultPersonalityConfig());

      // Build summary message
      const presetName = config.personalityConfig?.preset 
        ? personalityPresets[config.personalityConfig.preset]?.name 
        : null;

      const summaryMessage = `✨ 配置已生成！

**${config.name}**
📁 部门：${config.department}
${presetName ? `😊 性格：${presetName}` : ""}
${config.suggestedSkills.length > 0 ? `🔧 推荐技能：${config.suggestedSkills.join("、")}` : ""}

你可以：
- 继续描述来调整配置
- 点击"性格调整"修改性格
- 满意的话点击"完成创建"`;

      addAssistantMessage(summaryMessage);
      setShowPersonality(true);
    } catch (error) {
      console.error("Config generation error:", error);
      toast.error("生成配置失败，请重试");
      addAssistantMessage("抱歉，生成配置时遇到了问题。请再描述一下你的需求？");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = useCallback(() => {
    if (!input.trim() || isTyping || isGenerating) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessage,
    }]);

    // Generate or adjust config
    if (!generatedConfig) {
      // First description - generate new config
      generateConfigFromDescription(userMessage);
    } else {
      // Adjustment - regenerate with context
      const adjustmentPrompt = `原始需求：${generatedConfig.name} - ${generatedConfig.systemPrompt}\n\n用户调整：${userMessage}`;
      generateConfigFromDescription(adjustmentPrompt);
    }
  }, [input, isTyping, isGenerating, generatedConfig]);

  const handleVoiceInput = (text: string) => {
    setInput(text);
    // Auto-send after voice input
    setTimeout(() => {
      if (text.trim()) {
        setMessages(prev => [...prev, {
          id: `user-${Date.now()}`,
          role: "user",
          content: text.trim(),
        }]);
        setInput("");
        
        if (!generatedConfig) {
          generateConfigFromDescription(text.trim());
        } else {
          const adjustmentPrompt = `原始需求：${generatedConfig.name} - ${generatedConfig.systemPrompt}\n\n用户调整：${text.trim()}`;
          generateConfigFromDescription(adjustmentPrompt);
        }
      }
    }, 100);
  };

  const handleComplete = () => {
    if (!generatedConfig) return;

    onComplete({
      name: generatedConfig.name,
      department: generatedConfig.department,
      systemPrompt: generatedConfig.systemPrompt,
      selectedSkillIds: generatedConfig.suggestedSkills,
      personalityConfig,
    });
  };

  const handleReset = () => {
    setMessages([]);
    setGeneratedConfig(null);
    setPersonalityConfig(getDefaultPersonalityConfig());
    setShowPersonality(false);
    setTimeout(() => {
      const initialMessage = useVoice 
        ? "🎙️ 好的，让我们重新开始！\n\n请用语音或文字描述你想要的AI助手~"
        : "好的，让我们重新开始！\n\n描述一下你想创建什么样的AI助手？";
      addAssistantMessage(initialMessage);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-3xl mx-4 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col"
        style={{ height: "85vh", maxHeight: "750px" }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">
                {useVoice ? "🎙️ 语音创建" : "AI帮你创建"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {useVoice ? "说出你的需求，AI帮你配置" : "描述你想要的助手，AI帮你配置"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Messages area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" && "flex-row-reverse"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      message.role === "assistant" ? "bg-primary/10" : "bg-secondary"
                    )}>
                      {message.role === "assistant" ? (
                        <Bot className="h-4 w-4 text-primary" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </div>
                    <div className={cn(
                      "max-w-[80%] px-4 py-3 rounded-2xl",
                      message.role === "assistant" 
                        ? "bg-secondary/50 rounded-tl-md" 
                        : "bg-primary text-primary-foreground rounded-tr-md"
                    )}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing/Generating indicator */}
              {(isTyping || isGenerating) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-secondary/50 px-4 py-3 rounded-2xl rounded-tl-md">
                    {isGenerating ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>正在生成配置...</span>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="px-6 py-4 border-t border-border flex-shrink-0">
              {generatedConfig ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {useVoice && (
                      <VoiceInputButton
                        onTranscript={handleVoiceInput}
                        disabled={isGenerating}
                        className="flex-shrink-0"
                      />
                    )}
                    <Input
                      ref={inputRef}
                      placeholder="继续描述来调整配置..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      disabled={isGenerating}
                      className="flex-1"
                    />
                    <Button onClick={handleSend} disabled={!input.trim() || isGenerating} size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleReset} className="flex-1" size="sm">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      重新开始
                    </Button>
                    <Button onClick={handleComplete} className="flex-1 gap-2" size="sm">
                      <Check className="h-4 w-4" />
                      完成创建
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  {useVoice && (
                    <VoiceInputButton
                      onTranscript={handleVoiceInput}
                      disabled={isGenerating}
                      className="flex-shrink-0"
                    />
                  )}
                  <Input
                    ref={inputRef}
                    placeholder={useVoice ? "或在这里输入..." : "描述你想创建的AI助手..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    disabled={isTyping || isGenerating}
                    className="flex-1"
                  />
                  <Button onClick={handleSend} disabled={!input.trim() || isTyping || isGenerating}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Personality panel (shown after config is generated) */}
          {showPersonality && generatedConfig && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              className="border-l border-border overflow-hidden flex-shrink-0"
            >
              <div className="p-4 h-full overflow-y-auto">
                <PersonalityConfigurator
                  config={personalityConfig}
                  onChange={setPersonalityConfig}
                />
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
