// =====================================================
// 类型转换注入器 - Type Adapter Injector
// 自动插入类型转换节点处理不兼容的数据类型
// =====================================================

import {
  IODataType,
  TypeConversionRule,
  AdapterNodeSpec,
  ConverterType,
} from '@/types/wiringTypes';

// ========== 类型兼容性矩阵 ==========

export const TYPE_COMPATIBILITY_MATRIX: Record<
  IODataType,
  Record<IODataType, TypeConversionRule | null>
> = {
  string: {
    string: { from: 'string', to: 'string', converter: 'direct', confidence: 1.0 },
    number: null, // 不建议自动转换
    boolean: null,
    object: { from: 'string', to: 'object', converter: 'parse', confidence: 0.6, description: 'JSON 解析' },
    array: { from: 'string', to: 'array', converter: 'parse', confidence: 0.5, description: 'JSON 解析为数组' },
    image: { from: 'string', to: 'image', converter: 'llm_transform', adapterNodeType: 'image_generator', confidence: 0.3 },
    file: null,
    any: { from: 'string', to: 'any', converter: 'direct', confidence: 1.0 },
  },
  number: {
    string: { from: 'number', to: 'string', converter: 'stringify', confidence: 0.9 },
    number: { from: 'number', to: 'number', converter: 'direct', confidence: 1.0 },
    boolean: { from: 'number', to: 'boolean', converter: 'format', confidence: 0.7, description: '非零为true' },
    object: null,
    array: null,
    image: null,
    file: null,
    any: { from: 'number', to: 'any', converter: 'direct', confidence: 1.0 },
  },
  boolean: {
    string: { from: 'boolean', to: 'string', converter: 'stringify', confidence: 0.9 },
    number: { from: 'boolean', to: 'number', converter: 'format', confidence: 0.8, description: 'true=1, false=0' },
    boolean: { from: 'boolean', to: 'boolean', converter: 'direct', confidence: 1.0 },
    object: null,
    array: null,
    image: null,
    file: null,
    any: { from: 'boolean', to: 'any', converter: 'direct', confidence: 1.0 },
  },
  object: {
    string: { from: 'object', to: 'string', converter: 'stringify', confidence: 0.8, description: 'JSON 序列化' },
    number: { from: 'object', to: 'number', converter: 'extract', confidence: 0.4, description: '提取数值字段' },
    boolean: null,
    object: { from: 'object', to: 'object', converter: 'direct', confidence: 1.0 },
    array: { from: 'object', to: 'array', converter: 'format', confidence: 0.5, description: '转换为数组' },
    image: null,
    file: null,
    any: { from: 'object', to: 'any', converter: 'direct', confidence: 1.0 },
  },
  array: {
    string: { from: 'array', to: 'string', converter: 'stringify', confidence: 0.7, description: 'JSON 序列化' },
    number: { from: 'array', to: 'number', converter: 'extract', confidence: 0.3, description: '提取长度或首元素' },
    boolean: null,
    object: { from: 'array', to: 'object', converter: 'format', confidence: 0.5, description: '包装为对象' },
    array: { from: 'array', to: 'array', converter: 'direct', confidence: 1.0 },
    image: null,
    file: null,
    any: { from: 'array', to: 'any', converter: 'direct', confidence: 1.0 },
  },
  image: {
    string: { from: 'image', to: 'string', converter: 'llm_transform', confidence: 0.6, description: '图像描述' },
    number: null,
    boolean: null,
    object: { from: 'image', to: 'object', converter: 'format', confidence: 0.5, description: '元数据对象' },
    array: null,
    image: { from: 'image', to: 'image', converter: 'direct', confidence: 1.0 },
    file: { from: 'image', to: 'file', converter: 'direct', confidence: 0.9 },
    any: { from: 'image', to: 'any', converter: 'direct', confidence: 1.0 },
  },
  file: {
    string: { from: 'file', to: 'string', converter: 'extract', confidence: 0.7, description: '读取文件内容' },
    number: null,
    boolean: null,
    object: { from: 'file', to: 'object', converter: 'parse', confidence: 0.5, description: '解析文件内容' },
    array: null,
    image: null,
    file: { from: 'file', to: 'file', converter: 'direct', confidence: 1.0 },
    any: { from: 'file', to: 'any', converter: 'direct', confidence: 1.0 },
  },
  any: {
    string: { from: 'any', to: 'string', converter: 'stringify', confidence: 0.8 },
    number: { from: 'any', to: 'number', converter: 'extract', confidence: 0.5 },
    boolean: { from: 'any', to: 'boolean', converter: 'format', confidence: 0.5 },
    object: { from: 'any', to: 'object', converter: 'direct', confidence: 0.9 },
    array: { from: 'any', to: 'array', converter: 'format', confidence: 0.6 },
    image: { from: 'any', to: 'image', converter: 'llm_transform', confidence: 0.3 },
    file: { from: 'any', to: 'file', converter: 'format', confidence: 0.4 },
    any: { from: 'any', to: 'any', converter: 'direct', confidence: 1.0 },
  },
};

