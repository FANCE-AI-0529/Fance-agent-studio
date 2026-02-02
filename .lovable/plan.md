
# AI 一键生成智能体的 MCP 调用优化开发计划

---

## 一、问题诊断：为何 AI 生成的智能体无法妥善调用 MCP

通过深入代码审查，发现以下核心问题导致 AI 生成的智能体无法正确调用 MCP：

### 问题 1：MCP 资产发现与匹配机制缺失

```text
位置: supabase/functions/workflow-generator/index.ts
现状: 工作流生成器仅查询 asset_semantic_index 表中已同步的 MCP 工具
问题: 
  1. 用户配置的外部 MCP Server 未自动同步到语义索引
  2. mcp_tool 类型资产缺少 inputSchema / outputSchema 定义
  3. 蓝图槽位填充时 MCP 工具的相似度计算不精确
```

### 问题 2：MCP 工具能力描述不完整

```text
位置: src/hooks/useAssetSync.ts (syncMCPTools 函数)
现状: MCP 工具同步仅提取基础信息 (name, description)
缺失:
  1. 工具的 inputSchema（参数规格）
  2. 工具的 permissions（所需权限）
  3. 工具的 riskLevel（风险等级）
  4. 工具的 capabilities（能力标签）
```

### 问题 3：运行时 MCP 调用链断裂

```text
位置: supabase/functions/agent-chat/index.ts
现状: 
  1. buildToolDefinitions() 将 MCP 转为 Function Calling 定义
  2. 但 LLM 返回 tool_calls 后，缺少实际执行 MCP 的逻辑
问题: AI 识别需要调用 MCP 后，没有真正触发 MCP Server 调用
```

### 问题 4：MCP 探测结果未持久化

```text
位置: src/hooks/useMCPInspect.ts, supabase/functions/mcp-inspect/index.ts
现状: 探测结果仅返回给前端临时使用
问题: 每次生成智能体都需重新探测，且探测结果未用于智能匹配
```

### 问题 5：生成器未考虑 MCP 参数依赖

```text
位置: supabase/functions/workflow-generator/index.ts (generateDSLFromBlueprint)
现状: MCP 节点的 inputMappings 使用通用表达式 {{trigger.message}}
问题: 未根据 MCP 工具的 inputSchema 生成正确的参数映射
```

---

## 二、技术架构改进方案

### 改进架构图

```text
┌──────────────────────────────────────────────────────────────────────┐
│                    AI 一键生成智能体流程                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  用户描述 ──> [意图分析] ──> [蓝图匹配] ──> [资产检索]               │
│                                  │              │                    │
│                                  v              v                    │
│                          ┌─────────────┐ ┌──────────────┐           │
│                          │ 逻辑节点库  │ │ 语义资产索引 │           │
│                          │ (条件/并行) │ │ (Skills/KB)  │           │
│                          └─────────────┘ └──────────────┘           │
│                                               │                      │
│                                  ┌────────────┴────────────┐        │
│                                  v                         v        │
│                          ┌─────────────┐         ┌──────────────┐   │
│           [改进点 1] --> │ MCP 工具索引 │ <------ │ MCP 实时探测 │   │
│                          │ (持久化能力) │         │ (动态发现)   │   │
│                          └─────────────┘         └──────────────┘   │
│                                  │                                   │
│                                  v                                   │
│                          ┌─────────────────┐                        │
│           [改进点 2] --> │ 智能槽位填充    │                        │
│                          │ (参数推断+映射) │                        │
│                          └─────────────────┘                        │
│                                  │                                   │
│                                  v                                   │
│                          ┌─────────────────┐                        │
│           [改进点 3] --> │ DSL 节点生成    │                        │
│                          │ (含 MCP Schema) │                        │
│                          └─────────────────┘                        │
│                                  │                                   │
│                                  v                                   │
│                          ┌─────────────────┐                        │
│           [改进点 4] --> │ 运行时 MCP 执行 │                        │
│                          │ (Function Call) │                        │
│                          └─────────────────┘                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 三、详细开发任务

### 阶段一：MCP 资产发现与持久化（优先级 P0）

#### 任务 1.1：增强 MCP 工具同步机制

**文件**: `src/hooks/useAssetSync.ts`

**改动内容**:
- 调用 `useMCPInspect.inspect()` 获取完整工具规格
- 将 `inputSchema`、`outputSchema`、`permissions` 写入 `asset_semantic_index`
- 添加 `risk_level` 字段自动推断逻辑

**示例代码框架**:
```typescript
const syncMCPTools = useCallback(async (): Promise<SyncResult> => {
  // 1. 获取用户配置的所有 MCP Server
  const { data: mcpConfigs } = await supabase
    .from('user_mcp_servers')
    .select('*')
    .eq('user_id', user.id);

  // 2. 对每个 Server 执行探测
  for (const config of mcpConfigs || []) {
    const inspectResult = await inspect(config);
    
    // 3. 将工具写入语义索引
    for (const tool of inspectResult.tools || []) {
      await supabase.from('asset_semantic_index').upsert({
        user_id: user.id,
        asset_type: 'mcp_tool',
        asset_id: `${config.id}::${tool.name}`,
        name: tool.name,
        description: tool.description,
        capabilities: extractCapabilities(tool),
        slot_type: inferSlotType(tool),
        io_spec: {
          input: tool.inputSchema,
          output: { properties: {}, required: [] },
        },
        risk_level: assessToolRisk(tool),
        is_active: true,
      });
    }
  }
}, [user, inspect]);
```

#### 任务 1.2：创建 MCP Server 配置表

**数据库迁移**:
```sql
CREATE TABLE IF NOT EXISTS public.user_mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version TEXT DEFAULT '1.0.0',
  transport_type TEXT NOT NULL CHECK (transport_type IN ('stdio', 'sse', 'http')),
  transport_url TEXT,
  transport_command TEXT,
  transport_args TEXT[],
  runtime TEXT DEFAULT 'node',
  scope TEXT DEFAULT 'user',
  env_vars JSONB DEFAULT '[]'::jsonb,
  last_inspected_at TIMESTAMPTZ,
  inspection_result JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 策略
