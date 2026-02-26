

# Studio UI 重构计划 — 侧边栏 + HIVE 模块聚合 + 智能体列表

## 目标

将当前侧边栏的 5 个独立导航项重构为：
1. **工作台**（Dashboard）— 保持固定在侧边栏顶部
2. **HIVE** — 将"智能体构建""知识库""技能工坊""运行终端"聚合为一个模块，点击进入后使用类似技能工坊的水平 Tab 导航
3. **我的智能体列表** — 在侧边栏中以 Manus 风格显示已构建的智能体，每个智能体显示头像 + 名称，点击直接进入对应 Runtime 对话

## 架构设计

```text
┌─────────────────────────────┐
│  FANCE Logo + Brand         │
├─────────────────────────────┤
│  MPLP Protocol Badge        │
├─────────────────────────────┤
│  📊 工作台        (/)       │  ← 保留
│  🐝 HIVE          (/hive)   │  ← 新增聚合入口
├─────────────────────────────┤
│  我的智能体                  │  ← 新增区域
│  ┌─────────────────────┐    │
│  │ 🤖 客服助手      ●  │    │  ← 点击 → /hive?tab=runtime&agentId=xxx
│  │ 🧠 数据分析师       │    │
│  │ 📝 文案大师         │    │
│  │ ...                  │    │
│  └─────────────────────┘    │
├─────────────────────────────┤
│  治理引擎状态               │
├─────────────────────────────┤
│  ✨ 返回魔法界面             │
├─────────────────────────────┤
│  👤 用户信息                │
│  ⬅️ 折叠                   │
└─────────────────────────────┘
```

## HIVE 页面布局

