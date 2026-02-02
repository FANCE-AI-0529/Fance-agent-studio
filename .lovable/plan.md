

# 全局 UI/UX 统一性优化方案

---

## 一、审计发现：当前问题汇总

通过深入代码审查，发现以下 UI/UX 不一致和需要优化的问题：

---

### 问题 1：智能体图标缺乏科技感

**现状分析：**
- `AgentAvatarPicker.tsx` 提供了 32 个图标选项，但多数为通用图标（Bot, Brain, CPU）
- 智能体卡片中默认使用通用 `<Bot>` 图标（见 `TrendingAgents.tsx`、`Index.tsx`）
- `AgentAvatarAnimated.tsx` 仅支持 6 个简单图标（bot, sparkles, zap, heart, smile, help）
- 缺少专门的「AI/科技」风格图标集

**影响范围：**
```text
- src/pages/Index.tsx (我的助手卡片)
- src/components/dashboard/TrendingAgents.tsx (热门Agent榜)
- src/components/consumer/AgentGridList.tsx (消费者视图)
- src/components/consumer/BuildCompletionCard.tsx (构建完成卡片)
- src/components/runtime/AgentAvatarAnimated.tsx (对话头像)
```

---

### 问题 2：智能体命名缺少功能总结

**现状分析：**
- `normalizeAgentName()` 函数（`useInvisibleBuilder.ts` 行 658-726）仅做后缀规范化
- 生成的名称如「旅行智能体」缺乏功能描述
- 用户难以从名称快速了解智能体能力

**当前命名逻辑：**
```typescript
// 仅提取 2-6 个核心字 + "智能体" 后缀
function normalizeAgentName(rawName: string, description: string): string {
  // 移除后缀 → 移除口语前缀 → 提取核心词 → 添加后缀
  return `${coreName}智能体`;
}
```

**问题示例：**
| 用户描述 | 当前生成名称 | 期望名称 |
|----------|-------------|----------|
| 帮我规划日本7天旅行 | 旅行智能体 | 旅行规划助手 - 行程定制专家 |
| 分析公司财报数据 | 财报智能体 | 财报分析智能体 - 数据洞察 |

---

### 问题 3：编辑器 vs 域名预览 UI 不一致

**对比分析：**

| 组件/区域 | 编辑器 (Studio) | 域名预览 (Consumer) | 差异 |
|-----------|-----------------|---------------------|------|
| 卡片圆角 | `rounded-xl` (12px) | `rounded-2xl` (16px) | 不一致 |
| 卡片阴影 | `shadow-md` | `shadow-lg` + `backdrop-blur` | 不一致 |
| 按钮高度 | `h-9` (default) | `h-12` (BuildCompletionCard) | 不一致 |
| 间距系统 | `gap-4`, `space-y-4` | `gap-3`, `mb-6` | 混用 |
| 边框颜色 | `border-border` | `border-border/50` | 透明度差异 |

**具体文件差异：**
```text
编辑器侧:
- src/pages/Index.tsx → 卡片使用 `rounded-xl border border-border`
- src/pages/Profile.tsx → 卡片使用 `rounded-2xl`

消费者侧:
- src/pages/ConsumerHome.tsx → 卡片使用 `rounded-2xl` + glassmorphism
- src/components/consumer/BuildCompletionCard.tsx → `rounded-2xl p-6`
```

---

### 问题 4：组件样式未统一使用 Design Token

**发现问题：**
- 部分组件硬编码颜色值（如 `#3b82f6`）而非使用 CSS 变量
- `ConsumerHome.tsx` 行 193-194 直接使用内联样式：
  ```tsx
  style={{
    backgroundImage: 'linear-gradient(to right, #3b82f6, #8b5cf6, #a855f7)'
  }}
  ```
- 应统一使用 `index.css` 中定义的 `--primary`, `--cognitive` 等变量

---

### 问题 5：响应式布局断点不一致

**当前断点使用：**
```text
- src/pages/Index.tsx: `md:grid-cols-3`
- src/pages/Profile.tsx: `grid-cols-3`
- src/components/dashboard/TrendingAgents.tsx: `md:grid-cols-2 lg:grid-cols-3`
- src/components/consumer/AgentGridList.tsx: `sm:grid-cols-3 md:grid-cols-4`
```

---

### 问题 6：加载状态和空状态不统一

**发现问题：**
- 加载状态有的使用 `Skeleton`，有的使用 `Loader2` 旋转图标
- 空状态设计不一致：部分有插图，部分仅有文字
- 缺少统一的 `EmptyState` 组件使用规范

---

## 二、优化方案

### 阶段一：科技感图标系统升级 (P0)

#### 任务 1.1：扩展智能体图标集

**文件**: `src/components/builder/AgentAvatarPicker.tsx`

**改动内容**:
- 新增 AI/科技主题图标分类
- 添加动态图标效果选项
- 支持图标动画状态

