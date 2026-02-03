// 网络策略类型定义 (Network Policy Types)

import type { ResourceLimits, NetworkPolicy, DomainRule } from './sandbox';

/**
 * MPLP 权限到网络域名的预定义映射
 */
export const MPLP_NETWORK_MAPPINGS: Record<string, string[]> = {
  // AI 服务
  'network:openai': ['api.openai.com', '*.openai.azure.com'],
  'network:anthropic': ['api.anthropic.com'],
  'network:google': ['generativelanguage.googleapis.com', '*.googleapis.com'],
  
  // 云服务
  'network:aws': ['*.amazonaws.com', '*.aws.amazon.com'],
  'network:gcp': ['*.googleapis.com', '*.google.com'],
  'network:azure': ['*.azure.com', '*.microsoft.com'],
  
  // 社交/协作平台
  'network:github': ['api.github.com', 'github.com', 'raw.githubusercontent.com'],
  'network:slack': ['slack.com', '*.slack.com', 'api.slack.com'],
  'network:notion': ['api.notion.com'],
  'network:discord': ['discord.com', '*.discord.com', 'api.discord.com'],
  
  // 搜索引擎
  'network:google_search': ['www.google.com', 'google.com', 'customsearch.googleapis.com'],
  'network:bing': ['www.bing.com', 'api.bing.microsoft.com'],
  
  // 数据服务
  'network:weather': ['api.openweathermap.org', 'api.weatherapi.com'],
  'network:finance': ['api.polygon.io', 'finnhub.io', '*.yahoo.com'],
  'network:news': ['newsapi.org', 'api.nytimes.com'],
  
  // 通用/内部
  'network:internal': ['*.supabase.co', 'localhost', '127.0.0.1'],
};

/**
 * 安全预设类型
 */
export type SecurityPresetKey = 'strict' | 'balanced' | 'permissive';

/**
 * 安全预设配置
 */
export interface SecurityPreset {
  name: string;
  description: string;
  limits: ResourceLimits;
  networkPolicy: NetworkPolicy;
}

/**
 * 预设安全策略
 */
export const SECURITY_PRESETS: Record<SecurityPresetKey, SecurityPreset> = {
  strict: {
    name: '严格模式',
    description: '仅允许内部 API 调用，最低资源配额',
    limits: {
      maxCpuMs: 50,
      maxMemoryMb: 32,
      maxExecutionMs: 5000,
      maxNetworkRequests: 5,
      maxOutputSizeKb: 100,
    },
    networkPolicy: {
      mode: 'allow_whitelist',
      whitelist: [
        { 
          pattern: '*.supabase.co', 
          protocols: ['https'],
          description: '内部 Supabase API',
        },
      ],
      mplpBindings: [],
    },
  },
  balanced: {
    name: '平衡模式',
    description: 'MPLP 控制的网络访问，适中资源配额',
    limits: {
      maxCpuMs: 100,
      maxMemoryMb: 64,
      maxExecutionMs: 10000,
      maxNetworkRequests: 20,
      maxOutputSizeKb: 500,
    },
    networkPolicy: {
      mode: 'mplp_controlled',
      whitelist: [
        { 
          pattern: '*.supabase.co', 
          protocols: ['https'],
          description: '内部 Supabase API',
        },
      ],
      mplpBindings: [],
    },
  },
  permissive: {
    name: '宽松模式',
    description: '允许更多网络访问，较高资源配额（需明确授权）',
    limits: {
      maxCpuMs: 200,
      maxMemoryMb: 128,
      maxExecutionMs: 30000,
      maxNetworkRequests: 50,
      maxOutputSizeKb: 2048,
    },
    networkPolicy: {
      mode: 'allow_whitelist',
      whitelist: [
        { 
          pattern: '*.supabase.co', 
          protocols: ['https'],
          description: '内部 Supabase API',
        },
      ],
      mplpBindings: [],
    },
  },
};

/**
 * 域名匹配检查
 */
export function matchDomain(domain: string, pattern: string): boolean {
  // 通配符模式: *.example.com
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(2);
    return domain === suffix || domain.endsWith('.' + suffix);
  }
  // 精确匹配
  return domain === pattern;
}

/**
 * 检查域名是否在白名单中
 */
export function isDomainWhitelisted(
  domain: string, 
  whitelist: DomainRule[]
): boolean {
  return whitelist.some(rule => matchDomain(domain, rule.pattern));
}

/**
 * 根据 MPLP 权限获取允许的域名
 */
export function getDomainsForPermissions(permissions: string[]): string[] {
  const domains = new Set<string>();
  
  for (const permission of permissions) {
    const mappedDomains = MPLP_NETWORK_MAPPINGS[permission];
    if (mappedDomains) {
      mappedDomains.forEach(d => domains.add(d));
    }
  }
  
  // 始终包含内部域名
  MPLP_NETWORK_MAPPINGS['network:internal']?.forEach(d => domains.add(d));
  
  return Array.from(domains);
}

/**
 * 获取域名所需的 MPLP 权限
 */
export function getRequiredPermissionForDomain(domain: string): string | null {
  for (const [permission, domains] of Object.entries(MPLP_NETWORK_MAPPINGS)) {
    if (domains.some(d => matchDomain(domain, d))) {
      return permission;
    }
  }
  return null;
}

/**
 * 检查网络访问是否被允许
 */
export function checkNetworkAccess(
  domain: string,
  policy: NetworkPolicy,
  grantedPermissions: string[]
): { allowed: boolean; reason?: string } {
  // 1. 检查白名单
  if (isDomainWhitelisted(domain, policy.whitelist)) {
    return { allowed: true };
  }
  
  // 2. 如果是 deny_all 模式，直接拒绝
  if (policy.mode === 'deny_all') {
    return { allowed: false, reason: 'Network access denied by policy' };
  }
  
  // 3. 检查 MPLP 绑定
  for (const binding of policy.mplpBindings) {
    if (grantedPermissions.includes(binding.permission)) {
      if (binding.domains.some(d => matchDomain(domain, d))) {
        return { allowed: true };
      }
    }
  }
  
  // 4. 检查全局 MPLP 映射
  for (const [permission, domains] of Object.entries(MPLP_NETWORK_MAPPINGS)) {
    if (grantedPermissions.includes(permission)) {
      if (domains.some(d => matchDomain(domain, d))) {
        return { allowed: true };
      }
    }
  }
  
  // 5. 未授权
  const requiredPermission = getRequiredPermissionForDomain(domain);
  return { 
    allowed: false, 
    reason: requiredPermission 
      ? `Requires permission: ${requiredPermission}` 
      : `Domain not in whitelist: ${domain}`,
  };
}

/**
 * 常用域名规则模板
 */
export const COMMON_DOMAIN_RULES: DomainRule[] = [
  {
    pattern: '*.supabase.co',
    protocols: ['https'],
    description: 'Supabase 服务',
  },
  {
    pattern: 'api.openai.com',
    protocols: ['https'],
    description: 'OpenAI API',
  },
  {
    pattern: 'api.anthropic.com',
    protocols: ['https'],
    description: 'Anthropic API',
  },
  {
    pattern: 'api.github.com',
    protocols: ['https'],
    description: 'GitHub API',
  },
  {
    pattern: '*.googleapis.com',
    protocols: ['https'],
    description: 'Google APIs',
  },
];
