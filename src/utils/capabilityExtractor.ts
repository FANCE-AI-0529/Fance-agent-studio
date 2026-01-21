/**
 * Capability Extractor
 * 从智能体的 systemPrompt 和 manifest 中提取结构化能力
 */

export interface CapabilityItem {
  icon: string;
  label: string;
  description?: string;
}

export interface StructuredCapabilities {
  core: CapabilityItem[];
  extended: CapabilityItem[];
  knowledge: string[];
  quickStarts: string[];
  greeting: string;
}

// 能力关键词映射表
const CAPABILITY_PATTERNS: Record<string, { icon: string; label: string; keywords: string[] }> = {
  // 分析类
  analyze: { icon: "bar-chart-2", label: "数据分析", keywords: ["分析", "分析师", "analyze", "analytics"] },
  report: { icon: "file-text", label: "报告生成", keywords: ["报告", "report", "汇报", "总结"] },
  insight: { icon: "lightbulb", label: "洞察发现", keywords: ["洞察", "insight", "发现", "趋势"] },
  
  // 财务类
  finance: { icon: "wallet", label: "财务处理", keywords: ["财务", "财报", "finance", "会计", "账务"] },
  budget: { icon: "calculator", label: "预算管理", keywords: ["预算", "budget", "成本"] },
  risk: { icon: "alert-triangle", label: "风险预警", keywords: ["风险", "risk", "预警", "warning"] },
  
  // 邮件/通信类
  email: { icon: "mail", label: "邮件处理", keywords: ["邮件", "email", "收件", "发件"] },
  message: { icon: "message-square", label: "消息管理", keywords: ["消息", "message", "通知", "提醒"] },
  
  // 日历/时间类
  calendar: { icon: "calendar", label: "日程管理", keywords: ["日程", "日历", "calendar", "会议", "安排"] },
  schedule: { icon: "clock", label: "时间规划", keywords: ["计划", "schedule", "规划", "任务"] },
  
  // 文档类
  document: { icon: "file", label: "文档处理", keywords: ["文档", "document", "文件", "pdf"] },
  write: { icon: "pen-tool", label: "内容撰写", keywords: ["撰写", "写作", "编写", "草拟", "write"] },
  translate: { icon: "languages", label: "翻译转换", keywords: ["翻译", "translate", "转换"] },
  
  // 搜索/检索类
  search: { icon: "search", label: "智能搜索", keywords: ["搜索", "search", "查找", "检索"] },
  research: { icon: "book-open", label: "资料研究", keywords: ["研究", "research", "调研"] },
  
  // 代码类
  code: { icon: "code", label: "代码辅助", keywords: ["代码", "code", "编程", "开发", "debug"] },
  
  // 客服类
  support: { icon: "headphones", label: "客户服务", keywords: ["客服", "support", "服务", "咨询"] },
  answer: { icon: "message-circle", label: "问答解答", keywords: ["解答", "answer", "回答", "问题"] },
  
  // 创意类
  creative: { icon: "sparkles", label: "创意生成", keywords: ["创意", "creative", "设计", "想法"] },
  image: { icon: "image", label: "图像处理", keywords: ["图片", "image", "图像", "视觉"] },
  
  // 数据类
  data: { icon: "database", label: "数据管理", keywords: ["数据", "data", "数据库"] },
  chart: { icon: "pie-chart", label: "图表可视化", keywords: ["图表", "chart", "可视化", "visualization"] },
  
  // 自动化类
  automation: { icon: "zap", label: "自动化", keywords: ["自动化", "automation", "流程", "workflow"] },
  integration: { icon: "plug", label: "系统集成", keywords: ["集成", "integration", "连接", "接口"] },
};

// 技能类型到能力的映射
const SKILL_TO_CAPABILITY: Record<string, CapabilityItem> = {
  "email": { icon: "mail", label: "邮件处理", description: "收发和管理邮件" },
  "calendar": { icon: "calendar", label: "日程管理", description: "管理日程和会议" },
  "web-search": { icon: "globe", label: "联网搜索", description: "实时搜索网络信息" },
  "pdf-parser": { icon: "file-text", label: "PDF解析", description: "解析PDF文档内容" },
  "chart-generator": { icon: "bar-chart-2", label: "图表生成", description: "生成数据可视化图表" },
  "code-interpreter": { icon: "code", label: "代码执行", description: "执行代码并返回结果" },
  "image-generation": { icon: "image", label: "图像生成", description: "AI生成图像" },
  "file-manager": { icon: "folder", label: "文件管理", description: "管理文件和目录" },
  "database": { icon: "database", label: "数据库操作", description: "查询和管理数据" },
};

