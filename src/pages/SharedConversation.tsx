import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bot, User, ArrowLeft, Eye, MessageSquare, Calendar, Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useSharedConversation } from "@/hooks/useSharedConversation";
import { AgentAvatarAnimated } from "@/components/runtime/AgentAvatarAnimated";
import { FormattedText } from "@/components/runtime/FormattedText";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function SharedConversation() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = useSharedConversation(token || "");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border p-4">
          <Skeleton className="h-8 w-48" />
        </header>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-24 flex-1 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">😔</div>
          <h1 className="text-2xl font-bold">对话未找到</h1>
          <p className="text-muted-foreground">
            这个分享链接可能已过期或不存在
          </p>
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回首页
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const { info, messages } = data;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {info.agentAvatar ? (
                <AgentAvatarAnimated
                  iconId={(info.agentAvatar as AgentManifestRuntime)?.iconId || "bot"}
                  colorId={(info.agentAvatar as AgentManifestRuntime)?.colorId || "blue"}
                  size="md"
                  state="idle"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
              )}
              <div>
                <h1 className="font-semibold">
                  {info.title || `与 ${info.agentName || "AI助手"} 的对话`}
                </h1>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {info.messageCount} 条消息
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {info.viewCount} 次查看
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDistanceToNow(info.createdAt, { addSuffix: true, locale: zhCN })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/hive?tab=runtime">
                  <Play className="h-4 w-4 mr-2" />
                  体验这个 Agent
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              {message.role === "assistant" ? (
                info.agentAvatar ? (
                  <AgentAvatarAnimated
                    iconId={(info.agentAvatar as any)?.iconId || "bot"}
                    colorId={(info.agentAvatar as any)?.colorId || "blue"}
                    size="sm"
                    state="idle"
                    showGlow={false}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )
              ) : (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}

              {/* Message content */}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border"
                }`}
              >
                {message.role === "assistant" ? (
                  <FormattedText content={message.content} />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
                <p className="text-[10px] opacity-60 mt-2">
                  {formatDistanceToNow(message.timestamp, { addSuffix: true, locale: zhCN })}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer CTA */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            由 <span className="font-semibold text-foreground">FANCE</span> 提供支持
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                探索更多
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/hive?tab=runtime">
                <ExternalLink className="h-4 w-4 mr-2" />
                开始对话
              </Link>
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
