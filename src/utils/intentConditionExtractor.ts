// =====================================================
// 条件意图提取器
// Intent Condition Extractor - Extracts conditional logic from user descriptions
// =====================================================

export type ConditionOperator = 
  | 'greater_than' 
  | 'less_than' 
  | 'equals' 
  | 'greater_than_or_equal' 
  | 'less_than_or_equal'
  | 'contains'
  | 'not_equals';

export interface ExtractedCondition {
  field: string;           // e.g., "profit_growth"
  operator: ConditionOperator;
  value: string | number;
  trueAction: string;      // e.g., "发邮件"
  falseAction?: string;    // e.g., null (no else branch)
  rawExpression: string;   // Original matched text
}

export interface ConditionExtractionResult {
  hasCondition: boolean;
  conditions: ExtractedCondition[];
}

// Keywords that indicate conditional logic
const CONDITION_KEYWORDS = [
  '如果', '假如', '当', '若', 
  '条件', '判断', '检查',
  'if', 'when', 'condition'
];

// Pattern matching for conditional expressions
const CONDITION_PATTERNS = [
  // "如果X超过/大于Y，就Z"
  {
    regex: /如果(.+?)(?:超过|大于)(.+?)(?:，|,)就(.+?)(?:[。,，]|$)/g,
    extractor: (match: RegExpMatchArray): ExtractedCondition => ({
      field: normalizeField(match[1]),
      operator: 'greater_than',
      value: parseValue(match[2]),
      trueAction: match[3].trim(),
      rawExpression: match[0],
    }),
  },
  // "如果X小于Y，就Z"
  {
    regex: /如果(.+?)(?:小于|低于)(.+?)(?:，|,)就(.+?)(?:[。,，]|$)/g,
    extractor: (match: RegExpMatchArray): ExtractedCondition => ({
      field: normalizeField(match[1]),
      operator: 'less_than',
      value: parseValue(match[2]),
      trueAction: match[3].trim(),
      rawExpression: match[0],
    }),
  },
  // "如果X达到Y，就Z"
  {
    regex: /如果(.+?)(?:达到|等于|是)(.+?)(?:，|,)就(.+?)(?:[。,，]|$)/g,
    extractor: (match: RegExpMatchArray): ExtractedCondition => ({
      field: normalizeField(match[1]),
      operator: 'greater_than_or_equal',
      value: parseValue(match[2]),
      trueAction: match[3].trim(),
      rawExpression: match[0],
    }),
  },
  // "当X>Y时，执行Z"
  {
    regex: /当(.+?)(>|<|=|>=|<=)(.+?)时(?:，|,)?(.+?)(?:[。,，]|$)/g,
    extractor: (match: RegExpMatchArray): ExtractedCondition => ({
      field: normalizeField(match[1]),
      operator: mapSymbolToOperator(match[2]),
      value: parseValue(match[3]),
      trueAction: match[4].trim(),
      rawExpression: match[0],
    }),
  },
  // "X超过Y%时，Z" (percentage patterns)
  {
    regex: /(.+?)超过(\d+(?:\.\d+)?)[%％](?:时)?(?:，|,)?(.+?)(?:[。,，]|$)/g,
    extractor: (match: RegExpMatchArray): ExtractedCondition => ({
      field: normalizeField(match[1]),
      operator: 'greater_than',
      value: parseFloat(match[2]) / 100, // Convert percentage to decimal
      trueAction: match[3].trim(),
      rawExpression: match[0],
    }),
  },
  // "如果X包含Y，就Z"
  {
    regex: /如果(.+?)(?:包含|有|含有)(.+?)(?:，|,)就(.+?)(?:[。,，]|$)/g,
    extractor: (match: RegExpMatchArray): ExtractedCondition => ({
      field: normalizeField(match[1]),
      operator: 'contains',
      value: match[2].trim(),
      trueAction: match[3].trim(),
      rawExpression: match[0],
    }),
  },
];

// Map operator symbols to enum values
function mapSymbolToOperator(symbol: string): ConditionOperator {
  const mapping: Record<string, ConditionOperator> = {
    '>': 'greater_than',
    '<': 'less_than',
    '=': 'equals',
    '>=': 'greater_than_or_equal',
    '<=': 'less_than_or_equal',
  };
  return mapping[symbol] || 'equals';
}