ALTER TABLE public.user_mcp_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own MCP servers"
  ON public.user_mcp_servers
  FOR ALL
  USING (auth.uid() = user_id);
```

---

### 阶段二：工作流生成器 MCP 增强（优先级 P0）

#### 任务 2.1：优化 MCP 工具匹配算法

**文件**: `supabase/functions/workflow-generator/index.ts`

**改动位置**: `fetchHybridAssetsForBlueprint()` 函数

**改动内容**:
- 新增 MCP 工具能力匹配逻辑
- 根据用户描述中的动词匹配 MCP 动作类型
- 考虑 MCP 工具的 `inputSchema` 与上游节点输出的兼容性

**示例代码框架**:
```typescript
// 新增: 基于动作语义的 MCP 匹配
const ACTION_VERB_MAPPING: Record<string, string[]> = {
  'send_email': ['发送', '邮件', 'email', 'send', '通知'],
  'query_database': ['查询', '数据库', 'database', 'query', 'SQL'],
  'execute_code': ['执行', '代码', 'code', 'run', 'script'],
  'fetch_url': ['获取', '网页', 'fetch', 'url', 'http'],
  'file_operation': ['文件', '读取', '写入', 'file', 'read', 'write'],
};

function matchMCPByAction(description: string, tools: FunctionalAtom[]): FunctionalAtom[] {
  const descLower = description.toLowerCase();
  
  return tools
    .filter(tool => tool.type === 'MCP_TOOL')
    .map(tool => {
      let score = tool.similarity || 0;
      
      // 检查动作动词匹配
      for (const [action, verbs] of Object.entries(ACTION_VERB_MAPPING)) {
        if (tool.name.toLowerCase().includes(action.replace('_', ''))) {
          if (verbs.some(v => descLower.includes(v))) {
            score += 0.3;
          }
        }
      }
      
      return { ...tool, similarity: score };
    })
    .filter(tool => (tool.similarity || 0) > 0.4)
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
}
```

#### 任务 2.2：生成智能参数映射

**文件**: `supabase/functions/workflow-generator/index.ts`

**新增函数**: `generateMCPInputMappings()`

**改动内容**:
- 根据 MCP 工具的 `inputSchema.properties` 生成参数映射
- 从上下文推断参数值来源（用户输入、前置节点输出、提取的参数）

**示例代码框架**:
```typescript
interface InputMapping {
  targetField: string;
  sourceExpression: string;
  sourceType: 'trigger' | 'node_output' | 'extracted_param' | 'literal';
}