// MCP 动作类型映射
const MCP_ACTION_TO_CAPABILITY: Record<string, CapabilityItem> = {
  "google_calendar": { icon: "calendar", label: "Google日历", description: "管理Google日历事件" },
  "gmail": { icon: "mail", label: "Gmail", description: "收发Gmail邮件" },
  "slack": { icon: "message-square", label: "Slack", description: "发送Slack消息" },
  "notion": { icon: "book", label: "Notion", description: "管理Notion文档" },
  "github": { icon: "github", label: "GitHub", description: "操作GitHub仓库" },
  "jira": { icon: "clipboard", label: "Jira", description: "管理Jira任务" },
  "http_request": { icon: "globe", label: "HTTP请求", description: "调用外部API" },
  "web_search": { icon: "search", label: "网络搜索", description: "搜索互联网信息" },
};

/**
 * 从文本中提取能力关键词
 */
function extractCapabilitiesFromText(text: string): CapabilityItem[] {
  const capabilities: CapabilityItem[] = [];
  const foundLabels = new Set<string>();
  
  for (const [, pattern] of Object.entries(CAPABILITY_PATTERNS)) {
    for (const keyword of pattern.keywords) {
      if (text.includes(keyword) && !foundLabels.has(pattern.label)) {
        capabilities.push({
          icon: pattern.icon,
          label: pattern.label,
        });
        foundLabels.add(pattern.label);
        break;
      }
    }
  }
  
  return capabilities;
}

/**
 * 从 skills 数组中提取能力
 */
function extractCapabilitiesFromSkills(skills: any[]): CapabilityItem[] {
  const capabilities: CapabilityItem[] = [];
  
  for (const skill of skills) {
    const skillId = typeof skill === 'string' ? skill : skill?.id || skill?.name;
    if (skillId && SKILL_TO_CAPABILITY[skillId]) {
      capabilities.push(SKILL_TO_CAPABILITY[skillId]);
    }
  }
  
  return capabilities;
}

/**
 * 从 MCP 动作中提取能力
 */
function extractCapabilitiesFromMCP(mcpActions: any[]): CapabilityItem[] {
  const capabilities: CapabilityItem[] = [];
  
  for (const action of mcpActions) {
    const actionType = action?.type || action?.name;
    if (actionType && MCP_ACTION_TO_CAPABILITY[actionType]) {
      capabilities.push(MCP_ACTION_TO_CAPABILITY[actionType]);
    }
  }
  
  return capabilities;
}

/**
 * 从智能体角色描述中提取核心职责
 */
