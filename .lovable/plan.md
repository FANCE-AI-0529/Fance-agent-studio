

# FANCE Agent OS -- Studio 全站 UI/UX 重塑方案

## 一、审计总结：当前问题诊断

经过对全部 7 个核心页面（Landing、ConsumerHome、Dashboard/Index、Builder、Runtime、Knowledge、Foundry）及全局框架（Sidebar、Hive TabBar、MainLayout）的逐一截图审查与代码分析，以下是系统性问题清单：

### 1. 视觉层 (Visual Layer)

| 问题 | 严重度 | 涉及页面 |
|------|--------|----------|
| **色彩系统分裂**：Landing 是暗黑渐变背景，ConsumerHome 是 Aurora 浅色，Studio 是白底 + 紫色主色调。三种风格无统一的视觉语言 | 高 | 全站 |
| **信息密度不均**：Builder 左中右三栏挤满按钮和图标（工具栏多达 12+ 图标），而 Knowledge 页面 70% 面积空白 | 高 | Builder、Knowledge |
| **层次感缺失**：所有页面背景都是平坦的 `bg-background`，缺少微妙的深度层级（如细微的渐变、卡片阴影梯度） | 中 | 全站 |
| **排版层级混乱**：Dashboard 使用 `text-2xl font-bold`，Builder 用 `text-sm font-semibold`，Foundry 用 `text-xl`，标题尺寸无统一规范 | 中 | 全站 |
| **Hive TabBar 太朴素**：仅 `bg-muted rounded-lg p-1` 的简单切换条，缺少上下文感知（当前选中标签无明显动效）和页面身份标识 | 中 | Hive.tsx |
| **Sidebar "治理引擎" 小部件占位过多**：底部的 4 色小圆点 + 文字标签对用户无实际价值，浪费宝贵的侧边栏空间 | 低 | AppSidebar |

### 2. 交互层 (Interaction Layer)

| 问题 | 严重度 | 涉及页面 |
|------|--------|----------|
| **Builder 工具栏过载**：顶部 Header 堆砌了 AI 生成、对话式创建、手动配置、MCP、Webhook、调试、评估、监控等 12+ 按钮，新用户认知负荷极高 | 高 | Builder |
| **Builder Wizard 弹窗阻断**：创建流程以全屏 Dialog 形式覆盖画布，用户无法同时看到画布状态 | 高 | Builder |
| **Runtime 侧边栏冗余**：左侧 Agent 选择面板和顶部 ImmersiveHeader 同时显示 Agent 名称/头像，信息重复 | 中 | Runtime |
| **Foundry 标签栏过载**：能力商店、能力包、智能体广场、AI创建、可视化配置、知识库、创作者中心、开发者 -- 8 个子标签挤在一行 | 高 | Foundry |
| **知识库空状态不友好**：右侧 70% 区域仅一个图标 + 文字，缺少引导式操作 | 中 | Knowledge |

### 3. 架构层 (Architecture Layer)

| 问题 | 严重度 | 涉及文件 |
|------|--------|----------|
| **Builder.tsx 2218 行巨型单文件**：所有工具栏、画布、面板、向导、弹窗混在一个组件中，任何 UI 修改都有高风险 | 高 | Builder.tsx |
| **Runtime.tsx 1680 行巨型单文件**：聊天逻辑、消息渲染、MPLP 模拟、场景系统、开发工具全部耦合 | 高 | Runtime.tsx |
| **Foundry.tsx 1591 行**：8 个子视图的渲染逻辑全部内联 | 高 | Foundry.tsx |
| **无统一布局规范**：每个页面独立实现 padding、gap、标题样式。`spacing.ts` 和 `breakpoints.ts` 已定义但未被一致使用 | 中 | 全站 |

---

## 二、设计原则 (Design Pillars)

基于 Awwwards 评级标准（设计、可用性、创意、内容），本次重塑遵循以下四个原则：

