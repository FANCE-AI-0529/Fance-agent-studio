
# Agent OS Studio - 软件质量审查报告与开发修复计划

---

## 审查概述

本审查对 Agent OS Studio 项目进行了全面的功能模块检测、代码质量分析、安全漏洞扫描以及数据库结构审查。项目规模庞大（90+ 数据库表、50+ Edge Functions、100+ Hooks），整体架构设计合理，但存在若干需要修复的问题。

---

## 一、发现的问题分类汇总

| 严重程度 | 数量 | 类别 |
|----------|------|------|
| 严重 (Critical) | 3 | 安全漏洞 |
| 高 (High) | 5 | 功能缺陷、安全风险 |
| 中 (Medium) | 8 | 代码质量、用户体验 |
| 低 (Low) | 6 | 性能优化、代码规范 |

---

## 二、严重问题 (Critical)

### 问题 C-1: 用户资料表公开暴露

```text
位置: profiles 表
问题: 个人信息（display_name、bio、social_links、notification_preferences）
      可被匿名用户读取
风险: 数据泄露、隐私侵犯、社会工程攻击
```

**修复方案**:
```sql
-- 限制匿名用户只能读取公开字段
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Public profile fields only"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL  -- 认证用户可读取所有
    OR is_verified = true   -- 或仅展示认证创作者
  );
```

### 问题 C-2: API Key Hash 暴露给前端

```text
位置: agent_api_keys 表
问题: api_key_hash 和 api_key_prefix 列返回给客户端
风险: 彩虹表攻击、暴力破解
```

**修复方案**:
- 创建数据库视图，仅返回安全字段 (id, name, created_at, last_used_at)
- 永不在查询结果中返回 hash 值

### 问题 C-3: 沙盒代码执行安全隐患

```text
位置: supabase/functions/sandbox-execute/index.ts
问题: 使用 AsyncFunction 构造器执行用户代码
风险: 原型链污染、闭包逃逸、任意代码执行
```

**修复方案**:
1. 短期：增加 AST 级代码分析和白名单校验
2. 中期：使用 Deno 权限系统严格限制
3. 长期：迁移至 WebAssembly 沙盒或容器化执行

---

## 三、高优先级问题 (High)

### 问题 H-1: React ref 警告 - AchievementShowcase 组件

```text
位置: src/components/dashboard/AchievementShowcase.tsx
问题: Function components cannot be given refs
      TooltipTrigger 尝试传递 ref 给函数组件
控制台: Warning: Function components cannot be given refs...
```

**修复方案**:
```tsx
// 将 motion.div 包裹在 forwardRef 中
const AchievementBadge = forwardRef<HTMLDivElement, Props>((props, ref) => (
  <motion.div ref={ref} {...props} />
));

// 或使用 asChild 模式
<TooltipTrigger asChild>
  <motion.div className="...">
    {content}
  </motion.div>
</TooltipTrigger>
```

### 问题 H-2: user_activity_log 重复键冲突

```text
位置: src/hooks/useAchievements.ts (useLogActivity)
问题: POST 请求返回 409 Conflict
      "duplicate key value violates unique constraint"
网络日志: 每次页面加载触发多次 POST 导致冲突
```

**修复方案**:
```typescript
// 使用 upsert 替代 insert
const logActivity = async () => {
  if (!user) return;
  
  await supabase
    .from("user_activity_log")
    .upsert(
      { user_id: user.id, activity_date: new Date().toISOString().split('T')[0] },
      { onConflict: 'user_id,activity_date', ignoreDuplicates: true }
    );
};
```

### 问题 H-3: RLS 策略过于宽松

```text
位置: 多个数据库表
问题: 使用 USING (true) 或 WITH CHECK (true)
      允许任意 INSERT/UPDATE/DELETE 操作
```

**修复方案**:
- 审查所有 RLS 策略
- 对写操作添加 `auth.uid() = user_id` 条件
- 对敏感表移除匿名访问权限

### 问题 H-4: 密码泄露保护未启用

