# 贡献指南

感谢您对 Fance Studio 的关注！我们欢迎各种形式的贡献。

## 行为准则

参与本项目即表示您同意遵守我们的行为准则。请保持友善和专业。

## 如何贡献

### 报告 Bug

1. 在 [Issues](https://github.com/fance-studio/fance-studio/issues) 中搜索是否已存在相同问题
2. 如果没有，创建新的 Issue，使用 Bug 报告模板
3. 提供详细的复现步骤、预期行为和实际行为

### 功能建议

1. 在 Issues 中搜索是否已有类似建议
2. 创建新的 Issue，使用功能请求模板
3. 清楚描述功能的用途和价值

### 提交代码

#### 1. Fork 和克隆

```bash
# Fork 仓库后克隆到本地
git clone https://github.com/YOUR_USERNAME/agent-studio.git
cd agent-studio

# 添加上游仓库
git remote add upstream https://github.com/agent-studio/agent-studio.git
```

#### 2. 创建分支

```bash
# 确保在最新的 main 分支上
git checkout main
git pull upstream main

# 创建功能分支
git checkout -b feature/your-feature-name
```

#### 3. 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test

# 运行代码检查
npm run lint
```

#### 4. 提交

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```bash
# 类型: feat, fix, docs, style, refactor, test, chore
git commit -m "feat: add new skill marketplace filter"
git commit -m "fix: resolve agent chat streaming issue"
git commit -m "docs: update README installation guide"
```

#### 5. 推送和创建 PR

```bash
git push origin feature/your-feature-name
```

然后在 GitHub 上创建 Pull Request。

## 开发规范

### 代码风格

- 使用 TypeScript，确保类型安全
- 遵循项目的 ESLint 和 Prettier 配置
- 组件使用函数式组件 + Hooks
- 使用 Tailwind CSS 进行样式设计，遵循项目的设计系统

### 文件组织

```
src/components/
├── ComponentName/
│   ├── index.tsx           # 主组件
│   ├── ComponentName.tsx   # 组件实现
│   └── ComponentName.test.tsx  # 测试
```

### 测试

- 为新功能编写测试
- 确保所有测试通过：`npm test`
- 测试覆盖核心业务逻辑

### 文档

- 为公共 API 添加 JSDoc 注释
- 更新 README 如果添加了新功能
- 边缘函数需要添加文件头注释

## Pull Request 审核

PR 会经过以下检查：

1. **CI 检查**：代码检查、测试、构建
2. **代码审核**：至少一位维护者审核
3. **功能验证**：在预览环境中验证功能

## 需要帮助？

- 查看 [Discussions](https://github.com/agent-studio/agent-studio/discussions) 获取帮助
- 加入我们的社区聊天

再次感谢您的贡献！🎉
