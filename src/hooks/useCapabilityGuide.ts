import { useState, useCallback } from 'react';

// MCP 能力描述映射
export const MCP_CAPABILITY_MAP: Record<string, { action: string; example: string; verb: string }> = {
  'email': { 
    action: '发送邮件', 
    example: '帮我给张经理发一封邮件',
    verb: '发邮件'
  },
  'send-email': { 
    action: '发送邮件', 
    example: '帮我给张经理发一封邮件',
    verb: '发邮件'
  },
  'calendar': { 
    action: '管理日程', 
    example: '帮我安排明天下午的会议',
    verb: '安排日程'
  },
  'web-search': { 
    action: '联网搜索', 
    example: '帮我查一下今天的新闻',
    verb: '搜索'
  },
  'search': { 
    action: '联网搜索', 
    example: '帮我搜一下最新的科技动态',
    verb: '搜索'
  },
  'file-manager': { 
    action: '管理文件', 
    example: '帮我找到上周的报告',
    verb: '管理文件'
  },
  'database': { 
    action: '查询数据库', 
    example: '帮我查一下本月的销售数据',
    verb: '查数据'
  },
  'weather': { 
    action: '查询天气', 
    example: '今天北京天气怎么样',
    verb: '查天气'
  },
  'translator': { 
    action: '翻译文本', 
    example: '帮我把这段话翻译成英文',
    verb: '翻译'
  },
  'code': { 
    action: '编写代码', 
    example: '帮我写一个排序函数',
    verb: '写代码'
  },
  'image-gen': { 
    action: '生成图片', 
    example: '帮我生成一张风景图',
    verb: '生成图片'
  },
  'notion': { 
    action: '管理 Notion', 
    example: '帮我在 Notion 创建一个新页面',
    verb: '用 Notion'
  },
  'slack': { 
    action: '发送 Slack 消息', 
    example: '帮我给团队发一条 Slack 通知',
    verb: '发 Slack'
  },
  'github': { 
    action: '管理 GitHub', 
    example: '帮我查一下这个仓库的最新 PR',
    verb: '用 GitHub'
  },
  'jira': { 
    action: '管理 Jira 任务', 
    example: '帮我创建一个新的 Jira 任务',
    verb: '用 Jira'
  },
};

interface CapabilityGuide {
  capabilityName: string;
  suggestion: string;
  action: string;
}

export function useCapabilityGuide() {
  const [pendingGuide, setPendingGuide] = useState<CapabilityGuide | null>(null);

  // 根据节点数据生成智能描述
  const generateMcpDescription = useCallback((nodeData: any): { 
    description: string; 
    suggestion: string;
    action: string;
  } => {
    const mcpType = nodeData?.mcp_server || nodeData?.tool_name || nodeData?.name || '';
    const mcpTypeLower = mcpType.toLowerCase();
    
    // 尝试匹配已知的 MCP 类型
    for (const [key, capability] of Object.entries(MCP_CAPABILITY_MAP)) {
      if (mcpTypeLower.includes(key)) {
        return {
          description: `[${nodeData?.name || mcpType}] 能力已上线。现在您可以让我${capability.action}了，试试说 "${capability.example}"`,
          suggestion: capability.example,
          action: capability.action,
        };
      }
    }
    
    // 默认描述
    return {
      description: `[${nodeData?.name || '新功能'}] 能力已上线。现在您可以使用这个功能了。`,
      suggestion: `使用 ${nodeData?.name || '新功能'}`,
      action: '使用新功能',
    };
  }, []);

  // 当检测到新能力时生成引导
  const generateGuide = useCallback((nodeData: any) => {
    const { suggestion, action } = generateMcpDescription(nodeData);
    
    setPendingGuide({
      capabilityName: nodeData?.name || '新功能',
      suggestion,
      action,
    });
  }, [generateMcpDescription]);

  // 用户点击"试一试"后清除引导并返回建议
  const consumeGuide = useCallback(() => {
    const guide = pendingGuide;
    setPendingGuide(null);
    return guide;
  }, [pendingGuide]);

  // 清除引导
  const clearGuide = useCallback(() => {
    setPendingGuide(null);
  }, []);

  return { 
    pendingGuide, 
    generateGuide, 
    consumeGuide, 
    clearGuide,
    generateMcpDescription,
  };
}