**新增图标（科技感）：**
```typescript
// AI & 科技图标
{ id: "circuit", icon: CircuitBoard, label: "电路", category: "tech" },
{ id: "robot-arm", icon: RobotArm, label: "机械臂", category: "tech" },
{ id: "network", icon: Network, label: "网络", category: "tech" },
{ id: "terminal", icon: Terminal, label: "终端", category: "tech" },
{ id: "binary", icon: Binary, label: "二进制", category: "tech" },
{ id: "satellite", icon: Satellite, label: "卫星", category: "tech" },
{ id: "radar", icon: Radar, label: "雷达", category: "tech" },
{ id: "atom", icon: Atom, label: "原子", category: "tech" },
{ id: "waveform", icon: AudioWaveform, label: "波形", category: "tech" },
{ id: "scan", icon: ScanFace, label: "人脸识别", category: "tech" },
```

#### 任务 1.2：智能图标推荐

**新建函数**: `suggestAvatarFromDescription()`

**逻辑**:
- 根据智能体描述/功能自动推荐图标
- 提取关键词匹配图标类别

```typescript
function suggestAvatarFromDescription(description: string): AgentAvatar {
  const keywordToIcon: Record<string, { iconId: string; colorId: string }> = {
    '代码|编程|开发': { iconId: 'code', colorId: 'cyan' },
    '数据|分析|报表': { iconId: 'database', colorId: 'blue' },
    '客服|对话|问答': { iconId: 'message-square', colorId: 'green' },
    '翻译|语言': { iconId: 'globe', colorId: 'purple' },
    '财务|金融': { iconId: 'wallet', colorId: 'amber' },
    '医疗|健康': { iconId: 'heart-pulse', colorId: 'rose' },
    '法律|合规': { iconId: 'scale', colorId: 'indigo' },
    '创意|设计': { iconId: 'palette', colorId: 'pink' },
    'AI|智能|自动化': { iconId: 'cpu', colorId: 'primary' },
  };
  
  for (const [pattern, avatar] of Object.entries(keywordToIcon)) {
    if (new RegExp(pattern).test(description)) {
      return avatar;
    }
  }
  
  return { iconId: 'sparkles', colorId: 'primary' };
}
```

---

### 阶段二：智能体命名增强 (P0)

#### 任务 2.1：功能摘要命名

**文件**: `src/hooks/useInvisibleBuilder.ts`

**改动函数**: `normalizeAgentName()`

**新逻辑**:
- 主名称 + 功能标签格式
- 限制总长度 20 字符内

**改进后的命名格式**:
```text
{核心功能}智能体 · {特色能力}

示例：
- 旅行规划智能体 · 行程定制
- 财报分析智能体 · 数据洞察
- 客服对话智能体 · 多语言
```

**代码实现**:
```typescript
function normalizeAgentName(rawName: string, description: string): string {
  // ... existing cleanup logic ...
  
  // 新增：提取功能标签
  const featureTag = extractFeatureTag(description);
  
  // 格式：核心名称智能体 · 功能标签
  const baseName = `${coreName}智能体`;
  
  if (featureTag && baseName.length + featureTag.length < 18) {
    return `${baseName} · ${featureTag}`;
  }
  
  return baseName;
}

function extractFeatureTag(description: string): string | null {
  const tagPatterns = [
    { pattern: /规划|定制|安排/, tag: '智能规划' },
    { pattern: /分析|洞察|解读/, tag: '数据洞察' },
    { pattern: /多语|翻译|双语/, tag: '多语言' },
    { pattern: /自动化|批量|效率/, tag: '自动化' },
    { pattern: /创作|写作|文案/, tag: '内容创作' },
    { pattern: /问答|对话|客服/, tag: '智能问答' },
  ];
  
  for (const { pattern, tag } of tagPatterns) {
    if (pattern.test(description)) {
      return tag;
    }
  }
  
  return null;
}
```

---

### 阶段三：UI 一致性统一 (P1)

#### 任务 3.1：创建统一卡片组件

**新建文件**: `src/components/ui/agent-card.tsx`

**内容**:
- 统一卡片样式（圆角、阴影、边框）
- 支持多种尺寸和变体
- 适配 Studio 和 Consumer 模式

```typescript
const agentCardVariants = cva(
  "bg-card border transition-all duration-200",
  {
    variants: {
      variant: {
        default: "rounded-xl border-border shadow-sm hover:shadow-md",
        glass: "rounded-2xl border-border/50 backdrop-blur-lg shadow-lg",
        compact: "rounded-lg border-border",
      },
      interactive: {
        true: "cursor-pointer hover:border-primary/50 hover:scale-[1.01]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      interactive: false,
    },
  }
);

export function AgentCard({ 
  variant, 
  interactive, 
  className, 
  children,
  ...props 
}: AgentCardProps) {
  return (
    <div className={cn(agentCardVariants({ variant, interactive }), className)} {...props}>
      {children}
    </div>
  );
}
```

#### 任务 3.2：统一按钮尺寸规范

**文件**: `src/components/ui/button.tsx`

**改动**:
- 确保所有页面主操作按钮使用 `size="lg"` (h-10)
- CTA 按钮使用 `size="xl"` (h-12)
- 辅助按钮使用 `size="default"` (h-9)

#### 任务 3.3：统一间距系统

**新建文件**: `src/styles/spacing.ts`

