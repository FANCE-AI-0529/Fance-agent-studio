

# 多 LLM 供应商支持 - 统一模型基座架构改造

---

## 问题分析

### 当前架构的核心问题

通过深入代码审查，发现以下问题导致用户无法灵活使用自己的 API Key 作为模型基座：

### 问题 1：边缘函数硬编码 Lovable AI

```text
位置: supabase/functions/agent-chat/index.ts (行 782, 826, 857)
现状: 直接调用 "https://ai.gateway.lovable.dev/v1/chat/completions"
      使用硬编码的 LOVABLE_API_KEY

问题: 
  1. 完全绕过了 llm-gateway 的供应商解析逻辑
  2. 用户配置的 OpenAI/Anthropic/Google 供应商无法生效
  3. 管理员设置的全局默认供应商被忽略
```

### 问题 2：llm-gateway 未被实际使用

```text
位置: supabase/functions/llm-gateway/index.ts
现状: 已实现完整的供应商优先级解析和多供应商 Fallback
      - Priority 1: 指定 provider_id
      - Priority 2: Agent + Module 配置
      - Priority 3: 用户默认供应商
      - Priority 4: 管理员全局供应商
      - Priority 5: Lovable AI 兜底

问题: 
  1. agent-chat 等核心函数未调用此网关
  2. 流式响应未被正确处理
  3. 前端 hooks 未实际使用
```

### 问题 3：其他边缘函数同样硬编码

```text
受影响函数:
  - supabase/functions/streaming-generator/index.ts
  - supabase/functions/workflow-generator/index.ts
  - supabase/functions/agent-config-generator/index.ts
  - supabase/functions/task-executor/index.ts
  - supabase/functions/rag-query/index.ts
  - supabase/functions/rag-ingest/index.ts
  - 以及 10+ 其他函数

所有这些函数都直接使用 LOVABLE_API_KEY 调用 Lovable AI Gateway
```

### 问题 4：设置入口仅限管理员

```text
位置: src/components/settings/SettingsDialog.tsx (行 186-190)
现状: "模型配置" Tab 仅对 isAdmin 用户显示

问题: 
  1. 普通用户无法配置自己的 API 供应商
  2. 权限模型不清晰（谁能配置什么）
```

---

## 技术架构设计

### 目标架构

```text
┌─────────────────────────────────────────────────────────────┐
│                    前端应用                                   │
├─────────────────────────────────────────────────────────────┤
│  SettingsDialog                                             │
│    └── ModelProviderSettings (新增，所有用户可用)             │
│          ├── 我的供应商列表                                  │
│          ├── 添加/编辑供应商 (支持 API Key 加密存储)          │
│          └── 设置默认供应商                                  │
│                                                             │
│  GlobalModelSettings (管理员专用)                            │
│          └── 全局默认供应商配置                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    llm-gateway (统一入口)                    │
├─────────────────────────────────────────────────────────────┤
│  供应商解析优先级:                                           │
│    1. 请求指定的 provider_id                                │
│    2. Agent + Module 级配置                                 │
│    3. 用户个人默认供应商                                     │
│    4. 管理员全局默认供应商                                   │
│    5. Lovable AI Gateway (最终兜底)                         │
│                                                             │
│  功能:                                                       │
│    - 多供应商格式适配 (OpenAI/Anthropic/Google/Azure)        │
│    - 流式响应透传                                           │
│    - 失败自动 Fallback                                       │
│    - 用量统计 & 日志                                         │
└─────────────────────────────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  OpenAI     │    │  Anthropic  │    │  Google AI  │
│  (用户Key)   │    │  (用户Key)   │    │  (用户Key)   │
└─────────────┘    └─────────────┘    └─────────────┘
         │                  │                  │
         └──────────────────┼──────────────────┘
                            ▼
                    ┌─────────────┐
                    │ Lovable AI  │
                    │  (兜底)      │
                    └─────────────┘
```

---

## 详细开发任务

### 阶段一：边缘函数统一调用 llm-gateway (P0)

#### 任务 1.1：增强 llm-gateway 支持流式响应

**文件**: `supabase/functions/llm-gateway/index.ts`

