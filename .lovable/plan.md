
# 质检报告：已开发功能的 UI/UX 缺口分析与增强方案

## 一、审计总结

通过对项目代码库的全面审查，我发现了多个已在后端/逻辑层完成开发但缺乏对应 UI/UX 展示的功能模块。以下是按优先级分类的缺口清单及增强方案。

---

## 二、高优先级缺口（P0 - 显著影响用户体验）

### 2.1 智能体版本时间旅行（Time Travel）

**现状分析**：
- `useTimeTravel.ts` 和 `useAgentSnapshots.ts` 已完整实现版本管理功能
- `useSnapshotDiff.ts` 提供了详细的版本差异对比
- 数据库表 `agent_snapshots` 和 `snapshot_tags` 已就绪

**UI 缺口**：
- 没有专门的时间线可视化组件
- 缺少日历视图让用户选择历史时间点
- 无版本 Diff 可视化界面

**增强方案**：

| 新组件 | 功能 |
|--------|------|
| `SnapshotTimelinePanel.tsx` | 时间线视图，展示版本历史 |
| `SnapshotCalendarPicker.tsx` | 日历选择器，按日期导航版本 |
| `SnapshotDiffViewer.tsx` | 对比两个版本的差异（节点/边/配置）|
| `SnapshotRestoreDialog.tsx` | 恢复确认对话框，带预览 |

**集成位置**：Builder 页面侧边栏新增 "版本历史" Tab

---

### 2.2 安全审计日志可视化

**现状分析**：
- `useSecurityAudit.ts` 完整记录了登录、权限变更、API 密钥等安全事件
- 数据存储在 `security_audit_logs` 表
- 目前仅在 `Auth.tsx` 中被调用记录，无可视化界面

**UI 缺口**：
- 用户无法查看自己的安全事件历史
- 管理员无法监控异常登录
- 缺少安全仪表板

**增强方案**：

| 新组件 | 功能 |
|--------|------|
| `SecurityAuditDashboard.tsx` | 安全事件仪表板 |
| `AuditLogTable.tsx` | 可筛选/搜索的审计日志表格 |
| `SecurityAlertBadge.tsx` | 异常事件实时提醒 |

**集成位置**：Profile 页面新增 "安全日志" Tab

---

### 2.3 LLM 使用统计增强

**现状分析**：
- `useLLMUsageStats.ts` 提供了丰富的统计数据（按模型、按模块、错误日志等）
- `LLMUsageStats.tsx` 组件已存在但未在主要页面显示

**UI 缺口**：
- Dashboard 首页未展示 AI 使用情况
- 缺少成本趋势图表
- 用户难以发现该功能

**增强方案**：

| 改动 | 说明 |
|------|------|
| 在 `Index.tsx` 首页添加 `LLMUsageStats` 卡片 | 紧凑模式展示关键指标 |
| 创建 `LLMUsageTrendChart.tsx` | 使用 Recharts 展示 30 天趋势 |
| 在 Profile 页面添加完整版统计面板 | 详细的模型/模块分解 |

---

### 2.4 任务调度器状态可视化

**现状分析**：
- `useTaskScheduler.ts` 实现了 HRT/SRT/DT 三级优先级任务调度
- 边缘函数 `task-scheduler` 处理任务队列
- 完全没有 UI 展示任务执行状态

**UI 缺口**：
- 用户不知道后台任务在运行
- 无法查看任务队列状态
- 缺少任务执行历史

**增强方案**：

| 新组件 | 功能 |
|--------|------|
| `TaskSchedulerPanel.tsx` | 显示当前队列中的任务 |
| `TaskPriorityBadge.tsx` | HRT/SRT/DT 优先级标识 |
| `BackgroundTaskIndicator.tsx` | 全局状态栏显示后台任务数量 |

**集成位置**：Runtime 页面 DevTools 面板

---

## 三、中优先级缺口（P1 - 提升体验）

### 3.1 创作者收益详情面板

**现状分析**：
- `useCreatorEarnings.ts` 和 `useDownloadTrends.ts` 提供收益和下载数据
- `CreatorDashboard.tsx` 仅展示汇总统计

**UI 缺口**：
- 缺少收益明细列表
- 无下载趋势图表
- 缺少按技能/Bundle 的收益分解

