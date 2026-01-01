import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  Check,
  ArrowRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ConversationalCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (config: {
    name: string;
    department: string;
    systemPrompt: string;
    selectedSkillIds: string[];
  }) => void;
}

// AI-like conversation flow
const conversationSteps = [
  {
    question: "你好！我是AI创建助手\n\n告诉我，你想创建一个什么样的AI助手？\n\n比如：帮我写文案、做数据分析、回复客户问题...",
    extractField: "purpose",
  },
  {
    question: "明白了！那给你的助手起个名字吧？\n\n可以是昵称，比如小助、文案大师",
    extractField: "name",
  },
  {
    question: "这个助手主要用在什么场景？\n\n比如：日常办公、电商运营、学习辅导...",
    extractField: "department",
  },
  {
    question: "还有什么特别的要求吗？\n\n比如：语气要活泼一点、要专业一些、需要有创意...\n\n没有的话可以说没有或者直接跳过",
    extractField: "style",
  },
];

// Mock AI skill matching
const matchSkillsFromDescription = (description: string): string[] => {
  const skillMap: Record<string, string[]> = {
    文案: ["writing", "creative"],
    写作: ["writing", "creative"],
    邮件: ["writing", "email"],
    数据: ["analysis", "reporting"],
    分析: ["analysis", "reporting"],
    报表: ["analysis", "reporting"],
    客服: ["customer-service", "faq"],
    回复: ["customer-service", "faq"],
    学习: ["learning", "tutoring"],
    翻译: ["translation"],
    代码: ["coding", "debugging"],
    编程: ["coding", "debugging"],
    总结: ["summarization"],
    文档: ["document-processing"],
  };

  const matched = new Set<string>();
  for (const [keyword, skills] of Object.entries(skillMap)) {
    if (description.includes(keyword)) {
      skills.forEach(s => matched.add(s));
    }
  }
  
  return Array.from(matched);
};

export function ConversationalCreator({
  isOpen,
  onClose,
  onComplete,
}: ConversationalCreatorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [collectedData, setCollectedData] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize first message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        addAssistantMessage(conversationSteps[0].question);
      }, 500);
    }
  }, [isOpen]);

  const addAssistantMessage = (content: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content,
      }]);
      setIsTyping(false);
    }, 800);
  };

  const handleSend = () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessage,
    }]);

    // Collect data
    const currentField = conversationSteps[currentStep]?.extractField;
    if (currentField) {
      setCollectedData(prev => ({
        ...prev,
        [currentField]: userMessage,
      }));
    }

    // Move to next step or complete
    const nextStep = currentStep + 1;
    if (nextStep < conversationSteps.length) {
      setCurrentStep(nextStep);
      setTimeout(() => {
        addAssistantMessage(conversationSteps[nextStep].question);
      }, 500);
    } else {
      // Generate final config
      setTimeout(() => {
        const finalData = { ...collectedData, [currentField!]: userMessage };
        generateConfig(finalData);
      }, 500);
    }
  };

  const generateConfig = (data: Record<string, string>) => {
    setIsTyping(true);
    
    setTimeout(() => {
      const matchedSkills = matchSkillsFromDescription(data.purpose || "");
      
      const summaryMessage = `太棒了！我已经为你配置好了 🎉

**${data.name}**
- 场景：${data.department || "通用"}
- 能力：${matchedSkills.length > 0 ? matchedSkills.join("、") : "基础对话"}

${data.style && data.style !== "没有" && data.style !== "无" ? `特别要求：${data.style}` : ""}

点击下方按钮完成创建！`;

      setMessages(prev => [...prev, {
        id: `assistant-final-${Date.now()}`,
        role: "assistant",
        content: summaryMessage,
      }]);
      setIsTyping(false);
      setCurrentStep(conversationSteps.length + 1); // Mark as complete
    }, 1200);
  };

  const handleComplete = () => {
    const systemPrompt = `你是${collectedData.name || "智能助手"}。${
      collectedData.purpose ? `你的主要职责是${collectedData.purpose}。` : ""
    }${
      collectedData.style && collectedData.style !== "没有" ? `要求：${collectedData.style}。` : ""
    }`;

    onComplete({
      name: collectedData.name || "我的助手",
      department: collectedData.department || "",
      systemPrompt,
      selectedSkillIds: matchSkillsFromDescription(collectedData.purpose || ""),
    });
  };

  const handleReset = () => {
    setMessages([]);
    setCurrentStep(0);
    setCollectedData({});
    setTimeout(() => {
      addAssistantMessage(conversationSteps[0].question);
    }, 500);
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
        className="relative w-full max-w-2xl mx-4 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col"
        style={{ height: "80vh", maxHeight: "700px" }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">AI帮你创建</h2>
              <p className="text-xs text-muted-foreground">告诉我你想要什么样的助手</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
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

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-secondary/50 px-4 py-3 rounded-2xl rounded-tl-md">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input or Complete button */}
        <div className="px-6 py-4 border-t border-border">
          {currentStep <= conversationSteps.length ? (
            <div className="flex gap-2">
              <Input
                placeholder="输入你的回答..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={isTyping}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={!input.trim() || isTyping}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                重新开始
              </Button>
              <Button onClick={handleComplete} className="flex-1 gap-2">
                <Check className="h-4 w-4" />
                完成创建
              </Button>
            </div>
          )}
        </div>

        {/* Progress indicator */}
        <div className="absolute bottom-20 left-6 right-6">
          <div className="flex gap-1">
            {conversationSteps.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex-1 h-1 rounded-full transition-colors",
                  idx < currentStep ? "bg-primary" : "bg-border"
                )}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
