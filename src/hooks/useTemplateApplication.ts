import { useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { findTemplateById, AgentTemplate } from "../data/agentTemplates.ts";
import { usePublishedSkills } from "./useSkills.ts";

interface AgentConfig {
  name: string;
  department: string;
  systemPrompt: string;
  model: string;
  mplpPolicy: string;
  avatar: {
    iconId: string;
    colorId: string;
  };
}

interface UseTemplateApplicationReturn {
  templateId: string | null;
  template: AgentTemplate | undefined;
  applyTemplate: (
    template: AgentTemplate,
    setAgentConfig: React.Dispatch<React.SetStateAction<AgentConfig>>,
    addSkillsToCanvas?: (skillIds: string[]) => void
  ) => void;
  getTemplateFromUrl: () => AgentTemplate | undefined;
  clearTemplateParam: () => void;
}

// 技能类别到数据库技能的映射
const skillCategoryMapping: Record<string, string[]> = {
  "text-generation": ["文本生成", "内容创作", "文案写作"],
  "summarization": ["内容总结", "摘要提取", "文档总结"],
  "translation": ["多语言翻译", "翻译", "语言转换"],
  "data-analysis": ["数据分析", "统计分析", "数据处理"],
  "reporting": ["报表生成", "报告", "数据报告"],
  "visualization": ["数据可视化", "图表生成", "可视化"],
  "faq": ["FAQ问答", "常见问题", "知识库"],
  "auto-reply": ["自动回复", "智能回复", "消息回复"],
  "sentiment-analysis": ["情感分析", "情绪识别", "舆情分析"],
  "education": ["教育辅导", "学习助手", "知识问答"],
  "knowledge-base": ["知识库", "知识管理", "信息检索"],
  "quiz": ["测验", "问答", "考试"],
  "calendar": ["日程管理", "日历", "时间管理"],
  "reminder": ["提醒", "通知", "待办提醒"],
  "task-management": ["任务管理", "待办事项", "项目管理"],
  "web-search": ["网页搜索", "信息检索", "搜索"],
  "price-comparison": ["比价", "价格对比", "商品比较"],
  "recommendation": ["推荐", "个性化推荐", "智能推荐"],
  "code-execution": ["代码执行", "编程", "代码运行"],
  "code-review": ["代码审查", "代码检查", "代码优化"],
  "documentation": ["文档生成", "API文档", "技术文档"],
  "document-parsing": ["文档解析", "文档处理", "PDF解析"],
  "extraction": ["信息提取", "数据提取", "内容提取"],
  "formatting": ["格式化", "排版", "格式转换"],
  "creative-writing": ["创意写作", "文学创作", "故事创作"],
  "social-media": ["社交媒体", "新媒体", "运营"],
  "speech": ["语音", "发音", "口语"],
};

export function useTemplateApplication(): UseTemplateApplicationReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: publishedSkills } = usePublishedSkills();

  const templateId = searchParams.get("template");
  const template = templateId ? findTemplateById(templateId) : undefined;

  // 根据模板推荐的技能类别匹配实际可用的技能
  const matchSkillsByCategories = useCallback(
    (categories: string[]): string[] => {
      if (!publishedSkills || publishedSkills.length === 0) {
        return [];
      }

      const matchedSkillIds: string[] = [];
      const matchedNames = new Set<string>();

      for (const category of categories) {
        const keywords = skillCategoryMapping[category] || [category];

        for (const skill of publishedSkills) {
          if (matchedNames.has(skill.name)) continue;

          // 检查技能名称或描述是否包含关键词
          const skillText = `${skill.name} ${skill.description || ""} ${skill.category}`.toLowerCase();
          const isMatch = keywords.some(
            (keyword) =>
              skillText.includes(keyword.toLowerCase()) ||
              skill.category.toLowerCase().includes(keyword.toLowerCase())
          );

          if (isMatch) {
            matchedSkillIds.push(skill.id);
            matchedNames.add(skill.name);
          }
        }
      }

      // 最多返回5个推荐技能
      return matchedSkillIds.slice(0, 5);
    },
    [publishedSkills]
  );

  const applyTemplate = useCallback(
    (
      template: AgentTemplate,
      setAgentConfig: React.Dispatch<React.SetStateAction<AgentConfig>>,
      addSkillsToCanvas?: (skillIds: string[]) => void
    ) => {
      // 应用模板配置到 Agent
      setAgentConfig((prev) => ({
        ...prev,
        name: template.name,
        department: template.config.department,
        systemPrompt: template.config.systemPrompt,
        model: template.config.model,
        avatar: template.config.avatar,
      }));

      // 匹配并添加推荐技能
      if (addSkillsToCanvas && template.config.suggestedSkillCategories) {
        const matchedSkillIds = matchSkillsByCategories(
          template.config.suggestedSkillCategories
        );

        if (matchedSkillIds.length > 0) {
          addSkillsToCanvas(matchedSkillIds);
          toast.success(`已应用「${template.name}」模板`, {
            description: `已自动添加 ${matchedSkillIds.length} 个推荐技能`,
          });
        } else {
          toast.success(`已应用「${template.name}」模板`, {
            description: "你可以在技能市场选择需要的技能",
          });
        }
      } else {
        toast.success(`已应用「${template.name}」模板`);
      }
    },
    [matchSkillsByCategories]
  );

  const getTemplateFromUrl = useCallback((): AgentTemplate | undefined => {
    const id = searchParams.get("template");
    return id ? findTemplateById(id) : undefined;
  }, [searchParams]);

  const clearTemplateParam = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("template");
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  return {
    templateId,
    template,
    applyTemplate,
    getTemplateFromUrl,
    clearTemplateParam,
  };
}