function generateMCPInputMappings(
  tool: FunctionalAtom,
  previousNodes: NodeSpec[],
  extractedParams: ExtractedParams,
  description: string
): InputMapping[] {
  const mappings: InputMapping[] = [];
  const inputSchema = tool.io_spec?.input as { properties: Record<string, any>; required: string[] };
  
  if (!inputSchema?.properties) {
    return [{ targetField: 'input', sourceExpression: '{{trigger.message}}', sourceType: 'trigger' }];
  }
  
  for (const [field, spec] of Object.entries(inputSchema.properties)) {
    let mapping: InputMapping | null = null;
    
    // 1. 尝试从提取的参数匹配
    if (field === 'to' || field === 'recipient' || field === 'email') {
      if (extractedParams.emailRecipients?.length) {
        mapping = {
          targetField: field,
          sourceExpression: `"${extractedParams.emailRecipients[0]}"`,
          sourceType: 'extracted_param',
        };
      }
    }
    
    // 2. 尝试从前置节点输出匹配
    if (!mapping && previousNodes.length > 0) {
      const lastNode = previousNodes[previousNodes.length - 1];
      mapping = {
        targetField: field,
        sourceExpression: `{{${lastNode.outputKey}.${field}}}`,
        sourceType: 'node_output',
      };
    }
    
    // 3. 默认使用触发器消息
    if (!mapping) {
      mapping = {
        targetField: field,
        sourceExpression: '{{trigger.message}}',
        sourceType: 'trigger',
      };
    }
    
    mappings.push(mapping);
  }
  
  return mappings;
}
```

---

### 阶段三：运行时 MCP 执行层（优先级 P1）

#### 任务 3.1：实现 MCP Tool Executor

**新建文件**: `supabase/functions/mcp-executor/index.ts`

**功能**:
- 接收 LLM 返回的 `tool_calls`
- 根据 `mcp_` 前缀识别 MCP 调用请求
- 调用对应的 MCP Server 执行工具
- 返回执行结果供后续消息上下文

**示例代码框架**:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface MCPExecuteRequest {
  userId: string;
  toolName: string;       // e.g., "mcp_send_email"
  toolArguments: Record<string, unknown>;
  mcpServerId?: string;   // 从 toolName 解析或查询
}

interface MCPExecuteResult {
  success: boolean;
  result?: unknown;
  error?: string;
  executionTime: number;
}

serve(async (req) => {
  const { userId, toolName, toolArguments, mcpServerId } = await req.json() as MCPExecuteRequest;
  
  // 1. 查询 MCP Server 配置
  const { data: serverConfig } = await supabase
    .from('user_mcp_servers')
    .select('*')
    .eq('id', mcpServerId)
    .single();
  
  if (!serverConfig) {
    return error('MCP Server not found');
  }
  
  // 2. 根据 transport_type 执行调用
  const startTime = Date.now();
  let result: unknown;
  
  if (serverConfig.transport_type === 'http') {
    result = await executeHttpMCP(serverConfig, toolName, toolArguments);
  } else if (serverConfig.transport_type === 'sse') {
    result = await executeSSEMCP(serverConfig, toolName, toolArguments);
  } else {
    return error('Unsupported transport type for edge function');
  }
  
  // 3. 记录调用日志
  await supabase.from('mcp_execution_logs').insert({
    user_id: userId,
    server_id: mcpServerId,
    tool_name: toolName,
    arguments: toolArguments,
    result,
    execution_time_ms: Date.now() - startTime,
  });
  
  return success({ result, executionTime: Date.now() - startTime });
});

async function executeHttpMCP(
  config: any, 
  toolName: string, 
  args: Record<string, unknown>
): Promise<unknown> {
  const response = await fetch(config.transport_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: toolName.replace('mcp_', ''), arguments: args },
    }),
  });
  
  const data = await response.json();
  return data.result;
}
```

#### 任务 3.2：agent-chat 集成 MCP 执行

**文件**: `supabase/functions/agent-chat/index.ts`

**改动内容**:
- 在 LLM 返回 `tool_calls` 后，识别 `mcp_` 前缀的调用
- 调用 `mcp-executor` 函数执行实际 MCP 操作
- 将执行结果注入后续对话上下文

**改动位置**: 处理 AI 响应的逻辑（约 500-600 行）

**示例代码框架**:
```typescript
// 处理 tool_calls
if (aiData.choices?.[0]?.message?.tool_calls) {
  const toolCalls = aiData.choices[0].message.tool_calls;
  const toolResults: Array<{ name: string; result: unknown }> = [];
  
  for (const call of toolCalls) {
    const toolName = call.function.name;
    const toolArgs = JSON.parse(call.function.arguments || '{}');
    
    // 识别 MCP 调用
    if (toolName.startsWith('mcp_')) {
      const { data: execResult } = await supabase.functions.invoke('mcp-executor', {
        body: {
          userId,
          toolName,
          toolArguments: toolArgs,
        },
      });
      
      toolResults.push({ name: toolName, result: execResult });
    }
  }
  
  // 将工具结果注入后续消息
  if (toolResults.length > 0) {
    messages.push({
      role: 'assistant',
      content: null,
      tool_calls: toolCalls,
    });
    
    for (const tr of toolResults) {
      messages.push({
        role: 'tool',
        tool_call_id: toolCalls.find(c => c.function.name === tr.name)?.id,
        content: JSON.stringify(tr.result),
      });
    }
    
    // 继续对话获取最终回复
    // ...
  }
}
```