**改动内容**:
- 当 `stream: true` 时，直接透传供应商的流式响应
- 添加更完善的错误处理和 Fallback 逻辑
- 支持内部调用（无需 auth header，使用 service role）

**核心代码逻辑**:
```typescript
// 流式响应处理
if (options.stream) {
  const response = await fetch(provider.api_endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });
  
  if (!response.ok) {
    // 触发 Fallback 到下一个供应商
    throw new Error(`Provider ${provider.name} failed: ${response.status}`);
  }
  
  return new Response(response.body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}
```

#### 任务 1.2：agent-chat 改用 llm-gateway

**文件**: `supabase/functions/agent-chat/index.ts`

**改动内容**:
- 移除直接调用 Lovable AI Gateway 的代码
- 改为调用 `llm-gateway` 边缘函数
- 传递 `agent_id` 和 `module_type` 以支持细粒度配置

**改动位置**: 行 782-864 (所有 fetch 调用)

**核心代码逻辑**:
```typescript
// 替换硬编码调用
// 旧: fetch("https://ai.gateway.lovable.dev/v1/chat/completions", ...)
// 新: 调用 llm-gateway

const { data: llmResponse, error: llmError } = await supabase.functions.invoke('llm-gateway', {
  body: {
    messages: apiMessages,
    agent_id: agentId,
    module_type: 'agent_chat',
    model: requestedModel,
    stream: true,
    tools: hasTools ? tools : undefined,
  },
});

// 对于流式响应，直接返回
if (stream) {
  // 使用 supabase.functions 的流式调用方式
  const response = await fetch(`${supabaseUrl}/functions/v1/llm-gateway`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: apiMessages,
      agent_id: agentId,
      module_type: 'agent_chat',
      stream: true,
    }),
  });
  return new Response(response.body, { headers: streamHeaders });
}
```

#### 任务 1.3：其他边缘函数统一改造

**受影响函数列表**:
| 函数名 | 模块类型 | 优先级 |
|--------|----------|--------|
| `streaming-generator` | `skill_generation` | P0 |
| `workflow-generator` | `workflow_generation` | P0 |
| `agent-config-generator` | `config_generation` | P1 |
| `task-executor` | `task_execution` | P1 |
| `rag-query` | `rag_query` | P1 |
| `entity-extraction` | `entity_extraction` | P1 |
| `drift-detection` | `drift_detection` | P2 |
| `task-delegation` | `task_delegation` | P2 |

**统一改造模式**:
```typescript
// 创建可复用的 LLM 调用工具函数
// supabase/functions/_shared/llm-client.ts

export async function callLLM(options: {
  supabase: SupabaseClient;
  messages: Array<{ role: string; content: string }>;
  userId?: string;
  agentId?: string;
  moduleType: string;
  model?: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}) {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/llm-gateway`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: options.messages,
      user_id: options.userId,
      agent_id: options.agentId,
      module_type: options.moduleType,
      model: options.model,
      stream: options.stream ?? false,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    }),
  });
  
  return response;
}
```

---

### 阶段二：用户级供应商管理 (P0)

#### 任务 2.1：创建用户供应商设置组件

**新建文件**: `src/components/settings/ModelProviderSettings.tsx`

**功能**:
- 列表展示用户配置的 LLM 供应商
- 添加供应商（选择模板 + 输入 API Key）
- 编辑/删除供应商
- 设置用户默认供应商
- API Key 安全显示（仅显示前后几位）

**UI 设计**:
```text
┌────────────────────────────────────────────────────────────┐
│  模型供应商                                   [+ 添加供应商] │
├────────────────────────────────────────────────────────────┤
│  当前默认供应商                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🟢 使用个人配置: OpenAI GPT-5                         │  │
│  │    或                                                 │  │
│  │ 🔵 使用全局默认 (管理员配置)                          │  │
│  │    或                                                 │  │
│  │ ⚪ 使用 Lovable AI (免费额度)                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  我的供应商                                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ⭐ OpenAI                                   [默认]     │  │
│  │ API Key: sk-...7f3d                                   │  │
│  │ 模型: gpt-5-2025-08-07                               │  │
│  │                              [测试] [编辑] [删除]     │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Anthropic                                           │  │
│  │ API Key: sk-ant-...8e2a                               │  │
│  │ 模型: claude-sonnet-4-5                              │  │
│  │                              [测试] [编辑] [删除]     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