**内容**:
```typescript
export const spacing = {
  section: 'space-y-8', // 区域间距
  card: 'space-y-4',    // 卡片内间距
  group: 'space-y-3',   // 组内间距
  item: 'space-y-2',    // 项目间距
  
  gap: {
    section: 'gap-6',
    card: 'gap-4', 
    item: 'gap-2',
  },
  
  padding: {
    page: 'p-6',
    card: 'p-5',
    compact: 'p-4',
  },
};
```

---

### 阶段四：Design Token 统一 (P1)

#### 任务 4.1：移除硬编码颜色

**文件**: `src/pages/ConsumerHome.tsx`

**改动位置**: 行 186-197

**修改前**:
```tsx
<span 
  className="bg-clip-text text-transparent"
  style={{
    backgroundImage: 'linear-gradient(to right, #3b82f6, #8b5cf6, #a855f7)'
  }}
>
  智能数字员工
</span>
```

**修改后**:
```tsx
<span className="text-gradient-primary">
  智能数字员工
</span>
```

**新增 CSS 类** (`src/index.css`):
```css
.text-gradient-brand {
  background: linear-gradient(to right, hsl(var(--primary)), hsl(var(--cognitive)), hsl(263 70% 66%));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

### 阶段五：响应式布局标准化 (P2)

#### 任务 5.1：统一网格断点

**新建文件**: `src/styles/breakpoints.ts`

**内容**:
```typescript
export const gridCols = {
  // 卡片网格标准
  cards: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  // 小卡片网格
  smallCards: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
  // 宽卡片网格
  wideCards: 'grid-cols-1 md:grid-cols-2',
  // 统计卡片
  stats: 'grid-cols-2 lg:grid-cols-4',
};
```

**应用文件**:
- `src/pages/Index.tsx`
- `src/components/dashboard/TrendingAgents.tsx`
- `src/components/consumer/AgentGridList.tsx`

---

### 阶段六：加载与空状态标准化 (P2)

#### 任务 6.1：统一加载状态

**规范**:
- 列表加载：使用 `Skeleton` 组件
- 按钮加载：使用 `<Loader2 className="animate-spin" />`
- 页面加载：使用全屏 `Skeleton` 或品牌 Loading

#### 任务 6.2：统一空状态

**扩展文件**: `src/components/ui/empty-state.tsx`

**新增变体**:
```typescript
const emptyStateVariants = {
  default: {
    icon: Inbox,
    title: "暂无数据",
    description: "当前没有可显示的内容",
  },
  agents: {
    icon: Bot,
    title: "还没有智能体",
    description: "创建你的第一个 AI 助手吧",
    action: { label: "开始创建", href: "/builder" },
  },
  search: {
    icon: Search,
    title: "未找到结果",
    description: "尝试调整搜索条件",
  },
};
```

---

## 三、文件变更清单

### 新建文件
| 文件路径 | 说明 |
|----------|------|
| `src/components/ui/agent-card.tsx` | 统一智能体卡片组件 |
| `src/styles/spacing.ts` | 间距系统常量 |
| `src/styles/breakpoints.ts` | 响应式断点标准 |

### 修改文件
| 文件路径 | 改动说明 |
|----------|----------|
| `src/components/builder/AgentAvatarPicker.tsx` | 扩展科技感图标 |
| `src/components/runtime/AgentAvatarAnimated.tsx` | 同步图标系统 |
| `src/hooks/useInvisibleBuilder.ts` | 增强命名逻辑 |
| `src/pages/ConsumerHome.tsx` | 移除硬编码颜色 |
| `src/pages/Index.tsx` | 应用统一卡片组件 |
| `src/components/dashboard/TrendingAgents.tsx` | 应用统一样式 |
| `src/components/consumer/AgentGridList.tsx` | 应用统一样式 |
| `src/index.css` | 新增渐变文字类 |

---

## 四、实施优先级

| 阶段 | 任务 | 优先级 | 工时 |
|------|------|--------|------|
| 一 | 科技感图标扩展 | P0 | 2h |
| 一 | 智能图标推荐 | P0 | 1h |
| 二 | 功能摘要命名 | P0 | 2h |
| 三 | 统一卡片组件 | P1 | 3h |
| 三 | 统一按钮规范 | P1 | 1h |
| 四 | Design Token 统一 | P1 | 2h |
| 五 | 响应式标准化 | P2 | 2h |
| 六 | 加载/空状态统一 | P2 | 2h |
| **总计** | | | **~15h** |

---

## 五、验收标准

### 视觉一致性

- [ ] 所有智能体卡片使用统一圆角和阴影
- [ ] 科技感图标应用于智能体头像
- [ ] 智能体名称包含功能描述标签
- [ ] 编辑器和消费者视图样式一致

### 技术标准

- [ ] 无硬编码颜色值
- [ ] 所有颜色使用 CSS 变量
- [ ] 响应式断点统一
- [ ] 加载状态使用标准组件

### 用户体验

- [ ] 智能体图标能反映其功能
- [ ] 名称能快速传达智能体能力
- [ ] 跨页面视觉体验统一

