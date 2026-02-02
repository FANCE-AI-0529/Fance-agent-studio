
# Agent OS Studio - 修复实施计划

## 批准的修复范围

本计划涵盖前面审查报告中批准的所有问题修复，按优先级分阶段实施。

---

## 第一阶段：关键功能修复（即时执行）

### 修复 1：AchievementShowcase React Ref 警告

**问题**：`TooltipTrigger` 尝试向 `motion.div` 传递 ref，但函数组件无法接收 ref。

**修复位置**：`src/components/dashboard/AchievementShowcase.tsx`

**修复方案**：使用 `asChild` 属性让 `TooltipTrigger` 正确传递 ref

```tsx
// 将第 69-83 行修改为：
<TooltipTrigger asChild>
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    className={cn(
      "w-12 h-12 rounded-xl flex items-center justify-center text-2xl cursor-pointer",
      isEarned 
        ? "bg-primary/10 border-2 border-primary/30" 
        : "bg-muted/50 border border-border opacity-50"
    )}
  >
    {isEarned ? def.icon : <Lock className="h-4 w-4 text-muted-foreground" />}
  </motion.div>
</TooltipTrigger>
```

### 修复 2：user_activity_log 重复键冲突

**问题**：每次页面加载触发 `INSERT`，导致 409 冲突错误。

**修复位置**：`src/hooks/useAchievements.ts`

**修复方案**：使用 `upsert` 替代 `insert`，并添加防重复调用逻辑

```tsx
// 修改 useLogActivity hook (第 206-223 行)
export function useLogActivity() {
  const { user } = useAuth();
  const hasLogged = useRef(false);

  const logActivity = useCallback(async () => {
    if (!user || hasLogged.current) return;
    hasLogged.current = true;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from("user_activity_log")
        .upsert(
          { user_id: user.id, activity_date: today },
          { onConflict: 'user_id,activity_date', ignoreDuplicates: true }
        );
    } catch (error) {
      console.error('Activity log failed:', error);
    }
  }, [user]);

  return logActivity;
}
```

---

## 第二阶段：体验优化

### 修复 3：LLM Gateway 降级机制

**问题**：当配置的 API 供应商不可用时，没有自动回退到备用供应商。

**修复位置**：`supabase/functions/llm-gateway/index.ts`

**修复方案**：实现 Provider Fallback Chain

```typescript
// 添加 tryProviders 函数实现自动降级
async function tryProviders(
  providers: any[],
  formatters: Record<string, Function>,
  parsers: Record<string, Function>,
  finalMessages: any[],
  modelName: string,
  options: any
): Promise<{ content: string; usage: any; provider: any }> {
  for (const provider of providers) {
    try {
      const apiKey = Deno.env.get(provider.api_key_name);
      if (!apiKey) continue;

      const providerType = provider.provider_type;
      const formatter = formatters[providerType] || formatters.custom;
      const requestBody = formatter(finalMessages, modelName, options);
      
      const response = await fetch(provider.api_endpoint, {
        method: "POST",
        headers: buildHeaders(providerType, apiKey),
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        const parser = parsers[providerType] || parsers.custom;
        return { ...parser(data), provider };
      }
      
      console.warn(`Provider ${provider.display_name || providerType} failed: ${response.status}`);
    } catch (error) {
      console.warn(`Provider ${provider.display_name || 'unknown'} error:`, error);
    }
  }
  throw new Error("All providers failed");
}
```

### 修复 4：智能体广场一键克隆增强

**问题**：当前仅复制 git clone 命令，未实现实际导入功能。

**修复位置**：`src/components/foundry/AgentPlazaDetail.tsx`

**修复方案**：添加「导入为技能」按钮，解析 GitHub 内容并创建本地技能

```tsx
// 添加导入功能
const handleImportAsSkill = async () => {
  if (!user) {
    toast({ title: "请先登录", variant: "destructive" });
    return;
  }

  try {
    // 1. 获取 README 内容
    const readmeContent = readme || `# ${agent.name}\n\n${agent.description || ''}`;
    
    // 2. 构建技能内容
    const skillMd = `---
name: "${agent.name}"
version: "1.0.0"
description: "${agent.description || ''}"
author: "awesome-llm-apps"
origin: "github"
origin_url: "${getAgentGitHubUrl(agent)}"
tags: ${JSON.stringify(agent.tags)}
permissions:
  - internet_access
---

# ${agent.name}

> 从 [awesome-llm-apps](${getAgentGitHubUrl(agent)}) 导入

${readmeContent}
`;

    // 3. 创建技能
    await createSkill.mutateAsync({
      name: agent.name,
      content: skillMd,
      description: agent.description,
    });

    toast({ title: "导入成功", description: "技能已添加到「我的技能」" });
  } catch (error) {
    toast({ title: "导入失败", description: String(error), variant: "destructive" });
  }
};
```

---

## 第三阶段：安全加固

### 修复 5：API Key Hash 字段隐藏

**问题**：`api_key_hash` 和 `api_key_prefix` 列返回给前端。

**修复方案**：创建安全视图，仅返回非敏感字段

```sql
-- 数据库迁移
CREATE OR REPLACE VIEW public.agent_api_keys_safe AS
SELECT 
  id,
  agent_id,
  user_id,
  name,
  is_active,
  rate_limit,
  total_calls,
  created_at,
  last_used_at,
  expires_at