1. **"Obsidian Glass" 视觉统一**：统一暗色调+磨砂玻璃的设计语言，用 `backdrop-blur` + 半透明分层创造深度感
2. **渐进式信息披露 (Progressive Disclosure)**：默认隐藏高级功能，按需展开，降低新用户认知负荷
3. **运动即意义 (Motion as Meaning)**：每个动画都有功能目的，不做纯装饰性动效
4. **零功能退化 (Zero Functional Regression)**：所有后端连接、数据流、状态管理保持不变，仅重组 UI 结构

---

## 三、全站重塑方案

### Phase 1: 全局框架重塑 (Global Shell)

#### 1.1 Hive TabBar 升级

当前的 `HiveTabBar` 是一个朴素的按钮组。重塑为带动效的导航条：

```text
重塑前:
┌──────────────────────────────────────────────────┐
│  [智能体构建] [知识库] [技能工坊] [运行终端]       │
└──────────────────────────────────────────────────┘

重塑后:
┌──────────────────────────────────────────────────┐
│  ┌─────────┐                                     │
│  │构建      │  知识库   工坊   终端    [Agent名]  │
│  └─────────┘ ← animated underline                │
│  ═══════════                                     │
└──────────────────────────────────────────────────┘
```

- 替换 `bg-muted rounded-lg p-1` 为底部带 `motion.div` 滑动指示条的设计
- 选中标签使用 `layoutId` 动画实现丝滑切换
- 右侧显示当前 Agent 名称（如果 URL 中有 `agentId`），提供上下文感知
- 删除冗余的 `bg-card/50` 背景

#### 1.2 AppSidebar 精简

- **删除**底部"治理引擎"信息面板（4 色圆点 + 文字），改为简洁的系统状态指示灯（单个脉冲点）
- **删除** `MPLP v1.0.0 已锁定` badge -- 此信息对终端用户无意义，移至设置页面
- **新增**快速操作区：在 Agent 列表下方添加 `+ 新建 Agent` 按钮
- 用户头像区域改用 `Avatar` 组件 + 在线状态圆点

#### 1.3 统一间距令牌

强制全站使用 `spacing.ts` 中定义的令牌：
- 页面顶部标题区统一 `p-6 border-b`
- 内容区统一 `p-6 space-y-6`
- 卡片内部统一 `p-5 space-y-4`

---

### Phase 2: Builder 页面重塑

这是改动最大、风险最高的页面。核心策略是**拆分巨型文件 + 渐进式工具栏**。

#### 2.1 文件拆分（不改变功能逻辑）

```text
Builder.tsx (2218 行)
  ├─ BuilderPage.tsx        -- 页面骨架 + 路由逻辑
  ├─ BuilderToolbar.tsx     -- 顶部工具栏
  ├─ BuilderCanvas.tsx      -- ReactFlow 画布区
  ├─ BuilderSidePanel.tsx   -- 左侧技能面板
  ├─ BuilderConfigPanel.tsx -- 右侧配置面板
  └─ BuilderDialogs.tsx     -- 所有弹窗（向导/部署/验证/监控/评估）
```

#### 2.2 工具栏渐进式重设计

当前 12+ 按钮全部平铺在顶部。重塑为三层架构：

```text
层级 1 - 始终可见：
  [← 返回] [Agent名 + 头像] [保存] [运行] [部署]

层级 2 - 点击 "..." 展开：
  [AI 生成] [模板] [历史] [设置] [调试]

层级 3 - 通过 CommandPalette (Ctrl+K) 访问：
  评估中心、监控仪表板、MCP配置、Webhook配置等
```

- 主要操作使用 `Button variant="default"` 突出
- 次要操作使用 `Button variant="ghost"` 淡化
- 高级功能仅通过 `DropdownMenu` 或 `CommandPalette` 访问

#### 2.3 画布优化