function extractRoleFromPrompt(systemPrompt: string): string | undefined {
  // 匹配常见的角色描述模式
  const patterns = [
    /你是(?:一[名个位])?(.{2,20}?)[，,。.]/,
    /作为(?:一[名个位])?(.{2,20}?)[，,。.]/,
    /我是(?:一[名个位])?(.{2,20}?)[，,。.]/,
  ];
  
  for (const pattern of patterns) {
    const match = systemPrompt.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return undefined;
}

/**
 * 从 systemPrompt 中提取智能体的角色描述（更详细版本）
 */
function extractRoleDescription(systemPrompt: string): string | null {
  // 匹配常见的角色描述模式 - 提取逗号后的描述部分
  const patterns = [
    /你是[^，。\n]{2,}[，,]([^。\n]{5,50})/,
    /我是[^，。\n]{2,}[，,]([^。\n]{5,50})/,
    /作为([^，。\n]{5,50})/,
    /专业的([^，。\n]{5,40})/,
    /您的([^，。\n]{5,40}助手)/,
    /一[名个位]([^，。\n]{5,40})/,
  ];
  
  for (const pattern of patterns) {
    const match = systemPrompt.match(pattern);
    if (match && match[1]) {
      const desc = match[1].trim();
      // 过滤掉太短或太长的描述
      if (desc.length >= 4 && desc.length <= 50) {
        return desc;
      }
    }
  }
  
  return null;
}

/**
 * 从 systemPrompt 提取智能体的核心职责列表
 */
function extractResponsibilities(systemPrompt: string): string[] {
  const responsibilities: string[] = [];
  
  // 匹配列表形式的职责
  const listPattern = /(?:我可以|我能够?|主要职责|核心能力|我擅长|可以帮助?你?|能够)[:：]?\s*\n?((?:[\s]*[•\-\d\.●○■□]\s*.+\n?)+)/gi;
  
  let listMatch;
  while ((listMatch = listPattern.exec(systemPrompt)) !== null) {
    if (listMatch[1]) {
      const items = listMatch[1].split(/\n/).filter(line => line.trim());
      items.forEach(item => {
        const cleaned = item.replace(/^[\s•\-\d\.●○■□]+/, '').trim();
        if (cleaned.length >= 4 && cleaned.length <= 50 && !responsibilities.includes(cleaned)) {
          responsibilities.push(cleaned);
        }
      });
    }
  }
  
  // 匹配单行职责描述
  const singlePatterns = [
    /负责([^，。\n]{4,35})/g,
    /专注于([^，。\n]{4,35})/g,
    /擅长([^，。\n]{4,35})/g,
    /提供([^，。\n]{4,35}(?:服务|支持|帮助|建议|分析|咨询))/g,
    /帮助[^，。\n]{0,10}([^，。\n]{4,35})/g,
  ];
  
  for (const pattern of singlePatterns) {
    let match;
    while ((match = pattern.exec(systemPrompt)) !== null) {
      const cleaned = match[1].trim();
      if (cleaned.length >= 4 && cleaned.length <= 50 && !responsibilities.includes(cleaned)) {
        responsibilities.push(cleaned);
      }
    }
  }
  
  // 去重并限制数量
  return [...new Set(responsibilities)].slice(0, 4);
}

/**
 * 根据智能体特性生成个性化欢迎语
 */
function generateGreeting(
  agentName: string, 
  systemPrompt: string,
  manifest?: any
): string {
  // 1. 优先使用 manifest 中的预设欢迎语
  if (manifest?.greeting) {
    return manifest.greeting;
  }
  if (manifest?.welcomeMessage) {
    return manifest.welcomeMessage;
  }
  if (manifest?.metadata?.greeting) {
    return manifest.metadata.greeting;
  }
  
  // 2. 提取角色描述
  const roleDesc = extractRoleDescription(systemPrompt);
  const role = extractRoleFromPrompt(systemPrompt);
  
  // 3. 提取核心职责
  const responsibilities = extractResponsibilities(systemPrompt);
  
  // 4. 获取部门/领域信息
  const department = manifest?.metadata?.department || manifest?.department || '';
  const description = manifest?.metadata?.description || '';
  
  // 5. 构建个性化欢迎语
  let greeting = `你好！我是 ${agentName}`;
  
  if (roleDesc) {
    greeting += `，${roleDesc}`;
  } else if (role) {
    greeting += `，${role}`;
  } else if (department && department !== 'consumer' && department !== 'general') {
    greeting += `，您的${department}助手`;
  } else if (description && description.length > 5 && description.length < 60) {
    greeting += `，${description}`;
  }
  
  greeting += '。';
  
  // 6. 添加能力简介（如果有职责）
  if (responsibilities.length > 0) {
    greeting += '\n\n我可以帮您：';
    responsibilities.forEach((resp) => {
      greeting += `\n• ${resp}`;
    });
    greeting += '\n\n有什么我可以为您效劳的吗？';
  } else {
    greeting += ' 有什么我可以帮您的吗？';
  }
  
  return greeting;
}

/**
 * 生成快速开始建议
 */
function generateQuickStarts(
  capabilities: CapabilityItem[], 
  systemPrompt: string,
  responsibilities?: string[]
): string[] {
  const quickStarts: string[] = [];
  
  // 1. 优先使用从职责提取的建议
  if (responsibilities && responsibilities.length > 0) {
    responsibilities.slice(0, 2).forEach(resp => {
      // 转换职责为问句形式
      if (resp.length <= 20) {
        quickStarts.push(`帮我${resp}`);
      }
    });
  }
  
  // 2. 基于能力生成建议
  const capabilityLabels = capabilities.map(c => c.label);
  
  if (capabilityLabels.includes("数据分析") || capabilityLabels.includes("财务处理")) {
    if (!quickStarts.some(q => q.includes('分析'))) {
      quickStarts.push("帮我分析这份数据");
    }
  }
  
  if (capabilityLabels.includes("邮件处理")) {
    quickStarts.push("帮我整理今天的邮件");
  }
  
  if (capabilityLabels.includes("日程管理")) {
    quickStarts.push("查看今天的日程安排");
  }
  
  if (capabilityLabels.includes("内容撰写")) {
    quickStarts.push("帮我写一篇文章");
  }
  
  if (capabilityLabels.includes("代码辅助")) {
    quickStarts.push("帮我审查这段代码");
  }
  
  if (capabilityLabels.includes("客户服务") || capabilityLabels.includes("问答解答")) {
    quickStarts.push("我有一个问题想咨询");
  }
  
  if (capabilityLabels.includes("智能搜索")) {
    quickStarts.push("搜索最新的行业资讯");
  }
  
  if (capabilityLabels.includes("图表可视化")) {
    quickStarts.push("生成一个趋势图表");
  }
  
  // 3. 如果没有匹配到特定能力，提供通用建议
  if (quickStarts.length === 0) {
    quickStarts.push("有什么可以帮助你的吗？");
    quickStarts.push("告诉我你的需求");
  }
  
  // 去重并最多返回4个建议
  return [...new Set(quickStarts)].slice(0, 4);
}

/**
 * 主函数：提取智能体的结构化能力
 */
export function extractAgentCapabilities(
  agentName: string,
  systemPrompt: string,
  manifest?: any
): StructuredCapabilities {
  const allCapabilities: CapabilityItem[] = [];
  const knowledge: string[] = [];
  
  // 1. 从 systemPrompt 提取能力
  const textCapabilities = extractCapabilitiesFromText(systemPrompt);
  allCapabilities.push(...textCapabilities);
  
  // 2. 从 skills 提取能力
  if (manifest?.skills && Array.isArray(manifest.skills)) {
    const skillCapabilities = extractCapabilitiesFromSkills(manifest.skills);
    allCapabilities.push(...skillCapabilities);
  }
  
  // 3. 从 MCP 动作提取能力
  if (manifest?.mcpActions && Array.isArray(manifest.mcpActions)) {
    const mcpCapabilities = extractCapabilitiesFromMCP(manifest.mcpActions);
    allCapabilities.push(...mcpCapabilities);
  }
  
  // 4. 提取知识库
  if (manifest?.knowledgeBases && Array.isArray(manifest.knowledgeBases)) {
    for (const kb of manifest.knowledgeBases) {
      const kbName = typeof kb === 'string' ? kb : kb?.name;
      if (kbName) {
        knowledge.push(kbName);
      }
    }
  }
  
  // 去重
  const uniqueCapabilities = allCapabilities.reduce((acc, cap) => {
    if (!acc.find(c => c.label === cap.label)) {
      acc.push(cap);
    }
    return acc;
  }, [] as CapabilityItem[]);
  
  // 分类：前3个为核心能力，其余为扩展能力
  const core = uniqueCapabilities.slice(0, 3);
  const extended = uniqueCapabilities.slice(3, 6);
  
  // 提取职责列表（用于生成快速开始）
  const responsibilities = extractResponsibilities(systemPrompt);
  
  // 生成个性化欢迎语（传递 manifest 获取更多上下文）
  const greeting = generateGreeting(agentName, systemPrompt, manifest);
  
  // 生成快速开始建议（传递职责信息）
  const quickStarts = generateQuickStarts(uniqueCapabilities, systemPrompt, responsibilities);
  
  return {
    core,
    extended,
    knowledge,
    quickStarts,
    greeting,
  };
}

/**
 * 获取能力图标对应的 Lucide 组件名
 */
export function getIconComponent(iconName: string): string {
  // 转换为 PascalCase
  return iconName
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}
