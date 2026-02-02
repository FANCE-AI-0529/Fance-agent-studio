# Agent OS Studio 开发路线图 (更新于 2026-02-02)

## 🎉 项目状态：生产就绪 + Dify 架构增强 + 测试文档完成

---

## ✅ Phase 3: 测试与文档 - 已完成

### 测试基础设施 (100% 完成)
- [x] Vitest 配置和测试环境搭建
- [x] 测试工具函数 (renderWithProviders, mockNodeData, nodePropsHelper)
- [x] 节点组件单元测试 (LLMNode, TemplateNode, IteratorNode, LoopNode, DocExtractorNode, VariableAggregatorNode)
- [x] 工作流集成测试
- [x] 边缘函数集成测试

### 文档 (100% 完成)
- [x] 节点使用文档 (docs/WORKFLOW_NODES.md)
- [x] API 参考文档 (docs/WORKFLOW_API.md)

---

## ✅ Dify 架构增强 - 已完成

### Phase 1: 核心节点 (100% 完成)
- [x] LLMNode - 独立 LLM 调用节点
- [x] HTTPRequestNode - HTTP 请求节点
- [x] CodeNode - 代码执行节点
- [x] ParameterExtractorNode - 参数提取器
- [x] 边缘函数 (workflow-llm-call, workflow-http-request, workflow-code-executor)

### Phase 2: 辅助节点 (100% 完成)
- [x] TemplateNode - 模板转换节点 (Jinja2/Handlebars)
- [x] VariableAggregatorNode - 变量聚合器
- [x] VariableAssignerNode - 变量赋值器
- [x] DocExtractorNode - 文档提取器
- [x] IteratorNode - 迭代器节点
- [x] LoopNode - 循环执行节点

### 底层增强
- [x] 端口类型扩展 (file, array, streaming)
- [x] NodeType 类型系统扩展 (workflowDSL.ts)
- [x] Mock 数据预设更新 (mockDataPresets.ts)
- [x] SkillMarketplace 节点工具栏集成
- [x] Builder.tsx 节点注册

---

## 节点能力对照表

| Dify 节点 | Agent Studio 实现 | 状态 |
|-----------|------------------|------|
| LLM | LLMNode | ✅ 完成 |
| HTTP Request | HTTPRequestNode | ✅ 完成 |
| Code | CodeNode | ✅ 完成 |
| Parameter Extractor | ParameterExtractorNode | ✅ 完成 |
| Template | TemplateNode | ✅ 完成 |
| Variable Aggregator | VariableAggregatorNode | ✅ 完成 |
| Variable Assigner | VariableAssignerNode | ✅ 完成 |
| Document Extractor | DocExtractorNode | ✅ 完成 |
| Iteration | IteratorNode | ✅ 完成 |
| Loop | LoopNode | ✅ 完成 |
| If/Else | ConditionNode | ✅ 已有 |
| Question Classifier | IntentRouterNode | ✅ 已有 |
| Knowledge Retrieval | KnowledgeBaseNode | ✅ 已有 |

---

## Agent Studio 独有优势

保留以下 Agent Studio 原创节点：
- **Manus 内核** - 文件规划系统
- **即时技能生成** - AI 自动生成技能
- **人工介入节点** - MPLP 安全协议
- **意图路由器** - 语义级别路由

---

## 文件清单

### 已创建文件
| 文件路径 | 说明 |
|----------|------|
| `src/components/builder/nodes/LLMNode.tsx` | LLM 调用节点 |
| `src/components/builder/nodes/HTTPRequestNode.tsx` | HTTP 请求节点 |
| `src/components/builder/nodes/CodeNode.tsx` | 代码执行节点 |
| `src/components/builder/nodes/ParameterExtractorNode.tsx` | 参数提取器 |
| `src/components/builder/nodes/TemplateNode.tsx` | 模板转换节点 |
| `src/components/builder/nodes/VariableAggregatorNode.tsx` | 变量聚合器 |
| `src/components/builder/nodes/VariableAssignerNode.tsx` | 变量赋值器 |
| `src/components/builder/nodes/DocExtractorNode.tsx` | 文档提取器 |
| `src/components/builder/nodes/IteratorNode.tsx` | 迭代器节点 |
| `src/components/builder/nodes/LoopNode.tsx` | 循环节点 |
| `supabase/functions/workflow-llm-call/index.ts` | LLM 调用边缘函数 |
| `supabase/functions/workflow-http-request/index.ts` | HTTP 代理边缘函数 |
| `supabase/functions/workflow-code-executor/index.ts` | 代码执行边缘函数 |

### 已修改文件
| 文件路径 | 改动说明 |
|----------|----------|
| `src/types/workflowDSL.ts` | 扩展 NodeType 枚举 |
| `src/components/builder/ports/portTypes.ts` | 新增端口类型 |
| `src/pages/Builder.tsx` | 注册新节点类型 |
| `src/components/builder/SkillMarketplace.tsx` | 节点工具栏添加新节点入口 |
| `src/components/builder/variables/mockDataPresets.ts` | 新增 Mock 数据 |