- 空状态从当前的 `rounded-full px-4 py-2` 小条改为居中的插画卡片，提供三个入口：AI 生成、模板选择、手动拖拽
- 将 `Background variant={Dots}` 改为更精致的交叉点阵网格
- `Controls` 和 `MiniMap` 使用圆角 + 磨砂玻璃样式统一

#### 2.4 Wizard 流程改造

当前向导是全屏 Dialog 覆盖画布。改为**侧边抽屉式**：
- 从右侧滑入，宽度 400px，画布同时可见
- 步骤指示器从水平改为竖向，粘在抽屉左侧
- 每步完成后画布实时预览变化

---

### Phase 3: Runtime 页面重塑

#### 3.1 布局简化

当前三区域（Agent 列表 + 聊天 + DevTools）全部水平排列导致空间拥挤。

```text
重塑后:
┌──────────────────────────────────────────────────┐
│  [← 返回] [Agent头像+名称] [模型] [⚙️] [></> Dev] │  ← 合并的 Header
├──────────────────────────────────────────────────┤
│                                                   │
│           聊天主体区域（全宽）                      │
│                                                   │
├──────────────────────────────────────────────────┤
│  [📎] [🎤] [  输入消息...              ] [发送]   │  ← 底部输入
└──────────────────────────────────────────────────┘
```

- **Agent 选择器**：从左侧固定面板改为 Header 中的 `Popover`，点击 Agent 头像弹出选择器
- **DevTools**：从右侧 ResizablePanel 改为底部抽屉（类似浏览器 DevTools），默认收起
- **ImmersiveHeader**：精简为单行，显示 Agent 名称 + 模型选择 + 操作按钮

#### 3.2 消息气泡升级

- 用户消息右对齐，Assistant 消息左对齐（当前已实现，保持）
- 为 Assistant 消息添加微妙的打字机光标动效
- 代码块使用 `Monaco Editor` 的只读模式替代纯文本渲染
- Thinking Process 折叠为一行摘要，点击展开

#### 3.3 输入区重设计

- 输入框使用 `rounded-2xl` 替代 `rounded-md`，加大内边距
- 附件按钮和语音按钮收入 `+` 菜单中
- 快捷命令提示从文字改为键盘快捷键标签

---

### Phase 4: Knowledge 页面重塑

#### 4.1 空状态重设计

当前右侧大片空白仅显示一个图标。改为卡片式引导：

```text
┌─────────────────────────────────────┐
│  📄  拖拽文件到此处上传              │
│       或点击选择文件                  │
│  ─────────────────────────────────  │
│  支持 PDF、Markdown、TXT             │
│  最大 50MB                           │
└─────────────────────────────────────┘
```

#### 4.2 列表项卡片化

左侧知识库列表从简单的文字行改为卡片式：
- 每个卡片显示名称、状态标签、文档/分片数量进度条
- 悬浮时显示操作按钮（编辑、删除）
- 选中态使用左侧 2px 主色竖线标记

---

### Phase 5: Foundry 页面重塑

#### 5.1 子标签栏压缩

当前 8 个子标签挤在一行。重组为：

```text
主标签：  [发现]  [创建]  [我的]
子内容通过路由切换：
  发现 → 能力商店 + 能力包 + 智能体广场
  创建 → AI创建 + 可视化配置 + 开发者
  我的 → 已安装 + 创作者中心 + 知识库
```

#### 5.2 商店卡片升级

当前的技能卡片是简单的 `border` 方框。改为：
- 增加图标/缩略图区域
- 安装数和评分使用紧凑的 badge
- 悬浮卡片时微微上浮 + 边框高亮

---

### Phase 6: Dashboard (Index) 页面重塑

#### 6.1 布局优化

当前 Dashboard 是垂直滚动的长列表。改为仪表板网格布局：

