import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Lightbulb,
  Sparkles,
  CheckCircle2,
  Puzzle,
  Eye,
  Calendar,
  Rocket,
} from "lucide-react";

const categoryColors: Record<string, string> = {
  "效率提升": "bg-primary/10 text-primary",
  "生活助手": "bg-cognitive/10 text-cognitive",
  "学习成长": "bg-governance/10 text-governance",
  "创意灵感": "bg-status-executing/10 text-status-executing",
  general: "bg-muted text-muted-foreground",
};

// Sample implementation steps and skills (in real scenario, these would be stored in DB)
const getImplementationSteps = (category: string) => {
  const stepsMap: Record<string, string[]> = {
    "效率提升": [
      "在构建器中创建新的智能体",
      "添加「文档处理」和「任务提取」技能",
      "配置输出格式为结构化任务清单",
      "设置自动分配规则和通知",
      "测试并部署到团队工作流",
    ],
    "生活助手": [
      "选择「个人助理」模板开始创建",
      "添加「日程管理」和「提醒」技能",
      "配置个性化偏好和习惯",
      "连接日历和通知渠道",
      "开始日常使用并持续优化",
    ],
    "学习成长": [
      "创建专注于学习辅导的智能体",
      "添加「知识问答」和「练习生成」技能",
      "设置学习目标和进度追踪",
      "配置个性化反馈机制",
      "定期复习和调整学习计划",
    ],
    "创意灵感": [
      "使用「创意助手」模板创建",
      "添加「头脑风暴」和「内容生成」技能",
      "设置创意风格和偏好",
      "配置灵感收集和整理功能",
      "建立创意库并持续积累",
    ],
  };
  return stepsMap[category] || stepsMap["效率提升"];
};

const getRecommendedSkills = (category: string) => {
  const skillsMap: Record<string, string[]> = {
    "效率提升": ["文档处理", "任务提取", "日程安排", "邮件撰写"],
    "生活助手": ["日程管理", "健康追踪", "购物助手", "旅行规划"],
    "学习成长": ["知识问答", "语言练习", "笔记整理", "测验生成"],
    "创意灵感": ["头脑风暴", "文案创作", "设计建议", "故事生成"],
  };
  return skillsMap[category] || skillsMap["效率提升"];
};

export default function InspirationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: inspiration, isLoading } = useQuery({
    queryKey: ["inspiration-detail", id],
    queryFn: async () => {
      if (!id) return null;
      
      // Handle default inspirations
      if (id.startsWith("default-")) {
        const defaultInspirations = [
          {
            id: "default-1",
            title: "用 AI 助手自动整理会议纪要",
            description: "一位产品经理分享了如何用 AI 助手将 2 小时的会议录音变成结构化的任务清单",
            story_content: "「以前每次开完会都要花 1 小时整理笔记，现在 AI 助手 5 分钟就搞定了，还能自动分配任务给对应的同事。」",
            category: "效率提升",
            featured_date: new Date().toISOString().split("T")[0],
            view_count: 1234,
            created_at: new Date().toISOString(),
          },
          {
            id: "default-2",
            title: "让 AI 成为你的私人健身教练",
            description: "健身爱好者创建了一个能根据身体状态调整训练计划的 AI 教练",
            story_content: "「它不仅记住我所有的训练数据，还能根据我今天的状态推荐最适合的训练强度。」",
            category: "生活助手",
            featured_date: new Date().toISOString().split("T")[0],
            view_count: 892,
            created_at: new Date().toISOString(),
          },
          {
            id: "default-3",
            title: "用 AI 助手学习新语言",
            description: "语言学习者用 AI 创建了一个 24/7 在线的口语练习伙伴",
            story_content: "「不用担心说错，AI 会耐心纠正我的发音和语法，比真人老师还有耐心。」",
            category: "学习成长",
            featured_date: new Date().toISOString().split("T")[0],
            view_count: 756,
            created_at: new Date().toISOString(),
          },
        ];
        return defaultInspirations.find(i => i.id === id) || null;
      }

      const { data, error } = await supabase
        .from("daily_inspiration")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      // Increment view count
      await supabase
        .from("daily_inspiration")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("id", id);

      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container max-w-4xl py-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!inspiration) {
    return (
      <MainLayout>
        <div className="container max-w-4xl py-8 text-center">
          <Lightbulb className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-bold mb-2">灵感未找到</h1>
          <p className="text-muted-foreground mb-6">该灵感内容可能已被删除或不存在</p>
          <Button onClick={() => navigate("/")}>返回首页</Button>
        </div>
      </MainLayout>
    );
  }

  const colorClass = categoryColors[inspiration.category] || categoryColors.general;
  const steps = getImplementationSteps(inspiration.category);
  const skills = getRecommendedSkills(inspiration.category);

  return (
    <MainLayout>
      <div className="container max-w-4xl py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={colorClass}>{inspiration.category}</Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {inspiration.view_count?.toLocaleString()} 人看过
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {inspiration.featured_date}
              </span>
            </div>
            <h1 className="text-2xl font-bold">{inspiration.title}</h1>
          </div>
        </div>

        {/* Main Content Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                <Lightbulb className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-3">
                <p className="text-lg">{inspiration.description}</p>
                {inspiration.story_content && (
                  <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground">
                    {inspiration.story_content}
                  </blockquote>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Implementation Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              实现步骤
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {steps.map((step, index) => (
                <li key={index} className="flex items-start gap-4">
                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                    {index + 1}
                  </span>
                  <span className="pt-1">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Recommended Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Puzzle className="h-5 w-5 text-cognitive" />
              推荐技能
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <Badge key={index} variant="secondary" className="px-3 py-1.5">
                  <Sparkles className="h-3 w-3 mr-1.5" />
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            className="gap-2"
            onClick={() => navigate("/builder")}
          >
            <Rocket className="h-5 w-5" />
            立即创建这个智能体
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
