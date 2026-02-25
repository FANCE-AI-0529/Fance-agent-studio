

# 智能体图标精细化优化计划

## 问题分析

从截图可以看到，所有智能体卡片的图标存在以下问题：

1. **图标千篇一律** — `generateRandomAvatar()` 函数（`useInvisibleBuilder.ts` 第24-50行）和 `agentAssembler.ts` 都硬编码为 `iconId: 'bot'`，仅通过颜色区分。截图中5个智能体全部显示相同的机器人图标。

2. **图标与功能不匹配** — 竞品追踪应该用 `search`/`radar`，客服接待应该用 `message-square`，医疗问诊应该用 `heart-pulse`，但全部显示为通用 `bot`。

3. **卡片视觉层次单调** — `AgentGridList` 的卡片只有图标+名称，缺少功能描述或状态标识，视觉区分度不足。

4. **AgentAvatarDisplay 缺少 `xl` 尺寸** — 只有 sm/md/lg 三档，Grid 卡片中使用 `lg`（56px）仍显小。

---

## 修改方案

### 修改 1：智能图标匹配（核心修复）

**文件**：`src/hooks/useInvisibleBuilder.ts`

将 `generateRandomAvatar()` 从"全部使用 bot 图标"升级为"根据描述关键词自动匹配最佳图标"：

```text
图标关键词映射：
  search/radar  ← 竞品、追踪、监控、竞对、情报
  message-square ← 客服、接待、对话、聊天、沟通
  heart-pulse   ← 医疗、健康、诊断、医生、病
  brain         ← 分析、AI、智能、推理、决策
  code          ← 代码、编程、开发、程序、技术
  graduation-cap ← 教育、学习、培训、课程、考试
  scale         ← 法律、合规、法务、合同、律师
  wallet        ← 金融、财务、理财、银行、投资
  shopping-cart ← 电商、购物、选品、商品、店铺
  globe         ← 翻译、语言、国际、外语
  palette       ← 设计、创意、美工、UI、视觉
  file-text     ← 文档、写作、报告、文案、内容
  database      ← 数据、统计、报表、BI、洞察
  bot           ← 默认兜底
```

### 修改 2：agentAssembler 同步

**文件**：`src/utils/agentAssembler.ts`

在 `assembleAgentGraph` 函数中，将两处硬编码的 `avatar: { iconId: 'bot', colorId: 'primary' }` 替换为调用同样的智能匹配逻辑（提取为共享函数 `generateSmartAvatar`）。

### 修改 3：提取共享函数

**新文件**：`src/utils/avatarGenerator.ts`

将图标+颜色的智能匹配逻辑提取为独立工具函数，供 `useInvisibleBuilder.ts`、`agentAssembler.ts`、`Builder.tsx` 三处共同引用，避免重复代码。

```typescript
export function generateSmartAvatar(description: string): AgentAvatar
```

### 修改 4：AgentGridList 卡片视觉增强

**文件**：`src/components/consumer/AgentGridList.tsx`

- 图标容器增加微妙的渐变背景环，与图标颜色联动
- 添加功能描述文本（一行，截断），从 `agent.description` 读取
- hover 时图标微缩放动画优化

### 修改 5：AgentAvatarDisplay 新增 xl 尺寸

**文件**：`src/components/builder/AgentAvatarPicker.tsx`

在 `sizeClasses` 和 `iconSizes` 中新增 `xl: "w-16 h-16"` / `xl: "h-9 w-9"`，供 Grid 卡片和大屏展示使用。

---

## 文件变更清单

| 文件 | 变更说明 |
|------|---------|
| `src/utils/avatarGenerator.ts` | **新建** — 共享智能图标+颜色匹配函数 |
| `src/hooks/useInvisibleBuilder.ts` | 替换 `generateRandomAvatar` 为导入 `generateSmartAvatar` |
| `src/utils/agentAssembler.ts` | 两处硬编码 avatar 替换为 `generateSmartAvatar` 调用 |
| `src/components/builder/AgentAvatarPicker.tsx` | `AgentAvatarDisplay` 新增 xl 尺寸 |
| `src/components/consumer/AgentGridList.tsx` | 卡片视觉增强：渐变背景环、描述文本、hover 动画 |

共 5 个文件变更（1 新建 + 4 修改）。