// Normalize field names from natural language to code-friendly identifiers
function normalizeField(input: string): string {
  const fieldMappings: Record<string, string> = {
    '利润增长': 'profit_growth',
    '利润': 'profit',
    '增长率': 'growth_rate',
    '销售额': 'sales_amount',
    '收入': 'revenue',
    '成本': 'cost',
    '库存': 'inventory',
    '数量': 'quantity',
    '金额': 'amount',
    '比例': 'ratio',
    '百分比': 'percentage',
    '评分': 'score',
    '满意度': 'satisfaction',
    '温度': 'temperature',
    '状态': 'status',
  };

  const cleaned = input.trim();
  
  // Check direct mapping first
  for (const [key, value] of Object.entries(fieldMappings)) {
    if (cleaned.includes(key)) {
      return value;
    }
  }

  // Convert to snake_case
  return cleaned
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase() || 'field';
}

// Parse value from string (handle numbers, percentages, etc.)
function parseValue(input: string): string | number {
  const cleaned = input.trim();
  
  // Check for percentage
  const percentMatch = cleaned.match(/(\d+(?:\.\d+)?)[%％]/);
  if (percentMatch) {
    return parseFloat(percentMatch[1]) / 100;
  }

  // Check for pure number
  const numMatch = cleaned.match(/^(\d+(?:\.\d+)?)$/);
  if (numMatch) {
    return parseFloat(numMatch[1]);
  }

  // Check for number with units (e.g., "20%", "1000元")
  const numWithUnit = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (numWithUnit) {
    return parseFloat(numWithUnit[1]);
  }

  return cleaned;
}

/**
 * Main extraction function - analyzes text for conditional logic
 */
export function extractConditions(description: string): ConditionExtractionResult {
  const conditions: ExtractedCondition[] = [];

  // Check if description contains any condition keywords
  const hasConditionKeyword = CONDITION_KEYWORDS.some(kw => 
    description.toLowerCase().includes(kw.toLowerCase())
  );

  if (!hasConditionKeyword) {
    return { hasCondition: false, conditions: [] };
  }

  // Try each pattern
  for (const pattern of CONDITION_PATTERNS) {
    // Reset regex state
    pattern.regex.lastIndex = 0;
    
    let match;
    while ((match = pattern.regex.exec(description)) !== null) {
      try {
        const extracted = pattern.extractor(match);
        // Avoid duplicates
        if (!conditions.some(c => c.rawExpression === extracted.rawExpression)) {
          conditions.push(extracted);
        }
      } catch (e) {
        console.warn('[ConditionExtractor] Failed to extract from match:', match[0], e);
      }
    }
  }

  return {
    hasCondition: conditions.length > 0,
    conditions,
  };
}

/**
 * Check if description likely needs a condition node
 */
export function needsConditionNode(description: string): boolean {
  return extractConditions(description).hasCondition;
}

/**
 * Generate condition node rules from extracted conditions
 */
export function generateConditionRules(conditions: ExtractedCondition[]): Array<{
  field: string;
  operator: ConditionOperator;
  value: string | number;
}> {
  return conditions.map(c => ({
    field: c.field,
    operator: c.operator,
    value: c.value,
  }));
}

/**
 * Determine the true and false branch actions
 */
export function getBranchActions(conditions: ExtractedCondition[]): {
  trueAction: string | null;
  falseAction: string | null;
} {
  if (conditions.length === 0) {
    return { trueAction: null, falseAction: null };
  }

  // Use the first condition's actions
  const first = conditions[0];
  return {
    trueAction: first.trueAction || null,
    falseAction: first.falseAction || null,
  };
}

/**
 * Infer what MCP action should be triggered from the true action description
 */
export function inferMCPFromAction(actionDescription: string): {
  serverId: string;
  toolName: string;
} | null {
  const actionMappings: Record<string, { serverId: string; toolName: string }> = {
    '发邮件': { serverId: 'email', toolName: 'send_email' },
    '发送邮件': { serverId: 'email', toolName: 'send_email' },
    '邮件通知': { serverId: 'email', toolName: 'send_email' },
    '通知': { serverId: 'email', toolName: 'send_email' },
    '发消息': { serverId: 'slack', toolName: 'send_message' },
    '发送消息': { serverId: 'slack', toolName: 'send_message' },
    '保存': { serverId: 'database', toolName: 'insert_record' },
    '存储': { serverId: 'database', toolName: 'insert_record' },
    '记录': { serverId: 'database', toolName: 'insert_record' },
    '更新': { serverId: 'database', toolName: 'update_record' },
    '创建任务': { serverId: 'notion', toolName: 'create_page' },
    '添加日程': { serverId: 'google-calendar', toolName: 'create_event' },
  };

  for (const [keyword, mcp] of Object.entries(actionMappings)) {
    if (actionDescription.includes(keyword)) {
      return mcp;
    }
  }

  return null;
}
