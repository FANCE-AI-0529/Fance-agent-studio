// 危险操作检测规则 (Dangerous Operation Detection Rules)

/**
 * 风险等级
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * 危险模式定义
 */
export interface DangerousPattern {
  id: string;
  pattern: RegExp;
  category: 'bash' | 'filesystem' | 'network' | 'privilege' | 'data_exfil';
  riskLevel: RiskLevel;
  description: string;
  requiredPermission: string;
}

/**
 * Bash 危险命令模式
 */
const BASH_PATTERNS: DangerousPattern[] = [
  {
    id: 'rm_rf',
    pattern: /\brm\s+(-[rfRF]+\s+|\s+-[rfRF]*\s)*(\/|~|\$HOME|\$PWD|\.\.|\.)/,
    category: 'bash',
    riskLevel: 'critical',
    description: '递归强制删除文件/目录',
    requiredPermission: 'ipc:destructive_fs',
  },
  {
    id: 'rm_system',
    pattern: /\brm\s+.*\/(etc|usr|bin|sbin|var|boot|lib|opt)\b/,
    category: 'bash',
    riskLevel: 'critical',
    description: '删除系统关键目录',
    requiredPermission: 'ipc:destructive_fs',
  },
  {
    id: 'mkfs_format',
    pattern: /\bmkfs\b/,
    category: 'bash',
    riskLevel: 'critical',
    description: '格式化磁盘',
    requiredPermission: 'ipc:destructive_fs',
  },
  {
    id: 'dd_write',
    pattern: /\bdd\s+.*of=\/dev\//,
    category: 'bash',
    riskLevel: 'critical',
    description: '直接写入设备',
    requiredPermission: 'ipc:destructive_fs',
  },
  {
    id: 'shutdown',
    pattern: /\b(shutdown|reboot|poweroff|halt|init\s+[06])\b/,
    category: 'bash',
    riskLevel: 'high',
    description: '关机/重启系统',
    requiredPermission: 'ipc:system_control',
  },
  {
    id: 'kill_all',
    pattern: /\b(killall|pkill\s+-9|kill\s+-9\s+-1)\b/,
    category: 'bash',
    riskLevel: 'high',
    description: '终止所有进程',
    requiredPermission: 'ipc:process_control',
  },
];

/**
 * 文件系统危险操作模式
 */
const FS_PATTERNS: DangerousPattern[] = [
  {
    id: 'chmod_777',
    pattern: /\bchmod\s+(-R\s+)?777\b/,
    category: 'filesystem',
    riskLevel: 'high',
    description: '设置完全开放权限',
    requiredPermission: 'ipc:permission_change',
  },
  {
    id: 'chown_root',
    pattern: /\bchown\s+(-R\s+)?root/,
    category: 'filesystem',
    riskLevel: 'high',
    description: '更改所有者为 root',
    requiredPermission: 'ipc:permission_change',
  },
  {
    id: 'write_etc',
    pattern: />\s*\/etc\//,
    category: 'filesystem',
    riskLevel: 'high',
    description: '写入系统配置目录',
    requiredPermission: 'ipc:system_config',
  },
  {
    id: 'modify_crontab',
    pattern: /\bcrontab\b|\/etc\/cron/,
    category: 'filesystem',
    riskLevel: 'medium',
    description: '修改定时任务',
    requiredPermission: 'ipc:scheduler',
  },
  {
    id: 'ssh_keys',
    pattern: /\.ssh\/(authorized_keys|id_rsa|id_ed25519)/,
    category: 'filesystem',
    riskLevel: 'high',
    description: '访问/修改 SSH 密钥',
    requiredPermission: 'ipc:credential_access',
  },
];

/**
 * 网络外传检测规则
 */