**增强方案**：

| 新组件 | 功能 |
|--------|------|
| `EarningsDetailPanel.tsx` | 收益明细表格 |
| `DownloadTrendChart.tsx` | 30 天下载趋势图 |
| `SkillRevenueBreakdown.tsx` | 按技能分解的收益饼图 |

**集成位置**：Foundry 页面创作者仪表板

---

### 3.2 任务链执行历史

**现状分析**：
- `useChainExecutions.ts` 完整记录了任务链执行状态
- 包含 `step_logs`、`variables_used` 等详细数据

**UI 缺口**：
- `TaskChainPanel.tsx` 未展示历史执行记录
- 无法回溯之前的执行结果

**增强方案**：

| 新组件 | 功能 |
|--------|------|
| `ChainExecutionHistory.tsx` | 执行历史列表 |
| `ExecutionStepTimeline.tsx` | 单次执行的步骤时间线 |
| `StepResultPreview.tsx` | 步骤执行结果预览 |

**集成位置**：Runtime 页面任务链面板

---

### 3.3 知识图谱可视化增强

**现状分析**：
- `useKnowledgeGraph.ts` 支持节点/边管理和图搜索
- `SemanticGraphPanel.tsx` 已存在但功能有限

**UI 缺口**：
- 缺少交互式图谱编辑
- 无法可视化图搜索结果
- 关系类型不够直观

**增强方案**：

| 改动 | 说明 |
|------|------|
| 增强 `SemanticGraphPanel.tsx` | 添加缩放、拖拽、节点高亮 |
| 创建 `GraphSearchResults.tsx` | 展示搜索命中的子图 |
| 创建 `RelationshipEditor.tsx` | 编辑节点间关系 |

---

### 3.4 意图漂移可视化

**现状分析**：
- `useIntentDrift.ts` 和 `useCircuitBreaker.ts` 中的意图分析功能完整
- `IntentDriftIndicator.tsx` 已存在但较为简单

**UI 缺口**：
- 缺少会话级别的意图变化图表
- 无历史意图对比视图

**增强方案**：

| 新组件 | 功能 |
|--------|------|
| `IntentDriftChart.tsx` | 会话中意图相似度变化折线图 |
| `IntentComparisonView.tsx` | 对比原始意图 vs 当前意图 |

**集成位置**：Runtime 熔断器面板

---

## 四、低优先级缺口（P2 - 锦上添花）

### 4.1 错误自愈日志展示

**现状分析**：
- `useSelfHealing.ts` 提供完整的自愈逻辑和日志

**UI 缺口**：
- 自愈过程对用户不可见
- 无修复历史记录

**增强方案**：创建 `SelfHealingLogPanel.tsx`

---

### 4.2 API 告警规则管理

**现状分析**：
- `useApiAlerts.ts` 支持创建/更新/删除告警规则
- `ApiAlertPanel.tsx` 已存在但可增强

**UI 缺口**：
- 告警历史可读性可改进
- 缺少告警趋势图

**增强方案**：增强 `ApiAlertPanel.tsx`，添加历史趋势

---

### 4.3 技能计量使用展示

**现状分析**：
- `useSkillMetering.ts` 追踪技能调用和 Token 消耗

**UI 缺口**：
- 用户不知道哪些技能消耗了多少 Token

**增强方案**：在 Foundry 创建 `SkillMeteringStats.tsx`

---

## 五、实施计划

### 第一阶段：高优先级（2 周）

| 任务 | 工时 | 文件 |
|------|------|------|
| 时间旅行面板 | 12h | SnapshotTimelinePanel, SnapshotDiffViewer, SnapshotCalendarPicker |
| 安全审计仪表板 | 8h | SecurityAuditDashboard, AuditLogTable |
| LLM 使用统计增强 | 4h | 更新 Index.tsx, 创建趋势图 |
| 任务调度器可视化 | 6h | TaskSchedulerPanel, BackgroundTaskIndicator |

### 第二阶段：中优先级（1.5 周）

| 任务 | 工时 | 文件 |
|------|------|------|
| 创作者收益详情 | 6h | EarningsDetailPanel, DownloadTrendChart |
| 任务链执行历史 | 5h | ChainExecutionHistory, ExecutionStepTimeline |
| 知识图谱增强 | 6h | 增强 SemanticGraphPanel |
| 意图漂移图表 | 4h | IntentDriftChart |

