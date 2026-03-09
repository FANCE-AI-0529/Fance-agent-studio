# 更新日志

所有重要的项目更新都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.0] - 2025-02-03

### 🎉 首次开源发布

Fance Studio 正式开源！这是一个企业级智能体构建平台，基于双引擎架构设计。

### ✨ 新增功能

#### 智能体构建器 (Builder)
- 可视化画布编辑器，支持节点拖拽和 DAG 工作流
- Monaco 系统提示词编辑器
- Git 风格的版本快照管理
- 多人实时协作编辑

#### 技能工坊 (Foundry)
- 技能市场，支持发现和安装社区技能
- 能力包系统，批量安装相关技能
- MCP (Model Context Protocol) 工具集成
- 技能评分和评论系统

#### 知识库管理 (Knowledge)
- RAG 检索增强生成
- PDF、Markdown、文本多格式支持
- 自动文档切片和向量化
- 知识图谱实体抽取

#### 运行时对话 (Runtime)
- 流式 Token 输出
- 多模态图片理解
- 消息引用回复
- AI 情绪表情系统

#### 安全与治理
- MPLP 权限控制协议
- RLS 行级数据隔离
- API 密钥 AES-256 加密存储
- 完整操作审计日志

### 🔧 技术特性
- React 18 + TypeScript + Vite
- Supabase PostgreSQL + Edge Functions
- shadcn/ui + Tailwind CSS
- React Flow 可视化
- OpenAI 兼容 API 接口

---

## 版本规划

### [1.1.0] - 计划中
- [ ] 移动端 PWA 优化
- [ ] 国际化 (i18n) 完善
- [ ] 技能开发者 SDK

### [1.2.0] - 计划中
- [ ] 工作流自动化引擎
- [ ] 多智能体协作
- [ ] 自定义主题系统