```text
位置: Supabase Auth 配置
问题: Leaked password protection is disabled
风险: 用户可使用已泄露的密码注册
```

**修复方案**:
启用 Supabase Auth 的密码泄露检测功能

### 问题 H-5: 数据库函数缺少 search_path

```text
位置: 多个自定义 SQL 函数
问题: search_path 参数未设置
风险: 潜在的 SQL 注入和权限提升攻击
```

**修复方案**:
```sql
ALTER FUNCTION public.my_function() 
SET search_path = public;
```

---

## 四、中等优先级问题 (Medium)

### 问题 M-1: 智能体广场组件未实现一键克隆

```text
位置: src/components/foundry/AgentPlazaDetail.tsx
现状: 仅复制 git clone 命令到剪贴板
预期: 实际将智能体模板导入到用户项目中
```

**增强方案**:
1. 解析 GitHub 仓库中的 Python/YAML 配置
2. 转换为 Agent OS 兼容的 Skill 格式
3. 创建智能体并自动挂载技能

### 问题 M-2: LLM Gateway 无降级机制

```text
位置: supabase/functions/llm-gateway/index.ts
问题: 当配置的 API 供应商不可用时，无自动回退
```

**增强方案**:
```typescript
// 添加 fallback 链
const providers = [customProvider, adminProvider, lovableDefault];
for (const provider of providers) {
  try {
    return await callProvider(provider);
  } catch (e) {
    console.warn(`Provider ${provider.name} failed, trying next...`);
  }
}
throw new Error("All providers failed");
```

### 问题 M-3: daily_inspiration 数据为空

```text
网络日志: GET /daily_inspiration 返回空数组 []
影响: 首页"每日灵感"模块无内容展示
```

**修复方案**:
- 创建定时任务填充每日内容
- 添加 fallback 静态内容

### 问题 M-4: Edge Function 日志格式不统一

```text
位置: 多个 Edge Functions
问题: console.log/error 格式不一致，难以追踪和调试
```

**修复方案**:
创建统一的日志工具类

### 问题 M-5: 模型映射硬编码

```text
位置: src/utils/modelMapping.ts
问题: UI 模型名到 Gateway 模型的映射写死在代码中
```

**优化方案**:
从数据库或配置文件加载映射关系

### 问题 M-6: 终端风格提示词注入

```text
位置: src/utils/terminalStylePrompt.ts
问题: 强制注入特定响应格式可能与用户自定义提示词冲突
```

**优化方案**:
提供开关让用户选择是否启用终端风格

### 问题 M-7: ConsumerRuntime 会话初始化竞态条件

```text
位置: src/components/runtime/ConsumerRuntime.tsx
问题: 多个 useEffect 依赖 isInitialized 状态
      可能导致消息重复加载或丢失
```

**修复方案**:
使用 React Query 的 useMutation 管理会话状态

### 问题 M-8: 缺少错误边界

```text
位置: 整体应用
问题: 子组件崩溃可能导致整个应用白屏
```

**修复方案**:
在关键路由添加 React Error Boundary

---

## 五、低优先级问题 (Low)

### 问题 L-1: 未使用的 getTimeAgo 函数

```text
位置: src/pages/Index.tsx (276-288行)
问题: 定义了但未使用的辅助函数
```

### 问题 L-2: 大量 TODO/FIXME 注释

```text
位置: 32 个文件中发现 918 处标记
需要: 整理并完成待办事项
```

### 问题 L-3: 重复的 TooltipProvider 嵌套

```text
位置: AchievementShowcase, 其他组件
问题: 在已有 TooltipProvider 的上下文中重复包裹
```

### 问题 L-4: 文件上传大小限制缺失

```text
位置: useFileUpload, FileUploadButton
问题: 未明确限制上传文件大小
```

### 问题 L-5: 缺少单元测试

```text
位置: src/tests/
问题: 测试覆盖率不足，关键业务逻辑缺少测试
```

### 问题 L-6: community_stats 视图暴露敏感指标