```text
┌──────────────┬──────────────────────┐
│  统计卡片     │  每日灵感             │
│  (4 格网格)   │  (大卡片)             │
├──────────────┴──────────────────────┤
│  我的智能体 (横向滚动卡片)            │
├─────────────────────────────────────┤
│  快速开始指南                         │
└─────────────────────────────────────┘
```

- 统计卡片使用 `grid-cols-2 lg:grid-cols-4`
- 智能体列表使用横向滚动的卡片组，避免垂直空间占用过多
- 移除 `CommunityStats` 和 `TrendingAgents`（非核心功能，减少视觉噪音）

---

### Phase 7: 微交互与动效标准化

| 交互 | 当前 | 重塑 |
|------|------|------|
| 页面切换 | 无过渡 | `framer-motion` 的 `opacity + y` 淡入 |
| 按钮点击 | `active:scale-[0.98]` | 保持，增加 200ms `spring` 回弹 |
| 卡片悬浮 | `hover:border-primary/50` | 增加 `hover:translate-y-[-2px] hover:shadow-lg` |
| 模态打开 | 默认 Dialog | 从触发按钮位置放大展开（`layoutId`） |
| 标签切换 | 无动画 | 滑动下划线指示器 |

---

## 四、实施约束（零功能退化保障）

### 绝不修改的文件
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- 所有 `src/hooks/use*.ts` 的核心逻辑（仅可重新导出）
- 所有 `src/stores/*.ts` 的状态管理逻辑
- 数据库 schema / RLS / Edge Functions

### 修改策略
- **纯 UI 层重构**：仅修改 JSX 结构和 CSS 类名
- **组件拆分**：将巨型文件拆分为子组件，保持 props 接口不变
- **逐页面实施**：每次修改一个页面，验证后再进入下一个
- **保留所有事件处理函数**：`handleSave`、`handleDeploy`、`sendMessage` 等全部原样保留

### 实施顺序（按风险从低到高）

```text
第 1 步: Hive TabBar + AppSidebar (全局框架，影响所有页面)
第 2 步: Dashboard (Index) 页面
第 3 步: Knowledge 页面 (最简单的页面)
第 4 步: Foundry 页面 (子标签重组)
第 5 步: Runtime 页面 (布局调整)
第 6 步: Builder 页面 (最复杂，最后实施)
```

每一步完成后应进行端到端验证：
- 创建智能体流程是否正常
- Builder 画布拖拽/保存/部署是否正常
- Runtime 聊天发送/接收是否正常
- 知识库创建/上传是否正常
- Consumer ↔ Studio 数据同步是否正常

---

## 五、预计修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/pages/Hive.tsx` | 修改 | TabBar 动效升级 |
| `src/components/layout/AppSidebar.tsx` | 修改 | 删除治理引擎面板，精简 MPLP badge |
| `src/components/layout/MainLayout.tsx` | 修改 | 微调间距 |
| `src/pages/Index.tsx` | 修改 | Dashboard 网格化布局 |
| `src/pages/Knowledge.tsx` | 修改 | 空状态重设计，列表卡片化 |
| `src/pages/Foundry.tsx` | 修改 | 子标签栏重组为 3 大类 |
| `src/pages/Runtime.tsx` | 修改 | Agent 选择器改为 Popover，输入区圆角化 |
| `src/pages/Builder.tsx` | 拆分 | 拆为 5 个子组件文件 |
| `src/components/builder/BuilderToolbar.tsx` | 新建 | 从 Builder.tsx 提取 |
| `src/components/builder/BuilderCanvas.tsx` | 新建 | 从 Builder.tsx 提取 |
| `src/components/builder/BuilderSidePanel.tsx` | 新建 | 从 Builder.tsx 提取 |
| `src/components/builder/BuilderConfigPanel.tsx` | 新建 | 从 Builder.tsx 提取 |
| `src/components/builder/BuilderDialogs.tsx` | 新建 | 从 Builder.tsx 提取 |
| `src/index.css` | 修改 | 新增 glass 卡片变体、动效令牌 |

