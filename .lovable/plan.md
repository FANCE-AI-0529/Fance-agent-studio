
# 智能体广场模块实现计划

## 需求概述

在整体左边栏 (Foundry) 的左侧边栏添加一个完整的「智能体广场」模块，展示来自 [awesome-llm-apps](https://github.com/Shubhamsaboo/awesome-llm-apps) 仓库的优质 LLM 应用/智能体模板。

---

## 系统架构

```text
┌─────────────────────────────────────────────────────────────────┐
│                      技能工坊 (Foundry)                          │
├─────────────────────┬───────────────────────────────────────────┤
│                     │                                           │
│  ┌───────────────┐  │                                           │
│  │ 智能体广场    │  │   主内容区                                │
│  │ (新增模块)    │  │   - 智能体详情预览                        │
│  │               │  │   - 一键克隆功能                          │
│  │ ├─ AI Agents  │  │   - 代码查看                             │
│  │ │  ├─ Starter │  │                                          │
│  │ │  ├─ Advanced│  │                                          │
│  │ │  └─ Voice   │  │                                          │
│  │ ├─ RAG Apps   │  │                                          │
│  │ ├─ MCP Agents │  │                                          │
│  │ └─ LLM Tools  │  │                                          │
│  └───────────────┘  │                                           │
│                     │                                           │
│  ┌───────────────┐  │                                           │
│  │ 我的技能      │  │                                           │
│  ├───────────────┤  │                                           │
│  │ 技能文件      │  │                                           │
│  ├───────────────┤  │                                           │
│  │ 模板库        │  │                                           │
│  └───────────────┘  │                                           │
└─────────────────────┴───────────────────────────────────────────┘
```

---

## 数据结构设计

### 1. awesome-llm-apps 数据解析

从 README.md 提取的结构化数据：

```typescript
interface AwesomeLLMAgent {
  id: string;                    // 唯一标识 (基于路径)
  name: string;                  // 显示名称
  emoji: string;                 // 图标 emoji
  description?: string;          // 简短描述
  category: AgentCategory;       // 分类
  subCategory?: string;          // 子分类
  githubPath: string;            // GitHub 相对路径
  tags: string[];                // 标签 (openai, anthropic, local 等)
  modelProvider?: string;        // 模型供应商
  hasLocalVersion?: boolean;     // 是否支持本地运行
}

type AgentCategory = 
  | 'starter-agents'      // 🌱 入门级
  | 'advanced-agents'     // 🚀 高级
  | 'voice-agents'        // 🗣️ 语音
  | 'mcp-agents'          // ♾️ MCP
  | 'rag-tutorials'       // 📀 RAG
  | 'multi-agent-teams'   // 🤝 多智能体
  | 'game-agents'         // 🎮 游戏
  | 'llm-apps';           // 💬 LLM 应用
```

### 2. 解析后的数据示例

```typescript
const awesomeAgents: AwesomeLLMAgent[] = [
  {
    id: "ai-travel-agent",
    name: "AI Travel Agent",
    emoji: "🛫",
    category: "starter-agents",
    githubPath: "starter_ai_agents/ai_travel_agent/",
    tags: ["local", "cloud"],
    hasLocalVersion: true,
  },
  {
    id: "ai-deep-research-agent",
    name: "AI Deep Research Agent",
    emoji: "🔍",
    category: "advanced-agents",
    githubPath: "advanced_ai_agents/single_agent_apps/ai_deep_research_agent/",
    tags: ["openai"],
  },
  // ... 共 100+ 个智能体
];
```

---

## 实现步骤

### 第一步：创建数据解析模块

**新建文件**：`src/data/awesomeLLMAgents.ts`

解析 README 中的智能体列表，生成静态数据（不需要运行时克隆 GitHub）

| 分类 | 数量 | 说明 |
|------|------|------|
| Starter AI Agents | 12 | 入门级智能体 |
| Advanced AI Agents | 20+ | 高级单/多智能体 |
| Voice AI Agents | 4 | 语音智能体 |
| MCP AI Agents | 4 | MCP 协议智能体 |
| RAG Tutorials | 18 | RAG 应用 |
| Multi-agent Teams | 13 | 多智能体团队 |
| Game Playing Agents | 3 | 游戏智能体 |
| LLM Apps | 15+ | Chat with X、Memory 等 |

---

### 第二步：创建侧边栏「智能体广场」组件

**新建文件**：`src/components/foundry/AgentPlazaSidebar.tsx`

**功能**：
1. 分类折叠面板展示智能体列表
2. 搜索过滤功能
3. 标签筛选（本地/云端/OpenAI/Anthropic 等）
4. 点击选中智能体

**UI 结构**：
```
┌─────────────────────────────────┐
│ 🏪 智能体广场          [搜索🔍] │
├─────────────────────────────────┤
│ ▼ 🌱 入门级智能体 (12)          │
│   🛫 AI Travel Agent            │
│   🎙️ AI Blog to Podcast        │
│   📊 AI Data Analysis           │
│   ...                           │
├─────────────────────────────────┤
│ ▶ 🚀 高级智能体 (20+)           │
├─────────────────────────────────┤
│ ▶ 🗣️ 语音智能体 (4)            │
├─────────────────────────────────┤
│ ▶ ♾️ MCP 智能体 (4)             │
├─────────────────────────────────┤
│ ▶ 📀 RAG 应用 (18)              │
├─────────────────────────────────┤
│ ▶ 🤝 多智能体团队 (13)          │
└─────────────────────────────────┘
```

---

### 第三步：创建智能体详情面板

**新建文件**：`src/components/foundry/AgentPlazaDetail.tsx`

**功能**：
1. 显示选中智能体的详细信息
2. GitHub 源码链接
3. 一键克隆到本地项目
4. 代码预览（从 GitHub API 获取 README）

**UI 示例**：
```
┌─────────────────────────────────────────────────────────┐
│ 🛫 AI Travel Agent (Local & Cloud)                      │
│                                                         │
│ 📁 starter_ai_agents/ai_travel_agent/                   │
│                                                         │
│ 标签: [Local] [Cloud] [OpenAI]                          │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📄 README.md (从 GitHub 加载)                       │ │
│ │                                                     │ │
│ │ # AI Travel Agent                                   │ │
│ │ An AI-powered travel planning assistant...          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [查看源码 🔗]  [克隆到项目 📥]  [在浏览器中打开 🌐]       │
└─────────────────────────────────────────────────────────┘
```

---

### 第四步：修改 FoundrySidebar 集成智能体广场

**修改文件**：`src/components/foundry/FoundrySidebar.tsx`

**改动**：
1. 在「我的技能」section 上方新增「智能体广场」section
2. 添加 props 传递选中的智能体
3. 支持展开/收起状态

```typescript
// 新增 props
interface FoundrySidebarProps {
  // ... existing props
  onAgentSelect?: (agent: AwesomeLLMAgent) => void;
  selectedAgentId?: string | null;
}

// 新增 section state
const [sectionsOpen, setSectionsOpen] = useState({
  plaza: true,      // 新增：智能体广场
  skills: true,
  files: true,
  templates: false,
  tools: false,
});
```

---

### 第五步：创建 GitHub 内容获取 Hook

**新建文件**：`src/hooks/useGitHubContent.ts`

**功能**：
1. 从 GitHub Raw API 获取指定路径的文件内容
2. 缓存机制避免重复请求
3. 支持加载 README.md、requirements.txt 等

```typescript
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/Shubhamsaboo/awesome-llm-apps/main';

export function useGitHubContent(path: string) {
  return useQuery({
    queryKey: ['github-content', path],
    queryFn: async () => {
      const res = await fetch(`${GITHUB_RAW_BASE}/${path}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.text();
    },
    staleTime: 1000 * 60 * 60, // 1 小时缓存
    enabled: !!path,
  });
}
```

---

### 第六步：更新 Foundry 页面集成

**修改文件**：`src/pages/Foundry.tsx`

**改动**：
1. 添加智能体广场相关状态
2. 在消费者模式新增「广场」tab
3. 在开发者模式的侧边栏显示智能体列表

```typescript
// 新增状态
const [selectedPlazaAgent, setSelectedPlazaAgent] = useState<AwesomeLLMAgent | null>(null);