---

### 阶段四：前端 MCP 管理增强（优先级 P2）

#### 任务 4.1：MCP Server 管理面板

**新建文件**: `src/components/settings/MCPServerManager.tsx`

**功能**:
- 列表展示用户配置的 MCP Server
- 添加/编辑/删除 Server 配置
- 一键探测 Server 能力
- 查看工具列表和使用统计

#### 任务 4.2：生成器 MCP 预选

**文件**: `src/components/builder/EnhancedAIGenerator.tsx`

**改动内容**:
- 在高级选项中添加「指定 MCP 工具」下拉
- 允许用户预选希望智能体使用的 MCP 工具
- 将选择传递给 workflow-generator

---

## 四、数据库变更汇总

| 表名 | 操作 | 说明 |
|------|------|------|
| `user_mcp_servers` | CREATE | 存储用户的 MCP Server 配置 |
| `mcp_execution_logs` | CREATE | 记录 MCP 工具调用历史 |
| `asset_semantic_index` | UPDATE | 增加 `io_spec` JSONB 字段 |

---

## 五、Edge Function 变更汇总

| 函数名 | 操作 | 说明 |
|--------|------|------|
| `mcp-executor` | CREATE | 执行 MCP 工具调用 |
| `workflow-generator` | UPDATE | 增强 MCP 匹配和参数映射 |
| `agent-chat` | UPDATE | 集成 MCP 执行逻辑 |
| `mcp-inspect` | UPDATE | 支持持久化探测结果 |

---

## 六、前端文件变更汇总

| 文件路径 | 操作 | 说明 |
|----------|------|------|
| `src/hooks/useAssetSync.ts` | UPDATE | 增强 MCP 同步逻辑 |
| `src/hooks/useMCPInspect.ts` | UPDATE | 支持持久化探测 |
| `src/components/settings/MCPServerManager.tsx` | CREATE | MCP 管理面板 |
| `src/components/builder/EnhancedAIGenerator.tsx` | UPDATE | 添加 MCP 预选 |

---

## 七、实施优先级与工时估算

| 阶段 | 任务 | 优先级 | 工时 |
|------|------|--------|------|
| 一 | MCP 工具同步增强 | P0 | 4h |
| 一 | user_mcp_servers 表 | P0 | 1h |
| 二 | MCP 匹配算法优化 | P0 | 3h |
| 二 | 智能参数映射 | P0 | 3h |
| 三 | mcp-executor 函数 | P1 | 4h |
| 三 | agent-chat 集成 | P1 | 3h |
| 四 | MCP 管理面板 | P2 | 4h |
| 四 | 生成器 MCP 预选 | P2 | 2h |
| **总计** | | | **~24h** |

---

## 八、验收测试用例

### 功能测试

1. **MCP 发现**
   - [ ] 用户添加 HTTP 类型 MCP Server
   - [ ] 系统自动探测并同步工具列表
   - [ ] asset_semantic_index 中出现新的 mcp_tool 记录

2. **智能生成**
   - [ ] 输入「每天9点发送邮件给 xxx@example.com」
   - [ ] 生成的智能体包含邮件发送 MCP 节点
   - [ ] 节点的 recipients 参数自动填充提取的邮箱

3. **运行时执行**
   - [ ] 与生成的智能体对话
   - [ ] AI 识别需要发送邮件
   - [ ] MCP 工具成功执行并返回结果
   - [ ] 对话中展示执行状态

### 边界测试

- [ ] MCP Server 不可达时的降级处理
- [ ] 工具调用超时处理
- [ ] 参数验证失败的错误提示

---

## 九、技术说明（供技术人员参考）

### MCP 协议版本
项目使用 MCP 2024-11-05 版本，支持：
- `initialize` - 握手初始化
- `tools/list` - 列出可用工具
- `tools/call` - 调用指定工具
- `resources/list` / `resources/read` - 资源访问

### 传输层支持
- HTTP：Edge Function 可直接调用
- SSE：需要 EventSource 长连接
- stdio：仅本地运行，Edge Function 不支持

### 风险控制
所有 MCP 调用需经过 MPLP 协议审核：
- `low`：自动执行
- `medium`：记录日志
- `high`：需用户确认
