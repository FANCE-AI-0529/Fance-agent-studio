import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "FANCE 与 ChatGPT、Claude 等通用大模型有什么区别？",
    a: "FANCE 不是大模型本身，而是构建在大模型之上的企业级基础设施。它提供容器级隔离（NanoClaw）、多级权限治理（MPLP）、可视化工作流编排、持久化记忆系统和 API 发布能力，底层搭载 FANCE.AI 认知引擎。您可以将 FANCE 理解为「AI 员工的操作系统」——大模型是引擎，FANCE 是整辆车。",
  },
  {
    q: "数据安全如何保障？我的业务数据会被用于模型训练吗？",
    a: "绝对不会。FANCE 采用零数据留存策略：所有用户数据在独立的 NanoClaw 沙箱中处理，会话结束后即销毁临时数据。持久化数据（如知识库、记忆文件）仅存储在您的专属实例中，完全隔离。企业版支持私有化部署，数据不出您的网络边界。",
  },
  {
    q: "MPLP 协议具体是如何工作的？",
    a: "MPLP（Multi-Level Permission & Liability Protocol）是三级治理协议：Strict 模式下所有操作需人工审批；Confirm 模式下高风险操作弹出确认、低风险自动执行；Auto 模式下 Agent 完全自主运行。您可以按 Agent、按技能、按操作类型灵活配置策略，实现精细化的行为管控。",
  },
  {
    q: "支持哪些大模型？可以使用自己的模型吗？",
    a: "FANCE 内置支持 GPT-5 系列、Gemini 2.5/3 系列等主流模型，由 FANCE.AI 认知引擎统一调度，开箱即用无需 API Key。同时支持自定义模型接入——通过标准 OpenAI 兼容接口，您可以接入任何自托管或第三方模型，包括私有化部署的开源模型。",
  },
  {
    q: "Agent Swarm 集群协作的性能和规模上限是多少？",
    a: "单个 Swarm 集群最多支持 50 个 Agent 并行协作，通过 A2A 协议进行任务委派和上下文透传。内置 Circuit Breaker 熔断保护和自适应限流，确保任何单点故障不会级联扩散。企业版支持跨区域集群部署。",
  },
  {
    q: "如何获取内测邀请码？",
    a: "目前 FANCE 处于受邀内测阶段。您可以点击页面上的「获取内测邀请码」按钮提交申请，我们的团队会在 1-3 个工作日内审核并发送邀请码到您的邮箱。企业客户可通过「联系销售」通道获得优先审核。",
  },
  {
    q: "免费版和付费版的核心区别是什么？",
    a: "免费版提供 1 个 Agent 实例和 5 个基础技能，适合个人开发者体验和原型验证。Pro 版解锁全部 60+ 技能、Studio 可视化编排、Agent Swarm 集群协作和版本管理，适合生产环境。Enterprise 版增加私有化部署、高级治理策略、SSO 和 SLA 保障。",
  },
  {
    q: "迁移成本高吗？是否支持与现有系统集成？",
    a: "FANCE 提供标准 RESTful API 和 Webhook 事件订阅，可无缝对接现有系统。每个 Agent 均可一键发布为 API 端点，自动生成密钥和调用统计。SDK 支持 Python、TypeScript、Go 等主流语言。迁移通常只需几小时即可完成核心对接。",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-16 sm:py-32 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-10 sm:mb-16"
        >
          <span className="text-[10px] sm:text-xs font-mono text-[#fbbf24] tracking-[0.3em] uppercase mb-3 block">
            FAQ
          </span>
          <h2 className="text-2xl sm:text-5xl font-extrabold tracking-tight text-white">
            常见
            <span
              style={{
                background: "linear-gradient(135deg, #fbbf24, #22d3ee)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              问题
            </span>
          </h2>
        </motion.div>

        <div className="space-y-2 sm:space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className={`w-full text-left p-4 sm:p-5 rounded-xl border backdrop-blur-sm transition-all ${
                    isOpen
                      ? "border-[#22d3ee]/20 bg-[#0a0a0a]/80"
                      : "border-white/[0.06] bg-[#0a0a0a]/40 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm sm:text-base font-medium text-white leading-snug">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 text-[#71717a] transition-transform duration-300 ${
                        isOpen ? "rotate-180 text-[#22d3ee]" : ""
                      }`}
                    />
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="text-xs sm:text-sm text-[#a1a1aa] leading-relaxed mt-3 sm:mt-4 pr-6">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