// 消费者模式新增 tab
type ConsumerView = "store" | "bundles" | "plaza" | "myBundles" | "create" | "lowcode" | "creator" | "knowledge";

// 新增 tab 按钮
<Button
  variant={consumerView === "plaza" ? "default" : "ghost"}
  size="sm"
  onClick={() => setConsumerView("plaza")}
  className="gap-2"
>
  <Store className="h-4 w-4" />
  智能体广场
</Button>
```

---

### 第七步（可选）：数据库同步

**Edge Function**：`supabase/functions/sync-awesome-agents/index.ts`

定期从 GitHub 同步数据到 `agent_templates` 表，支持：
1. 自动更新新增的智能体
2. 记录使用次数和评分
3. 支持用户收藏

---

## 修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/data/awesomeLLMAgents.ts` | CREATE | 智能体数据定义 |
| `src/components/foundry/AgentPlazaSidebar.tsx` | CREATE | 广场侧边栏组件 |
| `src/components/foundry/AgentPlazaDetail.tsx` | CREATE | 智能体详情面板 |
| `src/components/foundry/AgentPlazaCard.tsx` | CREATE | 智能体卡片组件 |
| `src/hooks/useGitHubContent.ts` | CREATE | GitHub 内容获取 |
| `src/components/foundry/FoundrySidebar.tsx` | UPDATE | 集成广场模块 |
| `src/pages/Foundry.tsx` | UPDATE | 页面状态管理 |

---

## 智能体分类预览

| 分类 | 图标 | 数量 | 示例智能体 |
|------|------|------|------------|
| Starter AI Agents | 🌱 | 12 | Travel Agent, Music Generator, Data Analysis |
| Advanced AI Agents | 🚀 | 20+ | Deep Research, Investment, VC Due Diligence |
| Voice AI Agents | 🗣️ | 4 | Audio Tour, Customer Support Voice |
| MCP AI Agents | ♾️ | 4 | Browser MCP, GitHub MCP, Notion MCP |
| RAG Tutorials | 📀 | 18 | Agentic RAG, Corrective RAG, Vision RAG |
| Multi-agent Teams | 🤝 | 13 | Finance Team, Legal Team, Design Team |
| Game Agents | 🎮 | 3 | Chess Agent, Tic-Tac-Toe, 3D Pygame |
| LLM Apps | 💬 | 15+ | Chat with PDF, Gmail, YouTube |

---

## 预期效果

1. **侧边栏集成**：在技能工坊左侧新增「智能体广场」折叠区域
2. **分类浏览**：按类型浏览 100+ 优质 LLM 智能体模板
3. **搜索过滤**：支持关键词搜索和标签筛选
4. **详情预览**：点击查看智能体的详细说明和源码
5. **一键克隆**：将智能体模板复制到自己的项目中
6. **GitHub 链接**：直接跳转到源码仓库

---

## 技术要点

1. **静态数据解析**：从 README.md 提取结构化数据，编译时生成
2. **GitHub Raw API**：实时获取智能体的 README 和代码文件
3. **缓存策略**：React Query 缓存避免重复请求
4. **懒加载**：详情内容按需加载，优化首屏性能
