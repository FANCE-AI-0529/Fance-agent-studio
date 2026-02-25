// =====================================================
// HIVE Terminal Style System Prompt
// 终端风格系统提示词注入 - 强化语义标签规范
// =====================================================

/**
 * Semantic Tag Definitions
 * 语义标签定义 - 确保 LLM 输出遵循规范
 */
export const SEMANTIC_TAGS = {
  entity: { tag: 'h-entity', desc: '实体标识：文件名、人名、公司名、ID、专有名词' },
  alert: { tag: 'h-alert', desc: '警告信息：错误提示、高危操作、安全警告、财务亏损' },
  data: { tag: 'h-data', desc: '数值数据：金额、百分比、时间戳、版本号、数值' },
  status: { tag: 'h-status', desc: '状态标识：完成状态、成功信息、状态码' },
  link: { tag: 'h-link', desc: '可点击链接：URL、内部跳转' },
  code: { tag: 'h-code', desc: '行内代码：命令、变量名、代码片段' },
  quote: { tag: 'h-quote', desc: '引用来源：文档引用、知识库引用' },
  action: { tag: 'h-action', desc: '可执行操作：按钮文本、操作指令' },
} as const;

/**
 * Terminal Style System Prompt Instructions
 * 注入到所有 Agent 系统提示词中的终端风格指令
 */
export const TERMINAL_STYLE_SYSTEM_PROMPT = `
## 响应格式规范 (Response Format Specification)

### 1. 绝对禁令 (CRITICAL - Negative Constraints)
⛔ 绝对禁止使用 Markdown 加粗语法（** 或 __）
⛔ 禁止使用 Markdown 标题语法（#, ##, ###）
⛔ 禁止使用「书名号」包裹文本
⛔ 禁止口语化废话，直接输出结果
⛔ 禁止使用 Markdown 列表符号 (-, *, 1.)

### 2. 语义化高亮协议 (Semantic Highlighting Protocol - MANDATORY)

你必须使用以下自定义 XML 标签来强调信息，这是强制性要求：

#### 核心标签 (Core Tags)
- <h-entity>内容</h-entity>
  用途：文件名、人名、公司名、ID、专有名词、产品名
  示例：<h-entity>2024年财报.pdf</h-entity>、<h-entity>张三</h-entity>

- <h-alert>内容</h-alert>
  用途：错误提示、高危操作、安全警告、财务亏损、异常状态
  示例：<h-alert>数据异常</h-alert>、<h-alert>权限不足</h-alert>

- <h-data>内容</h-data>
  用途：金额、百分比、时间戳、版本号、数值、日期
  示例：<h-data>15%</h-data>、<h-data>¥12,800</h-data>、<h-data>2024-01-15</h-data>

- <h-status>内容</h-status>
  用途：完成状态、成功信息、状态码、处理结果
  示例：<h-status>已完成</h-status>、<h-status>200 OK</h-status>

#### 扩展标签 (Extended Tags)
- <h-link>内容</h-link>
  用途：可点击链接、URL引用
  示例：<h-link>查看详情</h-link>

- <h-code>内容</h-code>
  用途：命令、变量名、代码片段
  示例：<h-code>npm install</h-code>

- <h-quote ref="来源">内容</h-quote>
  用途：引用知识库或文档内容
  示例：<h-quote ref="财报.pdf#P12">净利润同比增长</h-quote>

- <h-action>内容</h-action>
  用途：可执行的操作建议
  示例：<h-action>立即修复</h-action>

### 3. 标签使用规则 (Usage Rules)

#### 必须使用标签的场景：
1. 所有金额必须使用 <h-data>
2. 所有百分比必须使用 <h-data>
3. 所有日期/时间必须使用 <h-data>
4. 所有版本号必须使用 <h-data>
5. 所有文件名必须使用 <h-entity>
6. 所有人名/公司名必须使用 <h-entity>
7. 所有错误/警告必须使用 <h-alert>
8. 所有完成状态必须使用 <h-status>
9. 引用知识库内容必须使用 <h-quote>

### 4. 输出对比示例

❌ 错误写法：
检测到 **2024年财报.pdf** 中存在 **数据异常**。净利润下降了 **15%**。建议 **立即修复**。

✅ 正确写法：
检测到 <h-entity>2024年财报.pdf</h-entity> 中存在 <h-alert>数据异常</h-alert>。净利润下降了 <h-data>15%</h-data>。建议 <h-action>立即修复</h-action>。

❌ 错误写法：
任务完成！耗时 2.5 秒，处理了 100 条数据。

✅ 正确写法：
<h-status>任务完成</h-status> 耗时 <h-data>2.5 秒</h-data>，处理了 <h-data>100</h-data> 条数据。

### 5. 结构化排版符号 (Structure Symbols)
[v] 成功/完成
[x] 失败/错误
(!) 警告/注意
[ ] 待处理

┌─ 层级起始
├─ 层级中间
└─ 层级结束
│  层级连接

---（分隔线）
(Ref: 来源)（引用标注）
`;

/**
 * Get terminal style instructions for injection
 */
export function getTerminalStyleInstructions(): string {
  return TERMINAL_STYLE_SYSTEM_PROMPT;
}

/**
 * Get semantic tag list for validation
 */
export function getSemanticTagNames(): string[] {
  return Object.values(SEMANTIC_TAGS).map(t => t.tag);
}

/**
 * Inject terminal style into existing system prompt
 */
export function injectTerminalStyle(systemPrompt: string): string {
  // Remove any existing formatting requirements
  const cleanedPrompt = systemPrompt
    .replace(/## 回复格式要求[\s\S]*?(?=##|$)/g, '')
    .replace(/## 响应格式规范[\s\S]*?(?=##|$)/g, '')
    .replace(/使用 Markdown 格式化回复，重要信息使用加粗或列表/g, '')
    .replace(/\*\*(.+?)\*\*/g, '<h-entity>$1</h-entity>') // Auto-convert legacy bold
    .trim();
  
  return `${cleanedPrompt}\n\n${TERMINAL_STYLE_SYSTEM_PROMPT}`;
}

/**
 * Compact version for edge functions with limited context
 */
export const TERMINAL_STYLE_COMPACT = `
响应格式：禁用 ** 加粗和 # 标题。必须使用语义标签：
<h-entity>实体</h-entity>（文件/人名/ID）
<h-alert>警告</h-alert>（错误/警告）
<h-data>数据</h-data>（金额/百分比/日期）
<h-status>状态</h-status>（完成/成功）
<h-quote ref="源">引用</h-quote>（知识库引用）
<h-action>操作</h-action>（建议操作）
结构符号：[v]/[x]/(!)、┌─├─└─│
`;

/**
 * Validate if content follows semantic tag rules
 */
export function validateSemanticTags(content: string): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Check for forbidden patterns
  if (/\*\*(.+?)\*\*/.test(content)) {
    issues.push('检测到 Markdown 加粗语法 (**)');
    suggestions.push('使用 <h-entity> 或其他语义标签替代');
  }
  
  if (/^#{1,6}\s/m.test(content)) {
    issues.push('检测到 Markdown 标题语法 (#)');
    suggestions.push('使用 [标题] 方括号格式替代');
  }
  
  // Check for untagged data patterns
  const moneyPattern = /(?<![<>])¥[\d,]+(?![<>])/;
  if (moneyPattern.test(content)) {
    suggestions.push('金额数值应使用 <h-data>¥xxx</h-data>');
  }
  
  const percentPattern = /(?<![<>])\d+%(?![<>])/;
  if (percentPattern.test(content)) {
    suggestions.push('百分比应使用 <h-data>xx%</h-data>');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
  };
}
