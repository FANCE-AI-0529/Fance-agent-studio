// =====================================================
// 模型映射工具
// Model Mapping - Translate UI model names to Gateway models
// =====================================================

// Lovable AI Gateway 支持的模型
export const VALID_GATEWAY_MODELS = [
  'google/gemini-2.5-pro',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
  'google/gemini-3-pro-preview',
  'google/gemini-3-flash-preview',
  'openai/gpt-5',
  'openai/gpt-5-mini',
  'openai/gpt-5-nano',
  'openai/gpt-5.2',
] as const;

export type ValidGatewayModel = typeof VALID_GATEWAY_MODELS[number];

// UI 模型名 -> Gateway 模型名映射
const MODEL_MAP: Record<string, ValidGatewayModel> = {
  // Claude 系列 -> Gemini (不支持 Claude)
  'claude-3.5': 'google/gemini-2.5-flash',
  'claude-3.5-sonnet': 'google/gemini-2.5-flash',
  'claude-3': 'google/gemini-2.5-flash',
  'claude': 'google/gemini-2.5-flash',
  
  // GPT 系列映射
  'gpt-4': 'openai/gpt-5-mini',
  'gpt-4-turbo': 'openai/gpt-5-mini',
  'gpt-4o': 'openai/gpt-5-mini',
  'gpt-3.5': 'google/gemini-2.5-flash-lite',
  'gpt-3.5-turbo': 'google/gemini-2.5-flash-lite',
  
  // UI 友好名称
  'Claude 3.5': 'google/gemini-2.5-flash',
  'GPT-4': 'openai/gpt-5-mini',
  'Gemini Pro': 'google/gemini-2.5-pro',
  'Gemini Flash': 'google/gemini-2.5-flash',
};

/**
 * 将 UI 模型名称映射为 Lovable AI Gateway 支持的模型
 * @param uiModel - 用户界面显示的模型名称
 * @returns Gateway 支持的模型名称
 */
export function mapToGatewayModel(uiModel?: string): ValidGatewayModel {
  if (!uiModel) {
    return 'google/gemini-2.5-flash';
  }
  
  // 如果已经是有效的 Gateway 模型，直接返回
  if (VALID_GATEWAY_MODELS.includes(uiModel as ValidGatewayModel)) {
    return uiModel as ValidGatewayModel;
  }
  
  // 查找映射
  const mapped = MODEL_MAP[uiModel];
  if (mapped) {
    return mapped;
  }
  
  // 尝试模糊匹配
  const lowerModel = uiModel.toLowerCase();
  
  if (lowerModel.includes('claude')) {
    return 'google/gemini-2.5-flash';
  }
  if (lowerModel.includes('gpt-4') || lowerModel.includes('gpt4')) {
    return 'openai/gpt-5-mini';
  }
  if (lowerModel.includes('gpt-3') || lowerModel.includes('gpt3')) {
    return 'google/gemini-2.5-flash-lite';
  }
  if (lowerModel.includes('gemini') && lowerModel.includes('pro')) {
    return 'google/gemini-2.5-pro';
  }
  if (lowerModel.includes('gemini')) {
    return 'google/gemini-2.5-flash';
  }
  
  // 默认返回 Gemini Flash
  return 'google/gemini-2.5-flash';
}

/**
 * 检查模型是否为有效的 Gateway 模型
 */
export function isValidGatewayModel(model: string): model is ValidGatewayModel {
  return VALID_GATEWAY_MODELS.includes(model as ValidGatewayModel);
}
