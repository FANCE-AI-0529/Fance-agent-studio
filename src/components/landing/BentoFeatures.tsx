import { motion, useMotionValue, useSpring } from "framer-motion";
import { useRef, MouseEvent as ReactMouseEvent } from "react";

/* ── Spotlight hover card ── */
function SpotlightCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const x = useSpring(mouseX, { stiffness: 200, damping: 30 });
  const y = useSpring(mouseY, { stiffness: 200, damping: 30 });

  function handleMouse(e: ReactMouseEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouse}
      className={`relative group overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a0a]/70 backdrop-blur-xl transition-colors hover:border-[#22d3ee]/30 ${className}`}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(400px circle at ${x.get()}px ${y.get()}px, rgba(34,211,238,0.06), transparent 60%)`,
        }}
      />
      {children}
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export function BentoFeatures() {
  return (
    <section id="features" className="relative py-16 sm:py-32 px-4 sm:px-6">
      {/* Glass backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-none rounded-none" />
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-10 sm:mb-16"
        >
          <span className="text-[10px] sm:text-xs font-mono text-[#22d3ee] tracking-[0.3em] uppercase mb-3 sm:mb-4 block">
            Core Architecture
          </span>
          <h2 className="text-2xl sm:text-5xl font-extrabold tracking-tight text-white">
            为生产环境而生的
            <span
              style={{
                background: "linear-gradient(135deg, #22d3ee, #818cf8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {" "}底层引擎
            </span>
          </h2>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Card A - Dual Mode (spans 2 cols on lg) */}
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="lg:col-span-2"
          >
            <SpotlightCard className="h-full p-5 sm:p-8">
              <div className="flex flex-col lg:flex-row gap-5 sm:gap-8">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#22d3ee]/10 border border-[#22d3ee]/20 mb-3 sm:mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee]" />
                    <span className="text-[10px] sm:text-xs font-mono text-[#22d3ee]">DUAL-MODE</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">Consumer × Studio 双模架构</h3>
                  <p className="text-sm text-[#a1a1aa] leading-relaxed mb-4 sm:mb-6">
                    <span className="text-white font-medium">Consumer 模式</span> 提供终端用户级的自然语言交互界面，支持语音输入、实时流式响应。
                    <span className="text-white font-medium"> Studio 模式</span> 则是工程师的可视化画布——拖拽节点、连接数据流、挂载技能包。
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {["可视化工作流", "拖拽编排", "实时预览", "版本快照"].map((tag) => (
                      <span key={tag} className="px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-mono rounded-md bg-white/5 border border-white/10 text-[#a1a1aa]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Visual element */}
                <div className="flex-shrink-0 w-full lg:w-64 h-36 sm:h-48 rounded-xl bg-gradient-to-br from-[#22d3ee]/10 to-[#818cf8]/10 border border-white/[0.06] flex items-center justify-center">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-4 mb-3">
                      <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg bg-[#22d3ee]/20 border border-[#22d3ee]/30 flex items-center justify-center">
                        <span className="text-[#22d3ee] text-base sm:text-lg">C</span>
                      </div>
                      <div className="text-[#71717a] text-xl sm:text-2xl">⇌</div>
                      <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg bg-[#818cf8]/20 border border-[#818cf8]/30 flex items-center justify-center">
                        <span className="text-[#818cf8] text-base sm:text-lg">S</span>
                      </div>
                    </div>
                    <p className="text-[10px] sm:text-xs font-mono text-[#71717a]">Mode Switch</p>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Card B - MPLP */}
          <motion.div
            custom={1}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <SpotlightCard className="h-full p-5 sm:p-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#818cf8]/10 border border-[#818cf8]/20 mb-3 sm:mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[#818cf8]" />
                <span className="text-[10px] sm:text-xs font-mono text-[#818cf8]">GOVERNANCE</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">MPLP 协议</h3>
              <p className="text-sm text-[#a1a1aa] leading-relaxed mb-4 sm:mb-6">
                多级权限准入协议。每个 Agent 在执行高风险操作前，必须经过策略引擎的实时拦截与人机确认。
              </p>
              <div className="space-y-2">
                {[
                  { label: "strict", desc: "全部拦截" },
                  { label: "confirm", desc: "人机确认" },
                  { label: "auto", desc: "自主执行" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <span className="font-mono text-xs text-[#818cf8] min-w-[52px] sm:min-w-[60px]">{item.label}</span>
                    <span className="text-xs text-[#71717a]">{item.desc}</span>
                  </div>
                ))}
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Card C - NanoClaw */}
          <motion.div
            custom={2}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <SpotlightCard className="h-full p-5 sm:p-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c084fc]/10 border border-[#c084fc]/20 mb-3 sm:mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c084fc]" />
                <span className="text-[10px] sm:text-xs font-mono text-[#c084fc]">SANDBOX</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">NanoClaw 沙箱引擎</h3>
              <p className="text-sm text-[#a1a1aa] leading-relaxed mb-4 sm:mb-6">
                每个 Agent 运行在独立的容器级隔离环境中。独立文件系统、独立进程空间、独立网络策略。
              </p>
              <div className="font-mono text-[10px] sm:text-xs text-[#71717a] space-y-1 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] overflow-x-auto">
                <p className="whitespace-nowrap"><span className="text-[#22d3ee]">├──</span> /skills/      <span className="text-[#a1a1aa]"># 已挂载技能</span></p>
                <p className="whitespace-nowrap"><span className="text-[#22d3ee]">├──</span> /memory/      <span className="text-[#a1a1aa]"># 持久化记忆</span></p>
                <p className="whitespace-nowrap"><span className="text-[#22d3ee]">├──</span> /state.yaml   <span className="text-[#a1a1aa]"># 运行状态</span></p>
                <p className="whitespace-nowrap"><span className="text-[#22d3ee]">└──</span> /lock         <span className="text-[#a1a1aa]"># 并发锁</span></p>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Card D - Skills (spans 2 cols on lg) */}
          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="lg:col-span-2"
          >
            <SpotlightCard className="h-full p-5 sm:p-8">
              <div className="flex flex-col lg:flex-row gap-5 sm:gap-8">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fbbf24]/10 border border-[#fbbf24]/20 mb-3 sm:mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
                    <span className="text-[10px] sm:text-xs font-mono text-[#fbbf24]">SKILLS ENGINE</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">可编程技能生态</h3>
                  <p className="text-sm text-[#a1a1aa] leading-relaxed mb-4 sm:mb-6">
                    技能是 Agent 能力的最小单元。每个技能包含 manifest.yaml 声明、handler 逻辑与版本控制。
                    支持从 Skill Foundry 一键安装，也支持自研定制。
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                    {[
                      { name: "Web Search", icon: "🔍" },
                      { name: "Code Review", icon: "🔬" },
                      { name: "Data Analysis", icon: "📊" },
                      { name: "RAG Pipeline", icon: "🧠" },
                    ].map((skill) => (
                      <div key={skill.name} className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <span className="text-sm">{skill.icon}</span>
                        <span className="text-[10px] sm:text-xs text-[#a1a1aa] font-mono truncate">{skill.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Stats */}
                <div className="flex-shrink-0 grid grid-cols-4 lg:grid-cols-2 gap-2 sm:gap-3">
                  {[
                    { value: "60+", label: "内置技能" },
                    { value: "<3s", label: "热装载" },
                    { value: "100%", label: "原子回滚" },
                    { value: "∞", label: "可扩展" },
                  ].map((stat) => (
                    <div key={stat.label} className="sm:w-24 h-20 sm:h-24 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col items-center justify-center">
                      <span className="text-lg sm:text-xl font-bold text-white">{stat.value}</span>
                      <span className="text-[9px] sm:text-[10px] font-mono text-[#71717a] mt-1">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Card E - Swarm */}
          <motion.div
            custom={4}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <SpotlightCard className="h-full p-5 sm:p-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#34d399]/10 border border-[#34d399]/20 mb-3 sm:mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
                <span className="text-[10px] sm:text-xs font-mono text-[#34d399]">SWARM</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">Agent 集群协作</h3>
              <p className="text-sm text-[#a1a1aa] leading-relaxed mb-4">
                多 Agent 之间通过 A2A 协议进行任务委派、上下文透传与结果汇聚。
                支持链式编排、并行扇出与熔断保护。
              </p>
              <div className="flex items-center justify-center py-4">
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#22d3ee]/20 to-[#818cf8]/20 border border-white/10 flex items-center justify-center">
                        <span className="text-xs font-mono text-[#22d3ee]">A{i}</span>
                      </div>
                      {i < 3 && (
                        <div className="absolute top-1/2 -right-2 w-4 h-px bg-gradient-to-r from-[#22d3ee]/40 to-transparent" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </SpotlightCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