```text
┌─────────────────────────────────────────────────────┐
│  HIVE   [智能体构建] [知识库] [技能工坊] [运行终端]  │  ← 水平 Tab 栏
├─────────────────────────────────────────────────────┤
│                                                     │
│         当前 Tab 对应的页面内容                       │
│         (Builder / Knowledge / Foundry / Runtime)    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 涉及的文件变更

### 1. 新建文件

| 文件 | 描述 |
|------|------|
| `src/pages/Hive.tsx` | HIVE 聚合页面，内嵌水平 Tab 栏，根据 `?tab=` 参数渲染 Builder / Knowledge / Foundry / Runtime 组件 |

### 2. 修改文件

| 文件 | 变更 |
|------|------|
| `src/components/layout/AppSidebar.tsx` | 1) 将 `mainNavItems` 缩减为"工作台"和"HIVE"两项；2) 新增"我的智能体"区域，查询 `useMyAgents`，以列表形式展示每个智能体（头像 + 名称 + 状态指示器），点击跳转 `/hive?tab=runtime&agentId=xxx`；3) 侧边栏折叠时只显示智能体头像 |
| `src/App.tsx` | 1) 新增 `/hive` 路由指向 `Hive` 页面；2) 保留 `/builder`、`/builder/:id`、`/knowledge`、`/foundry`、`/runtime` 路由作为兼容（重定向到 `/hive?tab=xxx`），确保已有链接不断裂 |
| `src/components/layout/MobileBottomNav.tsx` | 将 5 个底部 Tab 改为：首页、HIVE、对话（runtime）、我的 |
| `src/components/layout/MainLayout.tsx` | 无结构性变更，HIVE 页面仍然包裹在 MainLayout 内 |
| `src/pages/Runtime.tsx` | 需要确保 Runtime 组件可以作为子组件被嵌入 HIVE（移除 MainLayout 重复包裹的可能性） |

### 3. 不变的文件

Builder.tsx、Knowledge.tsx、Foundry.tsx、Runtime.tsx 的**内部逻辑和功能完全不变**，只是它们的渲染位置从独立路由移到 HIVE 页面的 TabContent 中。

## 详细实现步骤

### 步骤 1：创建 `src/pages/Hive.tsx`

- 使用 `useSearchParams` 读取 `tab` 参数（默认 `builder`）和 `agentId` 参数
- 顶部渲染水平 Tab 栏，样式复用 Foundry 消费者模式的 `bg-muted rounded-lg p-1` + Button 切换模式
- Tab 项：智能体构建（builder）、知识库（knowledge）、技能工坊（foundry）、运行终端（runtime）
- 每个 Tab 对应渲染原始页面组件（Builder、Knowledge、Foundry、Runtime）
- 当 `tab=runtime` 且有 `agentId` 时，传递给 Runtime 组件
- 当 `tab=builder` 且有路径参数时，传递 agentId 给 Builder

### 步骤 2：重构 `AppSidebar.tsx`

- 导航项缩减为 2 个：`工作台 /` 和 `HIVE /hive`
- HIVE 图标使用蜂巢概念图标（Hexagon 或自定义 SVG）
- 新增 `SidebarGroup`"我的智能体"：
  - 调用 `useMyAgents()` 获取智能体列表
  - 每个智能体渲染为一行：`AgentAvatarDisplay`（小尺寸） + 名称 + 状态点（deployed 绿色 / draft 灰色）
  - 点击已部署智能体 → `navigate('/hive?tab=runtime&agentId=${agent.id}')`
  - 点击草稿智能体 → `navigate('/hive?tab=builder&agentId=${agent.id}')`
  - 限制显示前 10 个，底部有"查看全部"链接
  - 侧边栏折叠时仅显示头像，hover 出 Tooltip 显示名称

### 步骤 3：更新 `App.tsx` 路由

- 添加 `/hive` 路由，包裹在 `ProtectedRoute + MainLayout` 中
- 旧路由 `/builder`、`/knowledge`、`/foundry`、`/runtime` 改为 `<Navigate to="/hive?tab=xxx" replace />`，保持向后兼容
- `/builder/:id` 重定向为 `/hive?tab=builder&agentId=:id`

### 步骤 4：更新 `MobileBottomNav.tsx`

- 导航项改为：首页(`/`)、HIVE(`/hive`)、对话(`/hive?tab=runtime`)、我的(`/profile`)

### 步骤 5：更新跨模块链接

- `Index.tsx` 中所有 `/builder`、`/runtime` 链接改为 `/hive?tab=builder`、`/hive?tab=runtime&agentId=xxx`
- Builder 中部署成功后的跳转改为 `/hive?tab=runtime&agentId=xxx`
- 其他所有 `navigate('/builder')` 等调用统一改为 HIVE 路径

## 功能完整性保障

| 原路由 | 新路由 | 功能保障 |
|--------|--------|----------|
| `/builder` | `/hive?tab=builder` | Builder 组件原样渲染，所有 ReactFlow 画布、保存、部署功能不变 |
| `/builder/:id` | `/hive?tab=builder&agentId=:id` | 通过 searchParams 传递 agentId，Builder 读取并加载对应智能体 |
| `/knowledge` | `/hive?tab=knowledge` | Knowledge 组件原样渲染，所有知识库管理功能不变 |
| `/foundry` | `/hive?tab=foundry` | Foundry 组件原样渲染（包含其自身的消费者/开发者模式切换） |
| `/runtime` | `/hive?tab=runtime` | Runtime 组件原样渲染，agentId 通过 searchParams 传递 |

## 需要特别注意的兼容性问题

1. **Builder 使用 `useParams` 读取 `:id`**：需要改为同时支持 `useSearchParams` 的 `agentId` 参数
2. **Runtime 的 ModeAwareRuntimeLayout**：在 HIVE 内嵌时，始终使用 Studio 模式（不需要 consumer 模式判断）
3. **Foundry 内部已有自己的 Tab 栏**：嵌入 HIVE 后，HIVE 的外层 Tab 选中"技能工坊"时，Foundry 内部的 Tab 栏仍正常工作，形成二级导航
4. **侧边栏智能体列表的实时性**：使用 `useMyAgents` 的 React Query 缓存，当用户在 Builder 中创建/部署智能体后，列表自动刷新

## 视觉设计要点

- HIVE Tab 栏高度 `h-14`，与 Foundry 消费者模式顶栏一致
- 智能体列表项高度 `h-10`，紧凑排列，hover 时背景高亮
- 已部署智能体右侧显示绿色实心圆点（`bg-green-500 w-2 h-2 rounded-full`）
- 草稿智能体右侧显示灰色空心圆点
- HIVE 图标建议使用 `Hexagon` 或 `Grid3x3` 图标，配合品牌紫色

