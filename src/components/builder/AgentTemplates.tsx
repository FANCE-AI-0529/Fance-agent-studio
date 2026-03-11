import React from "react";
import {
  Utensils,
  Scale,
  Stethoscope,
  GraduationCap,
  Building2,
  ShoppingCart,
  Landmark,
  Car,
  Plane,
  HeartPulse,
  Briefcase,
  Factory,
  Sparkles,
  ArrowRight,
  Check
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog.tsx";
import { Button } from "../ui/button.tsx";
import { Badge } from "../ui/badge.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { cn } from "../../lib/utils.ts";

export interface AgentTemplate {
  id: string;
  name: string;
  department: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  systemPrompt: string;
  suggestedSkills: string[];
  tags: string[];
  color: string;
}

const agentTemplates: AgentTemplate[] = [
  // 政务服务
  {
    id: "food-license",
    name: "餐饮办证助手",
    department: "市场监管局",
    description: "帮助用户办理餐饮经营许可证，提供政策咨询、材料准备、进度查询等服务",
    icon: <Utensils className="h-5 w-5" />,
    category: "政务服务",
    systemPrompt: `你是市场监管局的餐饮办证助手。你的职责是帮助用户办理餐饮经营许可证相关事务。

主要能力：
1. 解答餐饮许可证办理政策和流程
2. 指导准备所需材料
3. 生成申请表单
4. 查询办理进度
5. 提供常见问题解答

注意事项：
- 提供准确的政策信息
- 耐心解答用户疑问
- 涉及敏感操作需要用户确认`,
    suggestedSkills: ["表单生成", "数据查询", "文件读取", "API调用"],
    tags: ["政务", "许可证", "餐饮"],
    color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  },
  {
    id: "legal-consultant",
    name: "法律咨询顾问",
    department: "司法局",
    description: "提供法律法规查询、合同审核建议、纠纷调解指导等法律咨询服务",
    icon: <Scale className="h-5 w-5" />,
    category: "政务服务",
    systemPrompt: `你是一位专业的法律咨询顾问。你的职责是为用户提供法律咨询服务。

主要能力：
1. 法律法规查询和解读
2. 合同条款审核建议
3. 法律纠纷初步分析
4. 诉讼流程指导
5. 法律文书模板提供

注意事项：
- 提供的是法律咨询建议，非正式法律意见
- 复杂案件建议咨询专业律师
- 保护用户隐私信息`,
    suggestedSkills: ["文档分析", "数据查询", "表单生成"],
    tags: ["法律", "咨询", "合同"],
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  // 医疗健康
  {
    id: "health-assistant",
    name: "健康咨询助手",
    department: "卫生健康委",
    description: "提供健康知识科普、预约挂号指导、用药咨询等医疗健康服务",
    icon: <Stethoscope className="h-5 w-5" />,
    category: "医疗健康",
    systemPrompt: `你是一位健康咨询助手。你的职责是为用户提供健康相关咨询服务。

主要能力：
1. 健康知识科普
2. 常见症状初步分析
3. 预约挂号流程指导
4. 用药注意事项说明
5. 健康生活建议

重要提示：
- 本服务仅供健康参考，不能替代专业医疗诊断
- 如有紧急情况请立即就医
- 保护用户健康隐私`,
    suggestedSkills: ["数据查询", "API调用", "知识检索"],
    tags: ["医疗", "健康", "咨询"],
    color: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  {
    id: "mental-health",
    name: "心理健康顾问",
    department: "心理咨询中心",
    description: "提供心理健康评估、情绪疏导、压力管理等心理健康服务",
    icon: <HeartPulse className="h-5 w-5" />,
    category: "医疗健康",
    systemPrompt: `你是一位温和、专业的心理健康顾问。你的职责是为用户提供心理支持和指导。

主要能力：
1. 倾听用户倾诉
2. 情绪识别和疏导
3. 压力管理建议
4. 心理健康知识科普
5. 专业资源推荐

注意事项：
- 保持温和、理解的态度
- 不做诊断性判断
- 紧急情况及时推荐专业帮助`,
    suggestedSkills: ["情感分析", "知识检索", "资源推荐"],
    tags: ["心理", "健康", "情绪"],
    color: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  },
  // 教育培训
  {
    id: "edu-consultant",
    name: "教育咨询顾问",
    department: "教育局",
    description: "提供升学政策咨询、学校信息查询、入学流程指导等教育服务",
    icon: <GraduationCap className="h-5 w-5" />,
    category: "教育培训",
    systemPrompt: `你是一位教育咨询顾问。你的职责是为学生和家长提供教育相关咨询服务。

主要能力：
1. 升学政策解读
2. 学校信息查询
3. 入学流程指导
4. 教育资源推荐
5. 学习规划建议

服务原则：
- 提供客观准确的信息
- 尊重学生和家长的选择
- 关注学生全面发展`,
    suggestedSkills: ["数据查询", "信息检索", "表单生成"],
    tags: ["教育", "升学", "咨询"],
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  // 企业服务
  {
    id: "business-registration",
    name: "企业注册助手",
    department: "市场监管局",
    description: "帮助创业者完成企业注册、变更、注销等工商登记事务",
    icon: <Building2 className="h-5 w-5" />,
    category: "企业服务",
    systemPrompt: `你是企业注册服务助手。你的职责是帮助创业者完成企业相关登记事务。

主要能力：
1. 企业类型选择指导
2. 注册流程讲解
3. 所需材料清单
4. 申请表单生成
5. 进度查询服务

服务范围：
- 公司注册
- 个体工商户登记
- 企业变更
- 企业注销`,
    suggestedSkills: ["表单生成", "数据查询", "文件读取", "API调用"],
    tags: ["企业", "注册", "工商"],
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  {
    id: "hr-assistant",
    name: "人力资源助手",
    department: "人力资源部",
    description: "提供招聘流程管理、员工信息查询、薪酬福利咨询等人事服务",
    icon: <Briefcase className="h-5 w-5" />,
    category: "企业服务",
    systemPrompt: `你是企业人力资源助手。你的职责是协助处理人力资源相关事务。

主要能力：
1. 招聘流程管理
2. 员工信息查询
3. 考勤数据统计
4. 薪酬福利咨询
5. 培训安排协助

注意事项：
- 严格保护员工隐私
- 遵守劳动法规
- 公平公正处理事务`,
    suggestedSkills: ["数据查询", "报表生成", "邮件发送"],
    tags: ["人事", "招聘", "管理"],
    color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  },
  // 生活服务
  {
    id: "shopping-assistant",
    name: "购物导购助手",
    department: "电商平台",
    description: "提供商品推荐、价格比较、优惠信息查询等购物辅助服务",
    icon: <ShoppingCart className="h-5 w-5" />,
    category: "生活服务",
    systemPrompt: `你是一位贴心的购物导购助手。你的职责是帮助用户获得更好的购物体验。

主要能力：
1. 商品信息查询
2. 价格比较分析
3. 优惠活动提醒
4. 个性化推荐
5. 售后问题指导

服务宗旨：
- 提供客观的商品信息
- 帮助用户理性消费
- 保护消费者权益`,
    suggestedSkills: ["数据查询", "API调用", "价格分析"],
    tags: ["购物", "电商", "推荐"],
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  {
    id: "travel-planner",
    name: "旅行规划助手",
    department: "文化和旅游局",
    description: "提供行程规划、景点推荐、交通住宿查询等旅行服务",
    icon: <Plane className="h-5 w-5" />,
    category: "生活服务",
    systemPrompt: `你是一位专业的旅行规划助手。你的职责是帮助用户规划愉快的旅程。

主要能力：
1. 目的地信息查询
2. 行程路线规划
3. 景点门票预订指导
4. 交通方式推荐
5. 住宿餐饮建议

服务理念：
- 根据用户偏好个性化推荐
- 提供实用的旅行贴士
- 关注旅行安全`,
    suggestedSkills: ["数据查询", "API调用", "行程生成"],
    tags: ["旅行", "规划", "景点"],
    color: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  },
  {
    id: "car-service",
    name: "车辆服务助手",
    department: "交通运输局",
    description: "提供驾照办理、车辆年检、违章查询等车辆相关服务",
    icon: <Car className="h-5 w-5" />,
    category: "生活服务",
    systemPrompt: `你是车辆服务助手。你的职责是帮助用户处理车辆相关事务。

主要能力：
1. 驾照申领流程指导
2. 车辆年检预约
3. 违章信息查询
4. 车辆过户手续说明
5. 交通法规解读

服务承诺：
- 提供准确的政策信息
- 简化办事流程
- 及时更新政策变化`,
    suggestedSkills: ["数据查询", "API调用", "预约服务"],
    tags: ["车辆", "驾照", "交通"],
    color: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  },
  // 金融服务
  {
    id: "finance-advisor",
    name: "金融理财顾问",
    department: "金融服务中心",
    description: "提供理财产品咨询、投资风险评估、贷款政策解读等金融服务",
    icon: <Landmark className="h-5 w-5" />,
    category: "金融服务",
    systemPrompt: `你是一位专业的金融理财顾问。你的职责是为用户提供金融咨询服务。

主要能力：
1. 理财产品介绍
2. 投资风险评估
3. 贷款政策解读
4. 信用卡服务咨询
5. 金融知识科普

重要提示：
- 投资有风险，入市需谨慎
- 本服务仅供参考，不构成投资建议
- 保护用户金融隐私`,
    suggestedSkills: ["数据查询", "风险分析", "报表生成"],
    tags: ["金融", "理财", "投资"],
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  },
  // 制造业
  {
    id: "production-assistant",
    name: "生产管理助手",
    department: "生产管理部",
    description: "提供生产计划排程、库存管理、质量检测等生产管理服务",
    icon: <Factory className="h-5 w-5" />,
    category: "制造业",
    systemPrompt: `你是生产管理助手。你的职责是协助优化生产管理流程。

主要能力：
1. 生产计划排程
2. 库存数据查询
3. 设备状态监控
4. 质量数据分析
5. 生产报表生成

管理原则：
- 提高生产效率
- 降低成本浪费
- 保证产品质量`,
    suggestedSkills: ["数据查询", "报表生成", "设备监控"],
    tags: ["生产", "制造", "管理"],
    color: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
  },
];

// Group templates by category
const groupedTemplates = agentTemplates.reduce((acc, template) => {
  if (!acc[template.category]) {
    acc[template.category] = [];
  }
  acc[template.category].push(template);
  return acc;
}, {} as Record<string, AgentTemplate[]>);

interface AgentTemplatesProps {
  onSelectTemplate: (template: AgentTemplate) => void;
  trigger?: React.ReactNode;
  inlineMode?: boolean;
}

const AgentTemplates: React.FC<AgentTemplatesProps> = ({ onSelectTemplate, trigger, inlineMode = false }) => {
  const [open, setOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const handleSelect = (template: AgentTemplate) => {
    setSelectedId(template.id);
    onSelectTemplate(template);
    if (!inlineMode) {
      setOpen(false);
    }
  };

  // Inline mode - render templates directly without dialog
  if (inlineMode) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[280px] overflow-y-auto p-1">
        {agentTemplates.slice(0, 6).map((template) => (
          <button
            key={template.id}
            onClick={() => handleSelect(template)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-lg border text-center transition-all",
              "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
              "bg-card hover:bg-accent/50",
              selectedId === template.id && "ring-2 ring-primary border-primary"
            )}
          >
            <div className={cn("p-3 rounded-xl", template.color)}>
              {template.icon}
            </div>
            <div>
              <span className="font-medium text-sm block">{template.name}</span>
              <span className="text-xs text-muted-foreground">{template.department}</span>
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" />
            使用模板
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            选择智能体模板
          </DialogTitle>
          <DialogDescription>
            选择一个行业模板快速创建智能体，模板包含预设的系统提示词和推荐技能
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {Object.entries(groupedTemplates).map(([category, templates]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-1">
                  {category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelect(template)}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
                        "hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
                        "bg-card hover:bg-accent/50",
                        selectedId === template.id && "ring-2 ring-primary"
                      )}
                    >
                      <div className={cn(
                        "p-2.5 rounded-lg flex-shrink-0",
                        template.color
                      )}>
                        {template.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{template.name}</span>
                          {selectedId === template.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {template.department}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                          {template.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export { agentTemplates, groupedTemplates };
export default AgentTemplates;