### 第三阶段：低优先级（0.5 周）

| 任务 | 工时 | 文件 |
|------|------|------|
| 自愈日志面板 | 3h | SelfHealingLogPanel |
| API 告警增强 | 2h | 增强 ApiAlertPanel |
| 技能计量统计 | 2h | SkillMeteringStats |

---

## 六、文件变更清单

### 新建文件

| 文件路径 | 说明 | 优先级 |
|----------|------|--------|
| `src/components/builder/SnapshotTimelinePanel.tsx` | 版本时间线 | P0 |
| `src/components/builder/SnapshotDiffViewer.tsx` | 版本差异对比 | P0 |
| `src/components/builder/SnapshotCalendarPicker.tsx` | 日历选择器 | P0 |
| `src/components/builder/SnapshotRestoreDialog.tsx` | 恢复确认 | P0 |
| `src/components/profile/SecurityAuditDashboard.tsx` | 安全审计仪表板 | P0 |
| `src/components/profile/AuditLogTable.tsx` | 审计日志表格 | P0 |
| `src/components/dashboard/LLMUsageTrendChart.tsx` | LLM 使用趋势 | P0 |
| `src/components/runtime/TaskSchedulerPanel.tsx` | 任务调度面板 | P0 |
| `src/components/runtime/BackgroundTaskIndicator.tsx` | 后台任务指示器 | P0 |
| `src/components/foundry/EarningsDetailPanel.tsx` | 收益详情 | P1 |
| `src/components/foundry/DownloadTrendChart.tsx` | 下载趋势 | P1 |
| `src/components/runtime/ChainExecutionHistory.tsx` | 任务链历史 | P1 |
| `src/components/runtime/ExecutionStepTimeline.tsx` | 步骤时间线 | P1 |
| `src/components/runtime/IntentDriftChart.tsx` | 意图漂移图 | P1 |
| `src/components/builder/SelfHealingLogPanel.tsx` | 自愈日志 | P2 |
| `src/components/foundry/SkillMeteringStats.tsx` | 技能计量 | P2 |

### 修改文件

| 文件路径 | 改动说明 | 优先级 |
|----------|----------|--------|
| `src/pages/Builder.tsx` | 添加版本历史 Tab | P0 |
| `src/pages/Profile.tsx` | 添加安全日志 Tab | P0 |
| `src/pages/Index.tsx` | 添加 LLM 使用卡片 | P0 |
| `src/components/runtime/DevToolsPanel.tsx` | 添加任务调度 Tab | P0 |
| `src/components/foundry/CreatorDashboard.tsx` | 添加收益详情 | P1 |
| `src/components/runtime/TaskChainPanel.tsx` | 添加历史记录 | P1 |
| `src/components/builder/SemanticGraphPanel.tsx` | 增强交互 | P1 |
| `src/components/runtime/CircuitBreakerPanel.tsx` | 添加意图图表 | P1 |
| `src/components/builder/ApiAlertPanel.tsx` | 增强历史展示 | P2 |

---

## 七、预期效果

完成所有增强后，用户将获得以下体验提升：

| 功能领域 | 改进前 | 改进后 |
|----------|--------|--------|
| 版本管理 | 无可视化 | 完整时间线 + 日历选择 + Diff 对比 |
| 安全审计 | 仅后台记录 | 可视化仪表板 + 事件筛选 |
| AI 使用监控 | 隐藏功能 | 首页展示 + 趋势图 |
| 任务调度 | 完全透明 | 实时状态 + 历史追溯 |
| 创作者收益 | 仅汇总数字 | 详细明细 + 趋势分析 |
| 任务链执行 | 无历史 | 完整执行回溯 |
| 知识图谱 | 基础展示 | 交互式编辑 |
| 意图追踪 | 简单指示器 | 完整漂移图表 |

---

## 八、总工时估算

| 阶段 | 工时 |
|------|------|
| P0 高优先级 | ~30h |
| P1 中优先级 | ~21h |
| P2 低优先级 | ~7h |
| **总计** | **~58h** |
