import { MessageSquare, PenTool, BarChart3, Calendar, ShoppingCart, Code, HeadphonesIcon, BookOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AIAgentScenario {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: string;
  prompt: string;
  expectedNodes: string[];
  suggestedMCP: string[];
  suggestedKnowledgeType: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export const aiAgentScenarios: AIAgentScenario[] = [
  {
    id: "customer-service",
    name: "智能客服",
    description: "自动回复FAQ、查询订单、处理退款，多意图路由分发",
    icon: HeadphonesIcon,
    category: "service",
    prompt: `创建一个智能客服助手，能够：
1. 自动回答常见问题（FAQ）
2. 查询订单状态（需要调用数据库）
3. 处理退款申请（需人工确认，高风险操作）
4. 在处理完成后发送邮件通知客户
5. 支持多意图识别和路由

需要具备意图路由能力，能够区分不同类型的客户请求并分发到对应处理流程。`,
    expectedNodes: ["trigger", "agent", "intentRouter", "skill", "mcpAction", "intervention", "output"],
    suggestedMCP: ["database", "email"],
    suggestedKnowledgeType: "faq",
    difficulty: "intermediate",
  },
  {
    id: "content-creator",
    name: "内容创作",
    description: "生成文章、小红书文案、营销内容，支持多平台适配",
    icon: PenTool,
    category: "creative",
    prompt: `创建一个内容创作助手，能够：
1. 生成公众号文章（长文，专业风格）
2. 生成小红书笔记（短文，活泼风格，带emoji）
3. 生成营销文案（卖点突出，有call to action）
4. 根据用户反馈迭代优化内容
5. 支持根据素材资料生成内容

需要根据目标平台自动调整内容风格和长度。`,
    expectedNodes: ["trigger", "agent", "condition", "skill", "output"],
    suggestedMCP: [],
    suggestedKnowledgeType: "brand",
    difficulty: "beginner",
  },
  {
    id: "data-analyst",
    name: "数据分析",
    description: "分析数据、生成报告、可视化图表，支持定时任务",
    icon: BarChart3,
    category: "analytics",
    prompt: `创建一个数据分析助手，能够：
1. 分析上传的数据文件（CSV/Excel）
2. 生成数据分析报告（包含关键指标、趋势分析）
3. 创建可视化图表
4. 支持定时自动运行分析任务
5. 将报告发送到指定邮箱

需要具备数据处理和可视化能力。`,
    expectedNodes: ["trigger", "agent", "skill", "mcpAction", "output"],
    suggestedMCP: ["filesystem", "email"],
    suggestedKnowledgeType: "template",
    difficulty: "intermediate",
  },
  {
    id: "meeting-assistant",
    name: "会议助手",
    description: "日程管理、会议纪要、待办跟踪，多系统联动",
    icon: Calendar,
    category: "productivity",
    prompt: `创建一个会议助手，能够：
1. 查看和创建日历事件
2. 生成会议纪要（根据对话内容自动总结）
3. 创建待办事项并跟踪进度
4. 在GitHub上创建相关Issue跟踪任务
5. 发送会议提醒通知

需要与多个外部系统联动（日历、GitHub、通知）。`,
    expectedNodes: ["trigger", "agent", "intentRouter", "mcpAction", "intervention", "output"],
    suggestedMCP: ["google-calendar", "github", "slack"],
    suggestedKnowledgeType: "none",
    difficulty: "advanced",
  },
  {
    id: "ecommerce-support",
    name: "电商助手",
    description: "商品推荐、库存查询、订单处理，全流程自动化",
    icon: ShoppingCart,
    category: "ecommerce",
    prompt: `创建一个电商智能助手，能够：
1. 根据用户需求推荐商品
2. 查询商品库存和价格
3. 处理订单创建（需确认）
4. 查询物流状态
5. 处理售后问题

需要连接商品数据库和订单系统。`,
    expectedNodes: ["trigger", "agent", "intentRouter", "skill", "mcpAction", "intervention", "output"],
    suggestedMCP: ["database", "http"],
    suggestedKnowledgeType: "product",
    difficulty: "advanced",
  },
  {
    id: "code-assistant",
    name: "编程助手",
    description: "代码生成、代码审查、文档编写，开发效率提升",
    icon: Code,
    category: "development",
    prompt: `创建一个编程助手，能够：
1. 根据需求生成代码
2. 审查代码并提出改进建议
3. 生成代码文档和注释
4. 解释复杂代码逻辑
5. 在GitHub上创建PR或Issue

需要具备代码理解和生成能力。`,
    expectedNodes: ["trigger", "agent", "skill", "mcpAction", "output"],
    suggestedMCP: ["github", "filesystem"],
    suggestedKnowledgeType: "codebase",
    difficulty: "intermediate",
  },
  {
    id: "research-assistant",
    name: "研究助手",
    description: "文献检索、知识整理、报告撰写，学术研究支持",
    icon: BookOpen,
    category: "research",
    prompt: `创建一个研究助手，能够：
1. 从知识库检索相关文献和资料
2. 整理和归纳知识点
3. 生成研究报告大纲
4. 撰写研究报告正文
5. 管理引用和参考文献

需要连接专业知识库，支持向量检索和知识图谱。`,
    expectedNodes: ["trigger", "agent", "knowledge", "skill", "output"],
    suggestedMCP: [],
    suggestedKnowledgeType: "research",
    difficulty: "intermediate",
  },
  {
    id: "general-assistant",
    name: "通用助手",
    description: "多功能对话助手，可处理各类日常任务",
    icon: MessageSquare,
    category: "general",
    prompt: `创建一个通用的智能对话助手，能够：
1. 回答各类问题
2. 帮助完成日常任务
3. 提供建议和方案
4. 支持多轮对话

作为基础模板，可以根据需要扩展更多能力。`,
    expectedNodes: ["trigger", "agent", "skill", "output"],
    suggestedMCP: [],
    suggestedKnowledgeType: "none",
    difficulty: "beginner",
  },
];

export function getScenarioById(id: string): AIAgentScenario | undefined {
  return aiAgentScenarios.find(s => s.id === id);
}

export function getScenariosByCategory(category: string): AIAgentScenario[] {
  if (category === "all") return aiAgentScenarios;
  return aiAgentScenarios.filter(s => s.category === category);
}

export const scenarioCategories = [
  { id: "all", name: "全部场景" },
  { id: "service", name: "客户服务" },
  { id: "creative", name: "内容创作" },
  { id: "analytics", name: "数据分析" },
  { id: "productivity", name: "效率工具" },
  { id: "ecommerce", name: "电商零售" },
  { id: "development", name: "开发工具" },
  { id: "research", name: "研究学术" },
  { id: "general", name: "通用场景" },
];
