// =====================================================
// Agent OS Terminal Style Guide
// 终端风格回复格式规范常量
// =====================================================

/**
 * Terminal Visual Identifiers
 * 终端视觉标识符 - 替代 Markdown 加粗
 */
export const TERMINAL_SYMBOLS = {
  // Headers and sections
  header: (text: string) => `[${text}]`,
  separator: '---',
  
  // Status indicators
  success: '[v]',
  failure: '[x]',
  warning: '(!)',
  pending: '[ ]',
  
  // Quote and list
  quote: '>',
  bullet: '-',
  
  // Reference citation
  ref: (source: string, location?: string) => 
    location ? `(Ref: ${source} - ${location})` : `(Ref: ${source})`,
  
  // Box drawing characters
  box: {
    topLeft: '┌─',
    topRight: '─┐',
    bottomLeft: '└─',
    bottomRight: '─┘',
    vertical: '│',
    horizontal: '─',
    verticalRight: '├─',
    verticalLeft: '─┤',
  },
  
  // Mode indicators
  modes: {
    plan: '[MODE: PLAN]',
    build: '[MODE: BUILD]',
    runtime: '[MODE: RUNTIME]',
    debug: '[MODE: DEBUG]',
  },
} as const;

/**
 * Response Mode Types
 */
export type ResponseMode = 'builder' | 'runtime' | 'clarification' | 'debug';

/**
 * Response Templates for Different Modes
 * 不同模式的回复模板
 */
export const RESPONSE_TEMPLATES = {
  builder: `
[构建请求分析]
> 意图: {intent}
> 核心资产: {assets}

[架构蓝图]
┌─ 蓝图类型: {blueprintType}
├─ 节点规划:
│  1. {node1} (Trigger)
│  2. {node2} (Action)
└─ 数据流向: {dataflow}

[执行结果]
[v] 步骤完成
(!) 需确认: {confirmItem}

[系统就绪]
智能体已生成。
`,

  runtime: `
{directAnswer}

{details}
- 关键点 A: {pointA}
- 关键点 B: {pointB}

---
[引用源]
[1] {source1} (Ref: {location1})

[状态]
耗时: {duration} | 消耗: {tokens} Token
`,

  clarification: `
[需要更多信息]
为了准确执行任务，请明确以下选择：

选项 A: {optionA}
  详情: {detailA}
  匹配度: High

选项 B: {optionB}
  详情: {detailB}
  匹配度: Medium

请回复 A 或 B。
`,

  debug: `
[系统拦截 / 错误报告]
类型: {errorType}
位置: {location}

原因分析:
> {reason}

建议操作:
- [ ] {action1}
- [ ] {action2}
`,
} as const;

/**
 * Terminal Style CSS Classes
 * 终端风格 CSS 类名
 */
export const TERMINAL_CLASSES = {
  container: 'font-mono text-sm leading-relaxed',
  header: 'text-primary font-medium',
  success: 'text-green-500',
  failure: 'text-red-500',
  warning: 'text-yellow-500',
  pending: 'text-muted-foreground',
  ref: 'text-muted-foreground italic text-xs',
  boxChar: 'text-border',
  separator: 'border-t border-border my-2',
  quote: 'text-muted-foreground pl-2 border-l-2 border-border',
} as const;

/**
 * Pattern Detection for Response Mode
 */
export const MODE_PATTERNS = {
  builder: [
    /\[构建/,
    /\[架构/,
    /\[蓝图/,
    /\[执行结果\]/,
    /\[系统就绪\]/,
    /节点规划/,
  ],
  debug: [
    /\[系统拦截/,
    /\[错误报告\]/,
    /\[错误\]/,
    /类型:\s*\w+_ERROR/,
    /MPLP.*BLOCK/,
  ],
  clarification: [
    /\[需要.*信息\]/,
    /\[需要确认\]/,
    /选项\s*[A-Z]:/,
    /请回复\s*[A-Z]/,
  ],
  runtime: [], // Default fallback
} as const;

/**
 * Detect response mode from content
 */
export function detectResponseMode(content: string): ResponseMode {
  for (const pattern of MODE_PATTERNS.builder) {
    if (pattern.test(content)) return 'builder';
  }
  for (const pattern of MODE_PATTERNS.debug) {
    if (pattern.test(content)) return 'debug';
  }
  for (const pattern of MODE_PATTERNS.clarification) {
    if (pattern.test(content)) return 'clarification';
  }
  return 'runtime';
}

/**
 * Format helper for terminal-style output
 */
export function formatTerminalBlock(
  type: 'box' | 'list' | 'quote',
  lines: string[]
): string {
  switch (type) {
    case 'box':
      if (lines.length === 0) return '';
      const result = [TERMINAL_SYMBOLS.box.topLeft + lines[0]];
      for (let i = 1; i < lines.length - 1; i++) {
        result.push(TERMINAL_SYMBOLS.box.verticalRight + lines[i]);
      }
      if (lines.length > 1) {
        result.push(TERMINAL_SYMBOLS.box.bottomLeft + lines[lines.length - 1]);
      }
      return result.join('\n');
    
    case 'list':
      return lines.map(l => `${TERMINAL_SYMBOLS.bullet} ${l}`).join('\n');
    
    case 'quote':
      return lines.map(l => `${TERMINAL_SYMBOLS.quote} ${l}`).join('\n');
    
    default:
      return lines.join('\n');
  }
}