FROM public.agent_api_keys;

-- 更新 RLS 策略
GRANT SELECT ON public.agent_api_keys_safe TO authenticated;
```

**前端修改**：更新所有查询 `agent_api_keys` 的地方，改为查询 `agent_api_keys_safe` 视图。

### 修复 6：Profiles 表 RLS 策略收紧

**问题**：个人信息对匿名用户完全暴露。

**修复方案**：

```sql
-- 删除过于宽松的策略
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- 创建分级访问策略
CREATE POLICY "Authenticated users can view public profiles"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    OR is_verified = true  -- 仅展示认证创作者的公开信息
  );

CREATE POLICY "Users can view own full profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);
```

---

## 第四阶段：代码质量

### 修复 7：添加 React Error Boundary

**新建文件**：`src/components/ErrorBoundary.tsx`

```tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">出了点问题</h2>
          <p className="text-muted-foreground mb-4">
            {this.state.error?.message || '页面加载失败'}
          </p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新页面
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 修复 8：清理未使用代码

**位置**：`src/pages/Index.tsx`

**操作**：删除第 276-288 行未使用的 `getTimeAgo` 函数

### 修复 9：文件上传大小限制强化

**位置**：`src/hooks/useFileUpload.ts`

**修改**：确保前端 + 后端双重验证

```tsx
// 增强验证逻辑
const validateFile = useCallback((file: File): string | null => {
  // 文件大小限制 (10MB)
  if (file.size > maxFileSize) {
    return `文件 "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)}MB) 超过最大限制 ${Math.round(maxFileSize / 1024 / 1024)}MB`;
  }
  
  // 文件类型白名单
  if (!allowedTypes.includes(file.type)) {
    return `不支持的文件类型: ${file.type || '未知类型'}`;
  }
  
  // 文件名安全检查
  if (file.name.length > 255) {
    return '文件名过长';
  }
  
  const dangerousExtensions = ['.exe', '.bat', '.sh', '.ps1', '.cmd'];
  if (dangerousExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
    return '不允许上传可执行文件';
  }
  
  return null;
}, [maxFileSize, allowedTypes]);
```

---

## 修改文件清单

| 文件 | 操作 | 优先级 |
|------|------|--------|
| `src/components/dashboard/AchievementShowcase.tsx` | UPDATE | P0 |
| `src/hooks/useAchievements.ts` | UPDATE | P0 |
| `supabase/functions/llm-gateway/index.ts` | UPDATE | P1 |
| `src/components/foundry/AgentPlazaDetail.tsx` | UPDATE | P1 |
| `src/components/ErrorBoundary.tsx` | CREATE | P2 |
| `src/App.tsx` | UPDATE (wrap with ErrorBoundary) | P2 |
| `src/pages/Index.tsx` | UPDATE (remove unused code) | P3 |
| `src/hooks/useFileUpload.ts` | UPDATE | P3 |

---

## 数据库迁移

| 迁移 | 说明 | 优先级 |
|------|------|--------|
| 创建 `agent_api_keys_safe` 视图 | 隐藏敏感字段 | P0 |
| 更新 `profiles` RLS 策略 | 限制匿名访问 | P0 |
| 启用密码泄露保护 | Auth 配置 | P0 |

---

## 预估工时

| 阶段 | 任务数 | 预估时间 |
|------|--------|----------|
| 第一阶段（关键功能） | 2 | 1小时 |
| 第二阶段（体验优化） | 2 | 3小时 |
| 第三阶段（安全加固） | 2 | 2小时 |
| 第四阶段（代码质量） | 3 | 2小时 |
| **总计** | **9** | **~8小时** |

---

## 实施顺序

1. ✅ 修复 AchievementShowcase ref 警告
2. ✅ 修复 user_activity_log 重复键
3. ✅ 添加 LLM Gateway 降级机制
4. ✅ 增强智能体广场导入功能
5. ✅ 创建 API Keys 安全视图
6. ✅ 更新 Profiles RLS 策略
7. ✅ 添加 Error Boundary
8. ✅ 清理未使用代码
9. ✅ 强化文件上传验证