// ========== 检测是否需要类型转换 ==========

export function needsTypeAdapter(
  sourceType: IODataType,
  targetType: IODataType
): { needed: boolean; rule?: TypeConversionRule } {
  // 相同类型不需要转换
  if (sourceType === targetType) {
    return { needed: false };
  }

  // 目标是 any 不需要转换
  if (targetType === 'any') {
    return { needed: false };
  }

  // 源是 any 通常也不需要（运行时处理）
  if (sourceType === 'any') {
    return { needed: false };
  }

  const rule = TYPE_COMPATIBILITY_MATRIX[sourceType]?.[targetType];

  if (!rule) {
    // 无转换规则 - 需要 LLM 转换
    return {
      needed: true,
      rule: {
        from: sourceType,
        to: targetType,
        converter: 'llm_transform',
        confidence: 0.3,
        description: `需要 LLM 辅助从 ${sourceType} 转换到 ${targetType}`,
      },
    };
  }

  return {
    needed: rule.converter !== 'direct',
    rule,
  };
}

// ========== 创建类型转换适配器节点 ==========

export function createAdapterNode(
  rule: TypeConversionRule,
  sourceNodeId: string,
  targetNodeId: string,
  context: { sourcePortName: string; targetPortName: string }
): AdapterNodeSpec {
  const adapterId = `adapter-${sourceNodeId}-${targetNodeId}-${Date.now()}`;

  switch (rule.converter) {
    case 'llm_transform':
      return {
        id: adapterId,
        type: 'llm_transform',
        name: `转换: ${context.sourcePortName} → ${context.targetPortName}`,
        inputType: rule.from,
        outputType: rule.to,
        config: {
          prompt: buildTransformPrompt(rule.from, rule.to, context),
        },
      };

    case 'stringify':
      return {
        id: adapterId,
        type: 'format_converter',
        name: `JSON序列化`,
        inputType: rule.from,
        outputType: 'string',
        config: {
          formatTemplate: 'JSON.stringify(input, null, 2)',
        },
      };

    case 'parse':
      return {
        id: adapterId,
        type: 'format_converter',
        name: `JSON解析`,
        inputType: 'string',
        outputType: rule.to,
        config: {
          formatTemplate: 'JSON.parse(input)',
        },
      };

    case 'extract':
      return {
        id: adapterId,
        type: 'extractor',
        name: `提取 ${context.targetPortName}`,
        inputType: rule.from,
        outputType: rule.to,
        config: {
          extractPath: guessExtractPath(context.targetPortName),
        },
      };

    case 'format':
      return {
        id: adapterId,
        type: 'format_converter',
        name: `格式转换`,
        inputType: rule.from,
        outputType: rule.to,
        config: {
          formatTemplate: buildFormatTemplate(rule.from, rule.to),
        },
      };

    default:
      return {
        id: adapterId,
        type: 'llm_transform',
        name: `智能转换`,
        inputType: rule.from,
        outputType: rule.to,
        config: {
          prompt: `将输入数据从 ${rule.from} 类型转换为 ${rule.to} 类型`,
        },
      };
  }
}

// ========== 构建转换提示词 ==========

