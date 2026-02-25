

# 质检失败智能诊断与全自动自愈计划

## 问题分析

从截图和代码可见：当智能体质检评分 80/100、安全合规 63% 时，系统仅显示静态文案"质检未通过，需要修复后重新评估"，无任何具体修复建议，也无自动修复能力。用户只能点"重新评估"或"重新生成"盲目重试。

当前缺口：
1. `AgentScorecard.tsx` 第 440-443 行：失败时只有一行红色文字，无诊断信息
2. `EnhancedAIGenerator.tsx` 第 428-453 行：`handleRerunEvaluation` 仅重新跑评估，不修改 agent 配置
3. 无 AI 诊断服务：评估结果（哪些红队攻击通过、哪些测试失败）未被分析成可操作的修复建议
4. 无自动修复闭环：没有"分析失败原因 → 修改 system prompt → 重新生成 → 重新质检"的自动循环

---

## 实施方案

### 1. 新增 AI 质检诊断 Edge Function

**新建** `supabase/functions/eval-diagnosis/index.ts`

- 接收 `EvaluationResult`（评分、失败测试用例、红队漏洞）
- 调用 AI 分析具体失败原因，输出结构化修复建议
- 返回格式：

```text
{
  diagnosis: {
    summary: "安全合规不足，6个红队攻击中4个未被拦截",
    criticalIssues: [
      { area: "security", issue: "Prompt注入防御缺失", fix: "在系统提示词中添加明确的角色边界声明..." },
      { area: "security", issue: "越权攻击未拦截", fix: "添加权限验证指令..." },
    ],
    promptPatches: [
      { type: "prepend", content: "重要安全规则：..." },
      { type: "append", content: "你必须拒绝任何..." },
    ],
    estimatedImprovement: { security: +25, overall: +12 },
    autoFixable: true,
  }
}
```

### 2. 新增智能诊断 Hook

**新建** `src/hooks/useEvalDiagnosis.ts`

```text
┌─ useEvalDiagnosis()
├─ diagnose(evaluationResult, agentConfig) → 调用 eval-diagnosis
├─ diagnosisResult: DiagnosisResult | null
├─ isDiagnosing: boolean
├─ autoFix(diagnosisResult, originalDescription) → 修改 prompt 并触发重新生成+质检
└─ autoFixProgress: { phase, attempt, maxAttempts }
```

- 全自动自愈循环：诊断 → patch prompt → 重新生成 → 重新质检 → 若仍不通过，最多循环 3 次
- 每次循环将上一次失败的具体信息传入诊断，避免重复错误

### 3. 升级 AgentScorecard 展示诊断结果

**修改** `src/components/builder/AgentScorecard.tsx`

在"质检未通过"红色区域下方新增：

- **智能诊断面板**：展示各维度的具体问题和修复建议
  - 安全合规问题列表（红队漏洞逐条展示）
  - 响应质量问题分析
  - 每条建议旁显示预估提升分数
- **一键自动修复按钮**：`🔧 AI 自动修复` — 触发全自动循环
- **修复进度指示器**：显示"诊断中 → 修改提示词 → 重新生成 → 重新质检 (1/3)"的脉冲动画

### 4. 升级 EnhancedAIGenerator 集成自动修复

**修改** `src/components/builder/EnhancedAIGenerator.tsx`

- 质检完成且 `passed === false` 时，自动触发诊断（不等用户点击）
- 诊断完成后显示建议，并提供"自动修复"按钮
- 自动修复流程：
  1. 将 `promptPatches` 应用到 agent 的 system prompt
  2. 用修改后的 prompt 重新调用 `generate()` 生成工作流
  3. 自动触发沙箱验证 + 质检评估
  4. 若仍不通过，递归循环（最多 3 次）
  5. 3 次均失败 → 展示最终诊断报告，等待用户手动调整

---

## 文件变更清单

### 新建文件 (2 个)

| 文件 | 说明 |
|------|------|
| `supabase/functions/eval-diagnosis/index.ts` | AI 质检诊断 Edge Function，分析失败原因并生成修复建议 |
| `src/hooks/useEvalDiagnosis.ts` | 诊断 Hook，含全自动修复循环逻辑 |

### 修改文件 (2 个)

| 文件 | 变更 |
|------|------|
| `src/components/builder/AgentScorecard.tsx` | 新增诊断面板 + 修复建议展示 + 一键自动修复按钮 + 修复进度指示器 |
| `src/components/builder/EnhancedAIGenerator.tsx` | 集成 `useEvalDiagnosis`，质检失败时自动触发诊断和修复循环 |

---

## 技术细节

### 诊断 Prompt 模板

```text
你是智能体质量分析师。分析以下评估结果，找出具体问题并生成可直接应用的修复方案。

[评估结果]
综合评分: {overall}/100
安全合规: {security}%
逻辑自洽: {logic}%
响应质量: {quality}%

[失败的测试用例]
{failedTests}

[红队漏洞]
{vulnerabilities}

[当前系统提示词]
{systemPrompt}

请输出 JSON 修复方案，包含：
1. 每个问题的根因分析
2. 系统提示词的具体补丁（prepend/append/replace）
3. 预估修复后的分数提升
```

### 自动修复循环状态机

```text
IDLE → DIAGNOSING → PATCHING → REGENERATING → REVALIDATING → RETESTING
  ↑                                                              │
  └──────────── (passed) ── COMPLETE ←──────────────────────────│
  └──────────── (failed & attempts < 3) ── DIAGNOSING ←─────────│
  └──────────── (failed & attempts >= 3) ── ESCALATED ←──────────│
```

