

# 阶段二/三实施计划：MCP 运行时执行集成 + 前端管理面板

---

## 实施概述

本计划将完成 MCP 优化的阶段二和阶段三，核心目标：

1. **agent-chat 集成 MCP 执行**：当 LLM 返回 `tool_calls` 时，自动识别 `mcp_` 前缀的调用并执行
2. **MCPServerManager 管理面板**：允许用户配置和管理自己的 MCP Server
3. **生成器 MCP 预选功能**：在 AI 生成器的高级选项中添加 MCP 工具预选

---

## 第一部分：agent-chat 集成 MCP 执行

### 当前问题

`agent-chat/index.ts` 目前的流程：
1. 构建 `buildToolDefinitions()` 将 MCP 工具转为 Function Calling 定义 ✅
2. 将工具定义发送给 LLM ✅
3. 返回流式响应，但**没有处理 tool_calls** ❌

当 LLM 返回 `tool_calls` 时，需要：
- 识别 `mcp_` 前缀的调用
- 调用 `mcp-executor` 边缘函数执行
- 将执行结果注入上下文继续对话

### 解决方案

需要修改为**非流式模式**处理工具调用，然后再切换回流式模式：

```text
用户消息 → LLM (支持工具)
              ↓
         检测 tool_calls?
              ↓ Yes
         调用 mcp-executor
              ↓
         注入工具结果到消息
              ↓
         再次调用 LLM (获取最终回复)
              ↓
         返回流式响应
```

### 修改内容

**文件**: `supabase/functions/agent-chat/index.ts`

**新增函数**: `executeMCPToolCalls()`

功能说明：
- 接收 LLM 返回的 `tool_calls` 数组
- 筛选 `mcp_` 前缀的调用
- 调用 `mcp-executor` 执行
- 返回工具执行结果

**主流程修改**:

1. 首次请求使用**非流式**模式（检测是否有工具调用）
2. 如果有 MCP 工具调用，执行工具并注入结果
3. 继续对话获取最终回复，使用**流式**模式返回

**关键代码逻辑**:

```typescript
// 1. 首次请求（非流式，检测工具调用）
const firstResponse = await fetch(AI_GATEWAY_URL, {
  body: JSON.stringify({ ...requestBody, stream: false }),
});
const firstData = await firstResponse.json();

// 2. 检查是否有工具调用
const toolCalls = firstData.choices?.[0]?.message?.tool_calls;
if (toolCalls && toolCalls.length > 0) {
  const mcpCalls = toolCalls.filter(c => c.function.name.startsWith('mcp_'));
  
  if (mcpCalls.length > 0) {
    // 3. 执行 MCP 工具
    const toolResults = await Promise.all(mcpCalls.map(async (call) => {
      const { data } = await supabase.functions.invoke('mcp-executor', {
        body: {
          userId: user.id,
          toolName: call.function.name,
          toolArguments: JSON.parse(call.function.arguments || '{}'),
        },
      });
      return { id: call.id, result: data };
    }));
    
    // 4. 注入工具结果，继续对话
    const updatedMessages = [
      ...apiMessages,
      { role: 'assistant', content: null, tool_calls: toolCalls },
      ...toolResults.map(tr => ({
        role: 'tool',
        tool_call_id: tr.id,
        content: JSON.stringify(tr.result),
      })),
    ];
    
    // 5. 最终请求（流式）
    const finalResponse = await fetch(AI_GATEWAY_URL, {
      body: JSON.stringify({ ...requestBody, messages: updatedMessages, stream: true }),
    });
    return new Response(finalResponse.body, { headers: streamHeaders });
  }
}

// 6. 无工具调用，直接返回首次响应的流式版本
const streamResponse = await fetch(AI_GATEWAY_URL, { ...requestBody, stream: true });
return new Response(streamResponse.body, { headers: streamHeaders });
```

---

## 第二部分：MCPServerManager 管理面板

### 功能设计

创建 `src/components/settings/MCPServerManager.tsx`：

1. **服务器列表**：展示用户配置的所有 MCP Server
2. **添加服务器**：支持 HTTP/SSE/stdio 三种传输方式
3. **探测能力**：一键获取服务器的工具列表
4. **编辑/删除**：管理现有配置
5. **使用统计**：显示调用次数和最后使用时间

