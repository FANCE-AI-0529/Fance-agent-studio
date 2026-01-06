// MCP Category to MPLP Permission Mapping
// Maps MCP skill categories to required system permissions

export interface MCPPermissionRule {
  permissions: string[];
  description: string;
}

// MCP 分类 → 所需 MPLP 权限
export const mcpCategoryPermissions: Record<string, MCPPermissionRule> = {
  aggregators: {
    permissions: ['network', 'read'],
    description: '聚合多个 MCP 服务器的能力',
  },
  browser: {
    permissions: ['network', 'execute'],
    description: '浏览器自动化需要网络和执行权限',
  },
  cloud: {
    permissions: ['network', 'execute', 'write'],
    description: '云平台操作需要完整的网络和写入权限',
  },
  code_execution: {
    permissions: ['execute', 'sandbox'],
    description: '代码执行需要沙箱环境权限',
  },
  communication: {
    permissions: ['network', 'write'],
    description: '通信服务需要网络和写入权限',
  },
  database: {
    permissions: ['network', 'read', 'write'],
    description: '数据库操作需要读写权限',
  },
  dev_tools: {
    permissions: ['read', 'execute'],
    description: '开发工具需要读取和执行权限',
  },
  file_systems: {
    permissions: ['read', 'write'],
    description: '文件系统操作需要读写权限',
  },
  finance: {
    permissions: ['network', 'read'],
    description: '金融数据需要网络读取权限',
  },
  knowledge: {
    permissions: ['read', 'write'],
    description: '知识管理需要读写权限',
  },
  location: {
    permissions: ['network', 'read'],
    description: '位置服务需要网络读取权限',
  },
  marketing: {
    permissions: ['network', 'write'],
    description: '营销工具需要网络写入权限',
  },
  monitoring: {
    permissions: ['network', 'read'],
    description: '监控服务需要网络读取权限',
  },
  search: {
    permissions: ['network', 'read'],
    description: '搜索服务需要网络读取权限',
  },
  security: {
    permissions: ['read', 'execute'],
    description: '安全工具需要读取和执行权限',
  },
  travel: {
    permissions: ['network', 'read'],
    description: '旅行服务需要网络读取权限',
  },
  version_control: {
    permissions: ['network', 'read', 'write'],
    description: '版本控制需要完整的读写权限',
  },
  productivity: {
    permissions: ['read', 'write'],
    description: '效率工具需要读写权限',
  },
  media: {
    permissions: ['read', 'write', 'network'],
    description: '媒体处理需要读写和网络权限',
  },
  other: {
    permissions: ['read'],
    description: '其他类别默认只读权限',
  },
};

// Tool 名称模式 → 额外所需权限
export const mcpToolPatternPermissions: Array<{
  pattern: RegExp;
  permissions: string[];
  description: string;
}> = [
  {
    pattern: /^(create|insert|add|post|upload)_/i,
    permissions: ['write'],
    description: '创建操作需要写入权限',
  },
  {
    pattern: /^(update|edit|modify|patch)_/i,
    permissions: ['write'],
    description: '更新操作需要写入权限',
  },
  {
    pattern: /^(delete|remove|destroy)_/i,
    permissions: ['delete', 'write'],
    description: '删除操作需要删除和写入权限',
  },
  {
    pattern: /^(execute|run|invoke|call)_/i,
    permissions: ['execute'],
    description: '执行操作需要执行权限',
  },
  {
    pattern: /^(send|push|notify|email|sms)_/i,
    permissions: ['network', 'write'],
    description: '发送操作需要网络和写入权限',
  },
  {
    pattern: /^(download|fetch|get|retrieve|read)_/i,
    permissions: ['read', 'network'],
    description: '获取操作需要读取和网络权限',
  },
  {
    pattern: /^(screenshot|capture|record)_/i,
    permissions: ['read', 'write'],
    description: '截图/录制需要读写权限',
  },
  {
    pattern: /^(navigate|browse|open)_/i,
    permissions: ['network'],
    description: '导航操作需要网络权限',
  },
  {
    pattern: /^(query|search|find|list)_/i,
    permissions: ['read'],
    description: '查询操作需要读取权限',
  },
  {
    pattern: /^(auth|login|logout|verify)_/i,
    permissions: ['network', 'execute'],
    description: '认证操作需要网络和执行权限',
  },
];

// 所有可用的 MPLP 权限类型
export const allMPLPPermissions = [
  'read',
  'write',
  'delete',
  'execute',
  'network',
  'sandbox',
] as const;

export type MPLPPermission = (typeof allMPLPPermissions)[number];

// 权限图标和颜色映射
export const permissionMeta: Record<
  MPLPPermission,
  { icon: string; color: string; label: string }
> = {
  read: { icon: 'Eye', color: 'text-blue-500', label: '读取' },
  write: { icon: 'Pencil', color: 'text-amber-500', label: '写入' },
  delete: { icon: 'Trash2', color: 'text-red-500', label: '删除' },
  execute: { icon: 'Play', color: 'text-green-500', label: '执行' },
  network: { icon: 'Globe', color: 'text-purple-500', label: '网络' },
  sandbox: { icon: 'Shield', color: 'text-cyan-500', label: '沙箱' },
};

// 计算 MCP 技能所需的权限
export function calculateMCPPermissions(
  category: string,
  enabledTools: string[] = []
): string[] {
  const permissions = new Set<string>();

  // 1. 根据分类添加基础权限
  const categoryRule = mcpCategoryPermissions[category] || mcpCategoryPermissions.other;
  categoryRule.permissions.forEach((p) => permissions.add(p));

  // 2. 根据启用的工具名称匹配额外权限
  enabledTools.forEach((toolName) => {
    mcpToolPatternPermissions.forEach((rule) => {
      if (rule.pattern.test(toolName)) {
        rule.permissions.forEach((p) => permissions.add(p));
      }
    });
  });

  return Array.from(permissions);
}

// 检测 MCP 技能可能需要的环境变量
export const mcpCategoryEnvVars: Record<string, Array<{
  name: string;
  description: string;
  required: boolean;
  type: 'string' | 'boolean' | 'number';
  example?: string;
}>> = {
  database: [
    { name: 'DATABASE_URL', description: '数据库连接字符串', required: true, type: 'string', example: 'postgresql://...' },
    { name: 'DATABASE_SSL', description: '是否启用 SSL', required: false, type: 'boolean' },
  ],
  browser: [
    { name: 'BROWSER_PATH', description: '浏览器可执行文件路径', required: false, type: 'string', example: '/usr/bin/chromium' },
    { name: 'HEADLESS', description: '是否使用无头模式', required: false, type: 'boolean' },
  ],
  cloud: [
    { name: 'API_KEY', description: 'API 密钥', required: true, type: 'string' },
    { name: 'API_SECRET', description: 'API 密钥', required: false, type: 'string' },
    { name: 'REGION', description: '云服务区域', required: false, type: 'string', example: 'us-east-1' },
  ],
  communication: [
    { name: 'API_TOKEN', description: 'API 令牌', required: true, type: 'string' },
    { name: 'WEBHOOK_URL', description: 'Webhook 回调地址', required: false, type: 'string' },
  ],
  version_control: [
    { name: 'GITHUB_TOKEN', description: 'GitHub 访问令牌', required: true, type: 'string' },
    { name: 'GITLAB_TOKEN', description: 'GitLab 访问令牌', required: false, type: 'string' },
  ],
  search: [
    { name: 'API_KEY', description: '搜索服务 API 密钥', required: true, type: 'string' },
  ],
};