const NETWORK_PATTERNS: DangerousPattern[] = [
  {
    id: 'curl_upload',
    pattern: /\bcurl\s+.*(-F|--data|--upload-file|-T)\b/,
    category: 'network',
    riskLevel: 'medium',
    description: '通过 curl 上传数据',
    requiredPermission: 'ipc:network_upload',
  },
  {
    id: 'wget_exec',
    pattern: /\bwget\s+.*\|\s*(bash|sh|python)/,
    category: 'network',
    riskLevel: 'critical',
    description: '下载并执行远程脚本',
    requiredPermission: 'ipc:remote_exec',
  },
  {
    id: 'nc_reverse_shell',
    pattern: /\b(nc|netcat|ncat)\s+.*(-e|exec)\b/,
    category: 'network',
    riskLevel: 'critical',
    description: '反向 Shell 连接',
    requiredPermission: 'ipc:network_shell',
  },
  {
    id: 'ssh_tunnel',
    pattern: /\bssh\s+.*(-L|-R|-D)\b/,
    category: 'network',
    riskLevel: 'high',
    description: 'SSH 隧道/端口转发',
    requiredPermission: 'ipc:network_tunnel',
  },
  {
    id: 'dns_exfil',
    pattern: /\bdig\s+.*@\b|\bnslookup\s+.*\$\(/,
    category: 'data_exfil',
    riskLevel: 'high',
    description: '可能的 DNS 数据外泄',
    requiredPermission: 'ipc:data_exfil',
  },
];

/**
 * 权限提升检测规则
 */
const PRIVILEGE_PATTERNS: DangerousPattern[] = [
  {
    id: 'sudo',
    pattern: /\bsudo\b/,
    category: 'privilege',
    riskLevel: 'high',
    description: '提升为管理员权限',
    requiredPermission: 'ipc:privilege_escalation',
  },
  {
    id: 'su_root',
    pattern: /\bsu\s+(-\s+)?root\b|\bsu\s+-\s*$/,
    category: 'privilege',
    riskLevel: 'critical',
    description: '切换为 root 用户',
    requiredPermission: 'ipc:privilege_escalation',
  },
  {
    id: 'setuid',
    pattern: /\bchmod\s+.*[u\+]s\b/,
    category: 'privilege',
    riskLevel: 'critical',
    description: '设置 SUID 位',
    requiredPermission: 'ipc:privilege_escalation',
  },
  {
    id: 'docker_run',
    pattern: /\bdocker\s+run\s+.*--privileged/,
    category: 'privilege',
    riskLevel: 'critical',
    description: '运行特权 Docker 容器',
    requiredPermission: 'ipc:container_escape',
  },
];

/**
 * 所有危险模式
 */
export const DANGEROUS_PATTERNS: DangerousPattern[] = [
  ...BASH_PATTERNS,
  ...FS_PATTERNS,
  ...NETWORK_PATTERNS,
  ...PRIVILEGE_PATTERNS,
];

/**
 * 分类命令风险
 */
export function classifyCommandRisk(command: string): {
  level: RiskLevel;
  matchedPatterns: DangerousPattern[];
  matchedPattern?: string;
  description: string;
  requiredPermission?: string;
} {
  const matched: DangerousPattern[] = [];

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.pattern.test(command)) {
      matched.push(pattern);
    }
  }

  if (matched.length === 0) {
    return { level: 'low', matchedPatterns: [], description: '无已知风险' };
  }

  // 取最高风险等级
  const levelOrder: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
  const highest = matched.reduce((max, p) => 
    levelOrder.indexOf(p.riskLevel) > levelOrder.indexOf(max.riskLevel) ? p : max
  );

  return {
    level: highest.riskLevel,
    matchedPatterns: matched,
    matchedPattern: highest.id,
    description: matched.map(m => m.description).join('; '),
    requiredPermission: highest.requiredPermission,
  };
}

/**
 * 获取分类的危险模式
 */
export function getPatternsByCategory(category: DangerousPattern['category']): DangerousPattern[] {
  return DANGEROUS_PATTERNS.filter(p => p.category === category);
}

/**
 * 获取分类的风险等级颜色
 */
export function getRiskLevelColor(level: RiskLevel): string {
  switch (level) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'warning';
    case 'low': return 'secondary';
  }
}
