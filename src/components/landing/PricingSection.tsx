import { motion } from "framer-motion";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    tag: "个人开发者",
    price: "免费",
    period: "",
    color: "#22d3ee",
    highlight: false,
    features: [
      "1 个 Agent 实例",
      "5 个内置技能",
      "1,000 次/月 API 调用",
      "基础 RAG 知识库（10MB）",
      "社区支持",
      "Consumer 模式",
    ],
  },
  {
    name: "Pro",
    tag: "最受欢迎",
    price: "¥299",
    period: "/月",
    color: "#818cf8",
    highlight: true,
    features: [
      "10 个 Agent 实例",
      "全部 60+ 技能解锁",
      "50,000 次/月 API 调用",
      "高级 RAG 知识库（1GB）",
      "Studio 可视化编排",
      "Agent Swarm 集群协作",
      "版本快照 & 回滚",
      "优先邮件支持",
    ],
  },
  {
    name: "Enterprise",
    tag: "企业级部署",
    price: "定制",
    period: "",
    color: "#c084fc",
    highlight: false,
    features: [
      "无限 Agent 实例",
      "自定义技能开发",
      "无限 API 调用",
      "私有化部署选项",
      "MPLP 高级治理策略",
      "SSO & RBAC 权限管理",
      "专属客户成功经理",
      "SLA 99.9% 可用性保障",
    ],
  },
];

interface PricingSectionProps {
  onBookDemo: () => void;
}

export function PricingSection({ onBookDemo }: PricingSectionProps) {
  return (
    <section id="pricing" className="relative py-16 sm:py-32 px-4 sm:px-6">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-none" />
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-10 sm:mb-16"
        >
          <span className="text-[10px] sm:text-xs font-mono text-[#22d3ee] tracking-[0.3em] uppercase mb-3 block">
            Pricing
          </span>
          <h2 className="text-2xl sm:text-5xl font-extrabold tracking-tight text-white mb-3 sm:mb-4">
            选择适合你的
            <span
              style={{
                background: "linear-gradient(135deg, #22d3ee, #818cf8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {" "}算力方案
            </span>
          </h2>
          <p className="text-sm sm:text-base text-[#a1a1aa] max-w-xl mx-auto">
            从免费起步，按需扩展。所有方案均包含 NanoClaw 沙箱隔离与安全审计。
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-stretch">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.12, duration: 0.8 }}
              className={`relative group rounded-2xl border backdrop-blur-xl overflow-hidden transition-all ${
                plan.highlight
                  ? "border-[#818cf8]/40 bg-[#0a0a0a]/80 scale-[1.02] sm:scale-105 z-10"
                  : "border-white/[0.06] bg-[#0a0a0a]/50 hover:border-white/10"
              }`}
            >
              {/* Glow for highlighted */}
              {plan.highlight && (
                <div
                  className="absolute -inset-px rounded-2xl opacity-30 blur-sm pointer-events-none"
                  style={{ background: `linear-gradient(135deg, ${plan.color}, transparent)` }}
                />
              )}

              <div className="relative p-5 sm:p-8">
                {/* Tag */}
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-4 sm:mb-5"
                  style={{
                    borderColor: `${plan.color}33`,
                    backgroundColor: `${plan.color}0d`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: plan.color }} />
                  <span className="text-[10px] sm:text-xs font-mono tracking-wider" style={{ color: plan.color }}>
                    {plan.tag}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-5 sm:mb-6">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white">{plan.price}</span>
                  {plan.period && <span className="text-sm text-[#71717a]">{plan.period}</span>}
                </div>

                {/* Features */}
                <ul className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: plan.color }} />
                      <span className="text-xs sm:text-sm text-[#a1a1aa]">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={onBookDemo}
                  className={`w-full relative group/btn py-2.5 sm:py-3 rounded-xl font-medium text-sm text-white overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99] ${
                    plan.highlight ? "" : "border border-white/10 hover:border-white/20"
                  }`}
                >
                  {plan.highlight ? (
                    <div className="absolute inset-0 bg-gradient-to-r from-[#818cf8] to-[#c084fc] opacity-90 group-hover/btn:opacity-100 transition-opacity" />
                  ) : (
                    <div className="absolute inset-0 bg-white/[0.04] group-hover/btn:bg-white/[0.08] transition-colors" />
                  )}
                  <span className="relative z-10">
                    {plan.price === "定制" ? "联系销售" : "开始使用"}
                  </span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