### UI 设计

```text
┌────────────────────────────────────────────────────────┐
│  我的 MCP 服务器                          [+ 添加服务器] │
├────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🌐 OpenAI Tools Server                            │  │
│  │ HTTP · https://mcp.example.com/v1                 │  │
│  │ 工具: 5 个 · 最后使用: 2分钟前                     │  │
│  │                            [探测] [编辑] [删除]   │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 📧 Email Server                                   │  │
│  │ SSE · https://email-mcp.example.com/sse           │  │
│  │ 工具: 3 个 · 未使用                               │  │
│  │                            [探测] [编辑] [删除]   │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 💻 本地代码执行器                                 │  │
│  │ stdio · npx mcp-code-executor                     │  │
│  │ ⚠️ 需要本地运行环境                               │  │
│  │                            [探测] [编辑] [删除]   │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### 添加服务器对话框

支持字段：
- 名称（必填）
- 传输类型（HTTP/SSE/stdio）
- URL 或命令（根据类型）
- 参数（可选）
- 环境变量（可选）
- 描述（可选）

### 组件结构

```typescript
// MCPServerManager.tsx 主要结构

interface MCPServerManagerProps {
  onServerChange?: () => void;  // 服务器变更回调
}

// 主组件
export function MCPServerManager({ onServerChange }: MCPServerManagerProps) {
  // 获取用户的 MCP 服务器列表
  const { data: servers, isLoading, refetch } = useQuery({
    queryKey: ['user-mcp-servers', userId],
    queryFn: () => supabase.from('user_mcp_servers').select('*').eq('user_id', userId),
  });

  // 添加服务器
  const addServer = useMutation({...});
  
  // 更新服务器
  const updateServer = useMutation({...});
  
  // 删除服务器
  const deleteServer = useMutation({...});
  
  // 探测服务器能力
  const inspectServer = async (serverId: string) => {
    await supabase.functions.invoke('mcp-inspect', { body: { serverId } });
    refetch();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <CardTitle>我的 MCP 服务器</CardTitle>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus /> 添加服务器
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* 服务器列表 */}
        {servers?.map(server => (
          <MCPServerCard 
            key={server.id} 
            server={server}
            onInspect={() => inspectServer(server.id)}
            onEdit={() => handleEdit(server)}
            onDelete={() => deleteServer.mutate(server.id)}
          />
        ))}
      </CardContent>
      
      {/* 添加/编辑对话框 */}
      <AddMCPServerDialog ... />
    </Card>
  );
}
```

### 集成到设置页面

修改 `src/components/settings/SettingsDialog.tsx`：
- 添加新的 Tab: "MCP 服务器"
- 导入并渲染 `MCPServerManager`

---

## 第三部分：生成器 MCP 预选功能

### 功能设计

在 `EnhancedAIGenerator.tsx` 的高级选项中添加：

1. **MCP 工具预选下拉框**：列出用户可用的 MCP 工具
2. **选中的工具优先匹配**：生成时优先使用选中的工具
3. **传递给 workflow-generator**：通过参数传递预选信息

### UI 修改

在高级选项区域添加：

```text
┌────────────────────────────────────────────┐
│ 高级选项                                   │
├────────────────────────────────────────────┤
│ 治理策略 (MPLP): [默认模式 ▼]              │
│                                            │
│ 最大节点数: ───●─── 10                     │
│                                            │
│ [✓] 包含知识库检索                         │
│ [✓] 自动应用治理策略                        │
│                                            │
│ 🆕 指定 MCP 工具:                          │
│ ┌──────────────────────────────────────┐   │
│ │ [✓] send_email (Email Server)        │   │
│ │ [ ] query_database (DB Server)       │   │
│ │ [✓] fetch_url (HTTP Tools)           │   │
│ │ [ ] execute_code (Code Runner)       │   │
│ └──────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```

### 代码修改

**文件**: `src/components/builder/EnhancedAIGenerator.tsx`

1. 添加状态：`selectedMCPTools: string[]`
2. 获取可用 MCP 工具列表
3. 渲染多选列表
4. 将选择传递给 `generate()` 函数

```typescript
// 新增状态
const [selectedMCPTools, setSelectedMCPTools] = useState<string[]>([]);