function buildTransformPrompt(
  fromType: IODataType,
  toType: IODataType,
  context: { sourcePortName: string; targetPortName: string }
): string {
  const prompts: Record<string, string> = {
    'string-image': `根据以下文本描述生成一张图片。描述: {{input}}`,
    'image-string': `请描述这张图片的内容，生成详细的文本描述。`,
    'object-string': `将以下 JSON 对象转换为自然语言描述:\n\n{{input}}\n\n请用简洁清晰的语言描述数据内容。`,
    'array-string': `将以下数组数据转换为可读的文本格式:\n\n{{input}}`,
    'string-object': `从以下文本中提取结构化信息，返回 JSON 格式:\n\n{{input}}\n\n请提取关键信息并组织成 JSON 对象。`,
  };

  const key = `${fromType}-${toType}`;
  return prompts[key] || `将 "${context.sourcePortName}" (${fromType}) 转换为 "${context.targetPortName}" (${toType}):\n\n{{input}}\n\n请只输出转换后的结果。`;
}

// ========== 猜测提取路径 ==========

function guessExtractPath(targetPortName: string): string {
  const pathMappings: Record<string, string> = {
    'content': 'content',
    'text': 'text',
    'body': 'body',
    'message': 'message',
    'result': 'result',
    'data': 'data',
    'value': 'value',
    'output': 'output',
    'id': 'id',
    'name': 'name',
    'title': 'title',
    'status': 'status',
    'length': 'length',
    'count': 'length',
  };

  const lowerName = targetPortName.toLowerCase();
  for (const [key, path] of Object.entries(pathMappings)) {
    if (lowerName.includes(key)) {
      return path;
    }
  }

  return targetPortName;
}

// ========== 构建格式转换模板 ==========

function buildFormatTemplate(fromType: IODataType, toType: IODataType): string {
  const templates: Record<string, string> = {
    'number-boolean': 'Boolean(input)',
    'boolean-number': 'input ? 1 : 0',
    'object-array': 'Object.values(input)',
    'array-object': '{ items: input, length: input.length }',
    'any-array': 'Array.isArray(input) ? input : [input]',
    'any-boolean': 'Boolean(input)',
  };

  return templates[`${fromType}-${toType}`] || 'input';
}

// ========== 获取所有可用的转换规则 ==========

export function getAvailableConversions(fromType: IODataType): TypeConversionRule[] {
  const conversions = TYPE_COMPATIBILITY_MATRIX[fromType];
  if (!conversions) return [];

  return Object.values(conversions).filter((rule): rule is TypeConversionRule => rule !== null);
}

// ========== 查找最佳转换路径 ==========

export function findBestConversionPath(
  fromType: IODataType,
  toType: IODataType
): TypeConversionRule[] {
  // 直接转换
  const directRule = TYPE_COMPATIBILITY_MATRIX[fromType]?.[toType];
  if (directRule) {
    return [directRule];
  }

  // 寻找两步转换路径
  const intermediateTypes: IODataType[] = ['string', 'object', 'any'];
  let bestPath: TypeConversionRule[] = [];
  let bestConfidence = 0;

  for (const intermediate of intermediateTypes) {
    const step1 = TYPE_COMPATIBILITY_MATRIX[fromType]?.[intermediate];
    const step2 = TYPE_COMPATIBILITY_MATRIX[intermediate]?.[toType];

    if (step1 && step2) {
      const pathConfidence = step1.confidence * step2.confidence;
      if (pathConfidence > bestConfidence) {
        bestConfidence = pathConfidence;
        bestPath = [step1, step2];
      }
    }
  }

  return bestPath;
}

// ========== 验证转换可行性 ==========

export function canConvert(fromType: IODataType, toType: IODataType): boolean {
  if (fromType === toType || toType === 'any') return true;

  const rule = TYPE_COMPATIBILITY_MATRIX[fromType]?.[toType];
  if (rule) return true;

  // 检查两步转换
  const path = findBestConversionPath(fromType, toType);
  return path.length > 0;
}

// ========== 批量创建适配器节点 ==========

export function createAdaptersForConnections(
  connections: Array<{
    sourceNodeId: string;
    sourceType: IODataType;
    sourcePortName: string;
    targetNodeId: string;
    targetType: IODataType;
    targetPortName: string;
  }>
): AdapterNodeSpec[] {
  const adapters: AdapterNodeSpec[] = [];

  for (const conn of connections) {
    const check = needsTypeAdapter(conn.sourceType, conn.targetType);
    if (check.needed && check.rule) {
      adapters.push(
        createAdapterNode(check.rule, conn.sourceNodeId, conn.targetNodeId, {
          sourcePortName: conn.sourcePortName,
          targetPortName: conn.targetPortName,
        })
      );
    }
  }

  return adapters;
}
