import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "FANCE 让我们的客服团队效率提升了 3 倍。MPLP 协议确保每个 AI 回复都在合规范围内，再也不用担心 AI 幻觉带来的风险。",
    author: "陈思远",
    role: "CTO",
    company: "智联科技",
    avatar: "C",
    color: "#22d3ee",
  },
  {
    quote: "Studio 的可视化工作流引擎太惊艳了。以前需要 3 个工程师一周才能搭建的自动化流程，现在我一个人半天就完成了。",
    author: "林嘉怡",
    role: "AI 产品负责人",
    company: "锐思资本",
    avatar: "L",
    color: "#818cf8",
  },
  {
    quote: "NanoClaw 沙箱隔离给了我们极大的安全信心。每个 Agent 都运行在独立环境中，这对金融行业来说至关重要。",
    author: "王浩然",
    role: "信息安全总监",
    company: "恒信银行",
    avatar: "W",
    color: "#c084fc",
  },
  {
    quote: "从 POC 到生产只用了两周。Agent Swarm 的多 Agent 协作让我们的数据分析管线实现了真正的自动化。",
    author: "张文静",
    role: "数据工程 VP",
    company: "星辰数据",
    avatar: "Z",
    color: "#34d399",
  },
  {
    quote: "API Hub 的一键发布功能让我们的内部工具迅速开放为 SaaS 服务。从内部工具到收入来源，转变只在一键之间。",
    author: "刘明轩",
    role: "技术合伙人",
    company: "云帆创投",
    avatar: "L",
    color: "#fbbf24",
  },
  {
    quote: "知识库的 RAG 检索质量远超预期。上传内部文档后，Agent 的回答准确率从 60% 提升到了 95%。",
    author: "赵婉清",
    role: "运营总监",
    company: "优客教育",
    avatar: "Z",
    color: "#22d3ee",
  },
];

export function TestimonialsSection() {
  return (
    <section className="relative py-16 sm:py-32 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-10 sm:mb-16"
        >
          <span className="text-[10px] sm:text-xs font-mono text-[#c084fc] tracking-[0.3em] uppercase mb-3 block">
            Trusted By Builders
          </span>
          <h2 className="text-2xl sm:text-5xl font-extrabold tracking-tight text-white">
            他们正在用 FANCE
            <span
              style={{
                background: "linear-gradient(135deg, #c084fc, #22d3ee)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {" "}重塑生产力
            </span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6 }}
              className="group p-5 sm:p-6 rounded-2xl border border-white/[0.06] bg-[#0a0a0a]/50 backdrop-blur-sm hover:border-white/10 transition-all"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, si) => (
                  <Star key={si} className="w-3.5 h-3.5 fill-[#fbbf24] text-[#fbbf24]" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-xs sm:text-sm text-[#a1a1aa] leading-relaxed mb-4 sm:mb-5">
                "{t.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border"
                  style={{
                    borderColor: `${t.color}40`,
                    backgroundColor: `${t.color}15`,
                    color: t.color,
                  }}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{t.author}</p>
                  <p className="text-[10px] sm:text-xs text-[#71717a]">
                    {t.role}，{t.company}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
