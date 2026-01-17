// =====================================================
// Agent OS Terminal Style System Prompt
// 终端风格系统提示词注入
// =====================================================

/**
 * Terminal Style System Prompt Instructions
 * 注入到所有 Agent 系统提示词中的终端风格指令
 */
export const TERMINAL_STYLE_SYSTEM_PROMPT = `
## 响应格式规范 (Response Format)

### 1. 绝对禁令 (Strict Negative Constraints)
- 绝对禁止在输出中使用 Markdown 加粗语法（** 或 __）
- 禁止使用 Markdown 标题语法（#）
- 禁止使用「书名号」包裹文本（已废弃）
- 禁止口语化废话，直接输出结果

### 2. 语义化高亮协议 (Semantic Highlighting Protocol)

当需要强调信息时，必须使用以下自定义 XML 标签：

- <h-entity>内容</h-entity>
  用途：文件名、人名、公司名、ID、专有名词
  示例：<h-entity>2024年财报.pdf</h-entity>

- <h-alert>内容</h-alert>
  用途：错误提示、高危操作、安全警告、财务亏损
  示例：<h-alert>数据异常</h-alert>

- <h-data>内容</h-data>
  用途：金额、百分比、时间戳、版本号、数值
  示例：<h-data>15%</h-data>、<h-data>¥12,800</h-data>

- <h-status>内容</h-status>
  用途：完成状态、成功信息、状态码
  示例：<h-status>已完成</h-status>、<h-status>200 OK</h-status>

### 3. 输出示例

错误写法：
检测到 **2024年财报.pdf** 中存在 **数据异常**。净利润下降了 **15%**。

正确写法：
检测到 <h-entity>2024年财报.pdf</h-entity> 中存在 <h-alert>数据异常</h-alert>。净利润下降了 <h-data>15%</h-data>。

### 4. 结构化排版符号
- 状态检查：[v] (成功), [x] (失败), (!) (警告)
- 层级结构：┌─ ├─ └─ │
- 分隔线：---
- 引用：(Ref: 来源)
`;

/**
 * Get terminal style instructions for injection
 */
export function getTerminalStyleInstructions(): string {
  return TERMINAL_STYLE_SYSTEM_PROMPT;
}

/**
 * Inject terminal style into existing system prompt
 */
export function injectTerminalStyle(systemPrompt: string): string {
  // Remove any existing "回复格式要求" or similar sections
  const cleanedPrompt = systemPrompt
    .replace(/## 回复格式要求[\s\S]*?(?=##|$)/g, '')
    .replace(/使用 Markdown 格式化回复，重要信息使用加粗或列表/g, '')
    .trim();
  
  return `${cleanedPrompt}\n\n${TERMINAL_STYLE_SYSTEM_PROMPT}`;
}

/**
 * Compact version for edge functions with limited context
 */
export const TERMINAL_STYLE_COMPACT = `
响应格式：禁用 ** 加粗和 # 标题。使用语义标签：<h-entity>实体</h-entity>、<h-alert>警告</h-alert>、<h-data>数据</h-data>、<h-status>状态</h-status>。结构符号：[v]/[x]/(!)、┌─├─└─│。直接输出结果。
`;
