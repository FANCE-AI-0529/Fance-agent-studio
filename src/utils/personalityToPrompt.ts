// Personality configuration types
export interface PersonalityConfig {
  professional: number; // 0 = 活泼, 1 = 专业
  detailed: number;     // 0 = 简洁, 1 = 详细
  humor: number;        // 0 = 严肃, 1 = 幽默
  creative: number;     // 0 = 保守, 1 = 创意
  preset?: string;      // 预设模板名称
}

// Preset personality templates
export const personalityPresets: Record<string, { name: string; icon: string; config: PersonalityConfig; description: string }> = {
  expert: {
    name: "严肃专家",
    icon: "👨‍🏫",
    description: "专业、权威、条理清晰",
    config: { professional: 0.9, detailed: 0.7, humor: 0.1, creative: 0.3, preset: "expert" }
  },
  bestie: {
    name: "暖心闺蜜",
    icon: "💕",
    description: "温暖、贴心、善解人意",
    config: { professional: 0.2, detailed: 0.5, humor: 0.4, creative: 0.6, preset: "bestie" }
  },
  comedian: {
    name: "幽默段子手",
    icon: "😄",
    description: "风趣、活泼、妙语连珠",
    config: { professional: 0.3, detailed: 0.4, humor: 0.95, creative: 0.8, preset: "comedian" }
  },
  consultant: {
    name: "专业顾问",
    icon: "💼",
    description: "商务、专业、解决问题",
    config: { professional: 0.85, detailed: 0.8, humor: 0.15, creative: 0.4, preset: "consultant" }
  },
  mentor: {
    name: "耐心导师",
    icon: "🎓",
    description: "循循善诱、耐心细致",
    config: { professional: 0.6, detailed: 0.85, humor: 0.25, creative: 0.5, preset: "mentor" }
  },
  creative: {
    name: "创意达人",
    icon: "🎨",
    description: "天马行空、创意无限",
    config: { professional: 0.4, detailed: 0.5, humor: 0.5, creative: 0.95, preset: "creative" }
  }
};

// Dimension labels for sliders
export const personalityDimensions = [
  { key: "professional" as const, leftLabel: "活泼", rightLabel: "专业", icon: "Briefcase" },
  { key: "detailed" as const, leftLabel: "简洁", rightLabel: "详细", icon: "FileText" },
  { key: "humor" as const, leftLabel: "严肃", rightLabel: "幽默", icon: "Smile" },
  { key: "creative" as const, leftLabel: "保守", rightLabel: "创意", icon: "Lightbulb" }
];

// Convert personality config to prompt text
export function personalityToPrompt(config: PersonalityConfig): string {
  const traits: string[] = [];

  // Professional dimension
  if (config.professional >= 0.7) {
    traits.push("保持专业、权威的语气");
    traits.push("使用行业术语和精准的表达");
  } else if (config.professional <= 0.3) {
    traits.push("使用轻松活泼的语气");
    traits.push("像朋友一样交流，可以使用口语化表达");
  } else {
    traits.push("语气自然亲切，兼顾专业性");
  }

  // Detailed dimension
  if (config.detailed >= 0.7) {
    traits.push("回答要详尽完整，提供充分的解释和例子");
    traits.push("分步骤说明，确保用户理解");
  } else if (config.detailed <= 0.3) {
    traits.push("回答要简洁扼要，直击重点");
    traits.push("避免冗长的解释，言简意赅");
  } else {
    traits.push("回答详略得当，根据问题复杂度调整");
  }

  // Humor dimension
  if (config.humor >= 0.7) {
    traits.push("适当加入幽默元素和俏皮话");
    traits.push("可以使用表情符号增添趣味");
  } else if (config.humor <= 0.3) {
    traits.push("保持严肃认真的态度");
    traits.push("专注于内容本身，不需要搞笑");
  } else {
    traits.push("偶尔可以轻松一下，但以内容为主");
  }

  // Creative dimension
  if (config.creative >= 0.7) {
    traits.push("鼓励创新思维，提供独特的见解");
    traits.push("不拘泥于常规，可以天马行空");
  } else if (config.creative <= 0.3) {
    traits.push("遵循已验证的方法和最佳实践");
    traits.push("给出稳妥可靠的建议");
  } else {
    traits.push("在可靠性和创新性之间保持平衡");
  }

  return `【个性设定】\n${traits.map(t => `- ${t}`).join('\n')}`;
}

// Merge personality prompt with existing system prompt
export function mergePersonalityWithPrompt(systemPrompt: string, config: PersonalityConfig | null): string {
  if (!config) return systemPrompt;
  
  const personalitySection = personalityToPrompt(config);
  
  // If system prompt already has personality section, replace it
  if (systemPrompt.includes("【个性设定】")) {
    return systemPrompt.replace(/【个性设定】[\s\S]*?(?=\n\n|$)/, personalitySection);
  }
  
  // Otherwise append at the end
  return `${systemPrompt}\n\n${personalitySection}`;
}

// Get default personality config
export function getDefaultPersonalityConfig(): PersonalityConfig {
  return {
    professional: 0.5,
    detailed: 0.5,
    humor: 0.3,
    creative: 0.5
  };
}