```text
位置: community_stats 数据库视图
问题: 日活、总对话数等竞品分析数据对匿名用户可见
```

---

## 六、修复开发计划

### 第一阶段：安全修复 (优先级: 紧急)

| 任务 | 预估工时 | 负责模块 |
|------|----------|----------|
| 修复 profiles 表 RLS 策略 | 2h | 数据库 |
| 隐藏 api_key_hash 字段 | 2h | 数据库 |
| 启用密码泄露保护 | 0.5h | Auth 配置 |
| 修复函数 search_path | 1h | 数据库 |
| 审查并修复宽松 RLS 策略 | 4h | 数据库 |

### 第二阶段：功能修复 (优先级: 高)

| 任务 | 预估工时 | 负责模块 |
|------|----------|----------|
| 修复 AchievementShowcase ref 警告 | 1h | 前端 |
| 修复 user_activity_log 重复键冲突 | 1h | Hooks |
| 添加 LLM Gateway 降级机制 | 3h | Edge Functions |
| 填充 daily_inspiration 内容 | 2h | 数据库/定时任务 |

### 第三阶段：体验优化 (优先级: 中)

| 任务 | 预估工时 | 负责模块 |
|------|----------|----------|
| 实现智能体广场一键导入 | 8h | Foundry 模块 |
| 添加 React Error Boundary | 2h | 全局 |
| 统一 Edge Function 日志格式 | 3h | Edge Functions |
| 修复 ConsumerRuntime 竞态条件 | 2h | Runtime |

### 第四阶段：代码质量 (优先级: 低)

| 任务 | 预估工时 | 负责模块 |
|------|----------|----------|
| 清理未使用代码 | 2h | 全局 |
| 整理 TODO 注释 | 4h | 全局 |
| 添加单元测试 | 16h | 测试 |
| 添加文件上传大小限制 | 1h | 文件上传 |

---

## 七、测试用例清单

### 功能测试

1. **认证模块**
   - [  ] 邮箱注册验证流程
   - [  ] 登录/登出功能
   - [  ] 访客模式限制

2. **智能体管理**
   - [  ] 创建新智能体
   - [  ] 编辑智能体配置
   - [  ] 删除智能体
   - [  ] 部署智能体

3. **对话运行时**
   - [  ] 流式响应正常渲染
   - [  ] 多模态消息支持（图片上传）
   - [  ] 会话持久化
   - [  ] 长期记忆功能

4. **技能工坊**
   - [  ] 技能创建/编辑
   - [  ] 技能发布
   - [  ] 技能商店浏览
   - [  ] 技能安装

5. **智能体广场**
   - [  ] 分类浏览
   - [  ] 搜索过滤
   - [  ] GitHub README 加载
   - [  ] 克隆命令复制

### 安全测试

- [  ] 匿名用户访问受保护资源
- [  ] SQL 注入测试
- [  ] XSS 攻击测试
- [  ] CSRF 保护验证

### 性能测试

- [  ] 首页加载时间 < 3s
- [  ] 智能体响应首字节时间 < 1s
- [  ] 大量消息历史加载性能

---

## 八、实施建议

1. **立即行动**: 安全问题应在 24-48 小时内修复并部署
2. **迭代修复**: 高优先级问题在下一个 Sprint 完成
3. **持续改进**: 中低优先级问题纳入技术债务 backlog
4. **监控告警**: 部署后添加错误监控 (Sentry/LogRocket)
5. **代码审查**: 建立 PR 审查流程，防止新问题引入

---

## 九、技术债务追踪

建议创建以下 GitHub Issues 追踪修复进度：

1. `[Security] Fix profiles table RLS exposure`
2. `[Security] Hide API key hashes from frontend`
3. `[Bug] Fix AchievementShowcase React ref warning`
4. `[Bug] Fix user_activity_log duplicate key error`
5. `[Feature] Implement Agent Plaza one-click import`
6. `[Improvement] Add LLM Gateway fallback mechanism`
7. `[Test] Add unit tests for core business logic`
