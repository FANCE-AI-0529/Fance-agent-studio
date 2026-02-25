import { motion } from "framer-motion";

const features = [
  {
    category: "可视化工作流引擎",
    tag: "BUILDER",
    color: "#22d3ee",
    items: [
      {
        title: "拖拽式节点编排",
        desc: "基于 React Flow 的画布引擎，支持 7+ 节点类型——LLM 调用、条件分支、循环、HTTP 端点、代码执行、人机确认、子流程。所有连接自动进行类型安全检查。",
      },
      {
        title: "版本快照 & Git 式管理",
        desc: "每次保存自动生成 Snapshot，包含完整的图数据、挂载技能和系统提示词。支持 Diff 对比、一键回滚至任意历史版本。",
      },
      {
        title: "实时调试 & Dry-Run",
        desc: "内置调试面板可逐节点单步执行，实时查看每个节点的输入/输出数据流。支持 Dry-Run 模式：模拟运行但不产生真实副作用。",
      },
    ],
  },
  {
    category: "记忆与知识系统",
    tag: "KNOWLEDGE",
    color: "#818cf8",
    items: [
      {
        title: "Core Memory 核心记忆",
        desc: "Agent 的持久化人格数据。支持按类别管理（persona、preferences、instructions），优先级排序，Token 预算自动裁剪。",
      },
      {
        title: "RAG 知识库",
        desc: "上传 PDF、Markdown、网页等文档，自动分块、向量化、建立语义索引。Agent 对话时自动检索相关上下文，显著提升回答质量。",
      },
      {
        title: "Memory File System",
        desc: "类文件系统的结构化记忆存储。Agent 可在运行时读写 .md / .yaml / .json 文件，实现跨会话的状态持久化。",
      },
    ],
  },
  {
    category: "安全与治理",
    tag: "SECURITY",
    color: "#c084fc",
    items: [
      {
        title: "MPLP 分级策略引擎",
        desc: "三级治理策略（Strict / Confirm / Auto）精细控制每个 Agent 的行为边界。高风险操作自动弹出人机确认，低风险操作自主执行。",
      },
      {
        title: "路径遍历 & SSRF 防御",
        desc: "底层文件操作层内置目录遍历检测、符号链接穿透防御、Null 字节注入拦截。网络请求层阻断私有 IP、云 Metadata 端点及 DNS 重绑定攻击。",
      },
      {
        title: "审计日志 & 安全事件流",
        desc: "全链路审计——登录/注册事件、API 调用日志、权限变更记录，全部实时写入不可篡改的事件流，支持合规审查导出。",
      },
    ],
  },
  {
    category: "API & 集成",
    tag: "API HUB",
    color: "#fbbf24",
    items: [
      {
        title: "一键 API 发布",
        desc: "任何 Agent 都可以一键发布为 RESTful API。自动生成 API Key、速率限制、调用统计仪表盘。支持 Webhook 事件订阅。",
      },
      {
        title: "熔断器 & 自适应限流",
        desc: "内置 Circuit Breaker 状态机。当下游服务异常时自动熔断，半开状态探测恢复，全程可观测。配合自适应限流算法保护系统稳定性。",
      },
      {
        title: "多模态输入",
        desc: "支持文本、图片、语音、文件等多模态输入。Agent 可自动识别输入类型并调用对应的处理管线——OCR、语音转文字、图像理解。",
      },
    ],
  },
];

export function DetailedFeatures() {
  return (
    <section className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <span className="text-xs font-mono text-[#818cf8] tracking-[0.3em] uppercase mb-4 block">
            Deep Dive
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            每一层，都是
            <span
              style={{
                background: "linear-gradient(135deg, #22d3ee, #c084fc)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {" "}生产级
            </span>
          </h2>
        </motion.div>

        <div className="space-y-24">
          {features.map((section, si) => (
            <motion.div
              key={section.tag}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              {/* Category header */}
              <div className="flex items-center gap-4 mb-8">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full border"
                  style={{
                    borderColor: `${section.color}33`,
                    backgroundColor: `${section.color}0d`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: section.color }} />
                  <span className="text-xs font-mono tracking-wider" style={{ color: section.color }}>
                    {section.tag}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">{section.category}</h3>
              </div>

              {/* Feature cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {section.items.map((item, ii) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: ii * 0.1, duration: 0.6 }}
                    className="group p-6 rounded-xl border border-white/[0.06] bg-[#0a0a0a]/50 backdrop-blur-sm hover:border-white/10 transition-all"
                  >
                    <h4 className="text-base font-semibold text-white mb-2">{item.title}</h4>
                    <p className="text-sm text-[#a1a1aa] leading-relaxed">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
