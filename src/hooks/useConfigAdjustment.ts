import { useCallback } from "react";
import { PersonalityConfig } from "../utils/personalityToPrompt.ts";

interface AdjustmentResult {
  adjustedConfig: Partial<PersonalityConfig>;
  adjustedPrompt?: string;
  description: string;
}

// Adjustment patterns and their effects
const adjustmentPatterns: Array<{
  patterns: RegExp[];
  effect: Partial<PersonalityConfig>;
  description: string;
}> = [
  {
    patterns: [/温柔/, /温暖/, /亲切/, /友好/],
    effect: { professional: -0.2, humor: 0.1 },
    description: "调整为更温柔亲切的风格"
  },
  {
    patterns: [/专业/, /正式/, /权威/],
    effect: { professional: 0.25, humor: -0.15 },
    description: "调整为更专业正式的风格"
  },
  {
    patterns: [/活泼/, /轻松/, /随意/],
    effect: { professional: -0.25, humor: 0.15 },
    description: "调整为更活泼轻松的风格"
  },
  {
    patterns: [/幽默/, /有趣/, /搞笑/],
    effect: { humor: 0.3, creative: 0.1 },
    description: "增加幽默感"
  },
  {
    patterns: [/严肃/, /认真/, /正经/],
    effect: { humor: -0.25, professional: 0.1 },
    description: "调整为更严肃认真的风格"
  },
  {
    patterns: [/简洁/, /精简/, /简短/],
    effect: { detailed: -0.3 },
    description: "回复将更加简洁"
  },
  {
    patterns: [/详细/, /具体/, /完整/],
    effect: { detailed: 0.3 },
    description: "回复将更加详细"
  },
  {
    patterns: [/创意/, /创新/, /有想法/],
    effect: { creative: 0.25 },
    description: "增加创意和创新性"
  },
  {
    patterns: [/保守/, /稳妥/, /可靠/],
    effect: { creative: -0.2, professional: 0.1 },
    description: "调整为更稳妥可靠的风格"
  }
];

export function useConfigAdjustment() {
  const parseAdjustment = useCallback((
    input: string,
    currentConfig: PersonalityConfig
  ): AdjustmentResult | null => {
    const inputLower = input.toLowerCase();
    
    // Find matching patterns
    for (const pattern of adjustmentPatterns) {
      const matched = pattern.patterns.some(p => p.test(inputLower));
      if (matched) {
        // Apply adjustments with bounds checking
        const adjustedConfig: Partial<PersonalityConfig> = {};
        
        for (const [key, delta] of Object.entries(pattern.effect)) {
          if (key === "preset") continue;
          const currentValue = currentConfig[key as keyof Omit<PersonalityConfig, "preset">];
          if (typeof currentValue === "number" && typeof delta === "number") {
            const newValue = Math.max(0, Math.min(1, currentValue + delta));
            (adjustedConfig as Record<string, number>)[key] = newValue;
          }
        }

        // Clear preset when manually adjusting
        adjustedConfig.preset = undefined;

        return {
          adjustedConfig,
          description: pattern.description
        };
      }
    }

    return null;
  }, []);

  const applyAdjustment = useCallback((
    currentConfig: PersonalityConfig,
    adjustment: Partial<PersonalityConfig>
  ): PersonalityConfig => {
    return {
      ...currentConfig,
      ...adjustment,
      preset: undefined // Always clear preset on adjustment
    };
  }, []);

  const getAdjustmentSuggestions = useCallback((): string[] => {
    return [
      "说话温柔一点",
      "更专业一些",
      "活泼一点",
      "加点幽默",
      "回复简洁点",
      "详细解释一下"
    ];
  }, []);

  return {
    parseAdjustment,
    applyAdjustment,
    getAdjustmentSuggestions
  };
}
