import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  MessageCircle, 
  Wand2, 
  ArrowRight,
  Play,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickStartGuideProps {
  hasAgents?: boolean;
  onStartWizard?: () => void;
}

export function QuickStartGuide({ hasAgents = false, onStartWizard }: QuickStartGuideProps) {
  const navigate = useNavigate();

  if (hasAgents) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
              <MessageCircle className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">继续上次的对话</h3>
              <p className="text-sm text-muted-foreground">
                你的AI助手已准备就绪，随时为你服务
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/runtime")} className="gap-2">
            <Play className="h-4 w-4" />
            开始对话
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-cognitive/5 to-governance/5 border border-border p-6"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-cognitive/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">新用户专享</span>
        </div>
        
        <h2 className="text-2xl font-bold mb-2">
          打造你的专属AI助手
        </h2>
        <p className="text-muted-foreground mb-6 max-w-lg">
          只需告诉我你想要什么，10分钟就能创建一个懂你的智能助手
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-border/50">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">1</span>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">描述需求</h4>
              <p className="text-xs text-muted-foreground">告诉AI你想要什么样的助手</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-border/50">
            <div className="w-8 h-8 rounded-lg bg-cognitive/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-cognitive">2</span>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">AI自动配置</h4>
              <p className="text-xs text-muted-foreground">系统自动选择最佳能力组合</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-border/50">
            <div className="w-8 h-8 rounded-lg bg-governance/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-governance">3</span>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">开始使用</h4>
              <p className="text-xs text-muted-foreground">一键部署，立即对话</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={onStartWizard} size="lg" className="gap-2">
            <Wand2 className="h-4 w-4" />
            AI帮我创建
          </Button>
          <Button variant="outline" size="lg" asChild className="gap-2">
            <Link to="/builder">
              <Bot className="h-4 w-4" />
              浏览模板
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
