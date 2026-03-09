import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  Search,
  MessageSquare,
  Book,
  Video,
  ExternalLink,
  Mail,
} from "lucide-react";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";

const faqItems = [
  {
    category: "入门指南",
    items: [
      {
        q: "如何创建我的第一个AI助手？",
        a: "点击首页的「创建AI助手」按钮，或进入「创建」页面。你可以选择使用模板快速开始，或者用对话的方式描述你想要的助手，系统会自动帮你配置。",
      },
      {
        q: "什么是「能力」？",
        a: "能力是AI助手可以执行的具体任务，比如写文案、分析数据、翻译等。你可以在「能力」页面浏览和安装各种能力给你的助手。",
      },
      {
        q: "访客模式和注册用户有什么区别？",
        a: "访客模式可以体验基本功能，但对话记录不会保存，且有使用次数限制。注册后可以保存你的助手和对话历史，享受完整功能。",
      },
    ],
  },
  {
    category: "使用技巧",
    items: [
      {
        q: "如何让AI助手回答更准确？",
        a: "尽量描述清楚你的需求和背景，提供相关的上下文信息。你也可以在助手设置中调整系统提示词，让助手更了解你的偏好。",
      },
      {
        q: "可以同时使用多个AI助手吗？",
        a: "可以！你可以创建多个不同用途的助手，在对话页面通过快捷切换器随时切换。",
      },
      {
        q: "对话历史会保存多久？",
        a: "注册用户的对话历史会永久保存。你可以随时查看、搜索和收藏重要对话。",
      },
    ],
  },
  {
    category: "账户与付费",
    items: [
      {
        q: "有哪些付费计划？",
        a: "我们提供免费版、专业版和团队版。免费版每天有一定的对话次数限制，专业版解锁更多高级能力和更高的使用额度。",
      },
      {
        q: "如何升级到付费版？",
        a: "点击侧边栏的「升级」按钮，或进入「我的」页面选择适合的计划进行订阅。",
      },
      {
        q: "可以取消订阅吗？",
        a: "可以随时取消。取消后，你仍可以使用到当前计费周期结束，之后会自动降级为免费版。",
      },
    ],
  },
  {
    category: "常见问题",
    items: [
      {
        q: "为什么AI回复很慢？",
        a: "回复速度取决于请求复杂度和当前服务负载。复杂的任务需要更多处理时间。如果持续很慢，请检查网络连接或稍后重试。",
      },
      {
        q: "我的数据安全吗？",
        a: "我们非常重视数据安全。所有数据都经过加密存储，不会用于训练AI模型，也不会分享给第三方。",
      },
      {
        q: "支持哪些语言？",
        a: "目前支持中文和英文界面，AI助手可以用多种语言进行对话。",
      },
    ],
  },
];

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { startOnboarding } = useOnboarding();

  const filteredFaq = faqItems
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.a.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.items.length > 0);

  const handleStartOnboarding = () => {
    onOpenChange(false);
    setTimeout(() => startOnboarding(), 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            帮助中心
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索问题..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4"
              onClick={handleStartOnboarding}
            >
              <Book className="h-5 w-5 text-primary" />
              <span className="text-sm">重新引导</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4"
              onClick={() => window.open("https://github.com/fance-studio/fance-studio", "_blank")}
            >
              <Video className="h-5 w-5 text-primary" />
              <span className="text-sm">文档教程</span>
            </Button>
          </div>

          {/* FAQ List */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">
              常见问题
            </h3>
            {filteredFaq.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                没有找到相关问题
              </p>
            ) : (
              filteredFaq.map((category) => (
                <div key={category.category}>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">
                    {category.category}
                  </h4>
                  <Accordion type="single" collapsible className="space-y-1">
                    {category.items.map((item, index) => (
                      <AccordionItem
                        key={index}
                        value={`${category.category}-${index}`}
                        className="border rounded-lg px-3"
                      >
                        <AccordionTrigger className="text-sm text-left hover:no-underline py-3">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground pb-3">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))
            )}
          </div>

          {/* Contact */}
          <div className="border-t border-border pt-4 space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">
              还有问题？
            </h3>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={() => window.open("https://crisp.chat/", "_blank")}
              >
                <MessageSquare className="h-4 w-4" />
                在线客服
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={() => {
                  window.location.href = "mailto:support@example.com?subject=平台反馈&body=您好，我想反馈以下问题：%0A%0A";
                }}
              >
                <Mail className="h-4 w-4" />
                发送邮件
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-muted-foreground"
                onClick={() => window.open("https://github.com/fance-studio/fance-studio", "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
                查看完整文档
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