#### 任务 2.2：API Key 安全存储机制

**新建文件**: `supabase/functions/manage-api-keys/index.ts`

**功能**:
- 加密存储用户 API Key
- 验证 API Key 有效性
- 安全地将 Key 传递给 llm-gateway

**数据库变更**:
```sql
-- 添加 api_key_encrypted 字段到 llm_providers 表
ALTER TABLE public.llm_providers 
ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT;

-- 添加 api_key_preview 字段 (如 "sk-...7f3d")
ALTER TABLE public.llm_providers 
ADD COLUMN IF NOT EXISTS api_key_preview TEXT;

-- 创建 API Key 加密函数
CREATE OR REPLACE FUNCTION encrypt_api_key(key TEXT) 
RETURNS TEXT AS $$
BEGIN
  -- 使用 pgcrypto 加密
  RETURN encode(encrypt(key::bytea, current_setting('app.encryption_key')::bytea, 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 任务 2.3：集成到设置页面

**文件**: `src/components/settings/SettingsDialog.tsx`

**改动内容**:
- 添加新的 Tab "模型" 对所有用户可见
- 保留 "模型配置" Tab 仅管理员可见（用于全局配置）
- 调整 Tab 布局

**改动位置**: 行 159-191 (TabsList 区域)

---

### 阶段三：llm-gateway 增强 (P1)

#### 任务 3.1：用户 API Key 解密与使用

**文件**: `supabase/functions/llm-gateway/index.ts`

**改动内容**:
- 从 `llm_providers` 表读取 `api_key_encrypted`
- 在运行时解密并使用
- 支持从 Supabase Secrets 和用户加密存储两种方式

**核心逻辑**:
```typescript
// 获取 API Key 的优先级
async function getAPIKey(provider: LLMProvider): Promise<string> {
  // 1. 如果有加密存储的用户 Key，解密使用
  if (provider.api_key_encrypted) {
    return await decryptAPIKey(provider.api_key_encrypted);
  }
  
  // 2. 尝试从 Supabase Secrets 获取 (管理员配置)
  const secretKey = Deno.env.get(provider.api_key_name);
  if (secretKey) {
    return secretKey;
  }
  
  // 3. 如果是 Lovable 供应商，使用默认 Key
  if (provider.provider_type === 'lovable') {
    return Deno.env.get('LOVABLE_API_KEY')!;
  }
  
  throw new Error(`API key not found for provider: ${provider.name}`);
}
```

#### 任务 3.2：完善 Fallback 链

**文件**: `supabase/functions/llm-gateway/index.ts`

**改动内容**:
- 当首选供应商失败时，自动切换到下一优先级
- 记录 Fallback 事件
- 支持配置 Fallback 策略

**核心逻辑**:
```typescript
async function callWithFallback(
  providers: LLMProvider[],
  request: LLMRequest
): Promise<Response> {
  const errors: string[] = [];
  
  for (const provider of providers) {
    try {
      const response = await callProvider(provider, request);
      if (response.ok) {
        return response;
      }
      errors.push(`${provider.name}: ${response.status}`);
    } catch (error) {
      errors.push(`${provider.name}: ${error.message}`);
    }
  }
  
  // 所有供应商都失败
  throw new Error(`All providers failed: ${errors.join(', ')}`);
}
```

---

### 阶段四：模块级配置 (P2)

#### 任务 4.1：模块配置 UI

**新建文件**: `src/components/settings/ModuleModelConfig.tsx`

**功能**:
- 为不同模块配置不同的模型
- 如：对话用 GPT-5，技能生成用 Gemini Pro
- 支持 Agent 级别的细粒度配置

**UI 设计**:
```text
┌────────────────────────────────────────────────────────────┐
│  模块模型配置                                               │
├────────────────────────────────────────────────────────────┤
│  对话模块:        [OpenAI GPT-5 ▼]                          │
│  技能生成:        [Gemini 2.5 Pro ▼]                        │
│  意图检测:        [GPT-5 Mini ▼]                            │
│  实体抽取:        [使用默认 ▼]                              │
│  ...                                                        │
└────────────────────────────────────────────────────────────┘
```

---

## 文件变更清单

### 新建文件
| 文件路径 | 说明 |
|----------|------|
| `src/components/settings/ModelProviderSettings.tsx` | 用户供应商管理面板 |
| `src/components/settings/ModuleModelConfig.tsx` | 模块级配置 UI |
| `supabase/functions/_shared/llm-client.ts` | LLM 调用共享工具 |
| `supabase/functions/manage-api-keys/index.ts` | API Key 管理函数 |

### 修改文件
| 文件路径 | 改动说明 |
|----------|----------|
| `supabase/functions/llm-gateway/index.ts` | 增强流式响应、API Key 解密 |
| `supabase/functions/agent-chat/index.ts` | 改用 llm-gateway |
| `supabase/functions/streaming-generator/index.ts` | 改用 llm-gateway |
| `supabase/functions/workflow-generator/index.ts` | 改用 llm-gateway |
| `supabase/functions/agent-config-generator/index.ts` | 改用 llm-gateway |
| `supabase/functions/task-executor/index.ts` | 改用 llm-gateway |
| `supabase/functions/rag-query/index.ts` | 改用 llm-gateway |
| `src/components/settings/SettingsDialog.tsx` | 添加模型设置 Tab |
| `src/hooks/useLLMProviders.ts` | 支持 API Key 加密存储 |

### 数据库变更
| 表名 | 操作 | 说明 |
|------|------|------|
| `llm_providers` | ALTER | 添加 `api_key_encrypted`, `api_key_preview` 字段 |
| `llm_usage_logs` | CREATE | 记录 LLM 使用量和费用 |

---

## 实施优先级与工时估算

| 阶段 | 任务 | 优先级 | 工时 |
|------|------|--------|------|
| 一 | llm-gateway 流式支持增强 | P0 | 3h |
| 一 | agent-chat 改用 llm-gateway | P0 | 2h |
| 一 | 其他函数统一改造 (6个核心) | P0 | 4h |
| 一 | 共享 LLM 客户端工具 | P0 | 1h |
| 二 | ModelProviderSettings 组件 | P0 | 4h |
| 二 | API Key 加密存储机制 | P0 | 3h |
| 二 | SettingsDialog 集成 | P0 | 1h |
| 三 | API Key 解密 & 使用 | P1 | 2h |
| 三 | Fallback 链完善 | P1 | 2h |
| 四 | 模块级配置 UI | P2 | 3h |
| **总计** | | | **~25h** |

---

## 验收测试用例

### 功能测试

- [ ] 用户可以在设置中添加 OpenAI API Key
- [ ] 用户可以将个人供应商设为默认
- [ ] AI 对话使用用户配置的供应商
- [ ] API Key 不会在前端明文显示
- [ ] 供应商失败时自动 Fallback
- [ ] 管理员全局配置对所有用户生效

### 边界测试

- [ ] 无效 API Key 的错误提示
- [ ] 供应商 API 超时处理
- [ ] 用户配置与管理员配置的优先级
- [ ] 多供应商并发 Fallback

---

## 技术说明

### 支持的供应商

| 供应商 | API 格式 | 认证方式 | 流式支持 |
|--------|----------|----------|----------|
| OpenAI | OpenAI Chat Completions | Bearer Token | 是 |
| Anthropic | Messages API | x-api-key Header | 是 |
| Google AI | Gemini API | Bearer Token | 是 |
| Azure OpenAI | OpenAI 兼容 | Bearer Token | 是 |
| 自定义 | OpenAI 兼容 | Bearer Token | 是 |
| Lovable AI | OpenAI 兼容 | Bearer Token | 是 |

### API Key 安全

1. **加密存储**: 使用 AES-256 加密存储在数据库
2. **传输安全**: 仅在 Edge Function 内部解密使用
3. **前端展示**: 仅显示前后几位字符
4. **RLS 保护**: 用户只能访问自己的 Key

### 优先级解析规则

```text
1. 请求明确指定 provider_id → 使用该供应商
2. Agent + Module 有配置 → 使用配置的供应商
3. 用户有默认供应商 → 使用用户默认
4. 管理员有全局默认 → 使用全局默认
5. 以上都没有 → 使用 Lovable AI Gateway
```