// 获取用户的 MCP 工具
const { data: mcpTools } = useQuery({
  queryKey: ['user-mcp-tools', userId],
  queryFn: async () => {
    const { data } = await supabase
      .from('asset_semantic_index')
      .select('asset_id, name, description, metadata')
      .eq('user_id', userId)
      .eq('asset_type', 'mcp_tool')
      .eq('is_active', true);
    return data || [];
  },
});

// 传递给生成器
const result = await generate(desc, {
  mplpPolicy,
  includeKnowledge,
  maxNodes,
  autoApplyPolicies,
  enableBuildPlan: true,
  preferredMCPTools: selectedMCPTools,  // 新增
});
```

### workflow-generator 修改

**文件**: `supabase/functions/workflow-generator/index.ts`

接收 `preferredMCPTools` 参数，在资产匹配时给这些工具加分：

```typescript
// 在 fetchHybridAssetsForBlueprint 中
if (options.preferredMCPTools?.includes(tool.asset_id)) {
  tool.similarity = (tool.similarity || 0) + 0.5;  // 提升优先级
}
```

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `supabase/functions/agent-chat/index.ts` | UPDATE | 添加 MCP 工具调用执行逻辑 |
| `src/components/settings/MCPServerManager.tsx` | CREATE | MCP 服务器管理面板 |
| `src/components/settings/SettingsDialog.tsx` | UPDATE | 添加 MCP 服务器 Tab |
| `src/components/builder/EnhancedAIGenerator.tsx` | UPDATE | 添加 MCP 预选功能 |
| `supabase/functions/workflow-generator/index.ts` | UPDATE | 支持 preferredMCPTools 参数 |

---

## 边缘函数部署

需要重新部署以下函数：
- `agent-chat` - 集成 MCP 执行
- `workflow-generator` - 支持预选参数

---

## 技术细节

### MCP 工具调用流程

```text
用户发送消息
     │
     ▼
┌─────────────────────┐
│   agent-chat        │
│   (非流式首次请求)    │
└─────────────────────┘
     │
     ▼
┌─────────────────────┐
│  LLM 返回 tool_calls │
│  包含 mcp_xxx 调用   │
└─────────────────────┘
     │
     ▼
┌─────────────────────┐
│   mcp-executor      │
│   执行工具调用       │
└─────────────────────┘
     │
     ▼
┌─────────────────────┐
│   注入执行结果       │
│   继续对话           │
└─────────────────────┘
     │
     ▼
┌─────────────────────┐
│   流式返回最终回复    │
└─────────────────────┘
```

### 错误处理

1. **MCP 服务器不可达**：返回降级消息，告知用户工具暂时不可用
2. **执行超时**：30秒超时，返回超时错误
3. **认证失败**：返回 401 错误

### 安全考虑

1. **用户隔离**：只能访问自己配置的 MCP 服务器
2. **RLS 策略**：`user_mcp_servers` 表已配置 RLS
3. **执行日志**：所有调用记录到 `mcp_execution_logs`

---

## 预估工时

| 任务 | 工时 |
|------|------|
| agent-chat MCP 执行集成 | 3h |
| MCPServerManager 组件 | 4h |
| SettingsDialog 集成 | 1h |
| EnhancedAIGenerator MCP 预选 | 2h |
| workflow-generator 更新 | 1h |
| 测试与调试 | 2h |
| **总计** | **~13h** |

---

## 验收标准

### 功能测试

- [ ] 配置 HTTP 类型 MCP Server
- [ ] 探测服务器工具列表
- [ ] AI 对话中触发 MCP 工具调用
- [ ] 工具执行结果正确返回
- [ ] 生成器中预选 MCP 工具
- [ ] 预选工具优先出现在生成结果中

### 边界测试

- [ ] 无 MCP 服务器时的降级处理
- [ ] 服务器不可达时的错误提示
- [ ] 并发工具调用处理
- [ ] 执行超时处理

