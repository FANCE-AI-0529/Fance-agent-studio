import { motion } from "framer-motion";

interface HeroSectionProps {
  onBookDemo: () => void;
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } },
};

export function HeroSection({ onBookDemo }: HeroSectionProps) {
  return (
    <section className="relative min-h-[100svh] flex items-center justify-center pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto text-center"
      >
        {/* Status badge */}
        <motion.div variants={fadeUp} className="flex justify-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border border-[#22d3ee]/20 bg-[#22d3ee]/5">
            <span className="w-2 h-2 rounded-full bg-[#22d3ee] animate-pulse" />
            <span className="text-[10px] sm:text-xs font-mono text-[#22d3ee] tracking-wider">
              SYSTEM KERNEL v2.0 ONLINE
            </span>
          </div>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          variants={fadeUp}
          className="text-4xl sm:text-6xl lg:text-8xl font-extrabold tracking-tighter leading-[0.9] mb-5 sm:mb-6"
        >
          <span className="block text-white/90">构建你的</span>
          <span
            className="block mt-1 sm:mt-2"
            style={{
              background: "linear-gradient(135deg, #22d3ee 0%, #818cf8 50%, #c084fc 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            数字劳动力网络
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={fadeUp}
          className="text-base sm:text-xl text-[#a1a1aa] max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2"
        >
          基于 NanoClaw 容器级隔离与 MPLP 治理协议。
          <br className="hidden sm:block" />
          不是玩具，而是拥有<span className="text-white font-medium">绝对控制权</span>、
          可自我进化的新一代生产力基座。
        </motion.p>

        {/* CTAs */}
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-2">
          <button
            onClick={onBookDemo}
            className="group relative w-full sm:w-auto px-8 py-3.5 sm:py-4 rounded-xl text-base font-semibold text-white overflow-hidden transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#22d3ee] to-[#818cf8]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#818cf8] to-[#22d3ee] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div
              className="absolute -inset-1 rounded-xl opacity-50 group-hover:opacity-80 transition-opacity duration-500 blur-xl"
              style={{ background: "linear-gradient(135deg, #22d3ee, #818cf8)" }}
            />
            <span className="relative z-10 flex items-center justify-center gap-2">
              获取内测邀请码
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>

          <a
            href="#features"
            className="w-full sm:w-auto text-center px-8 py-3.5 sm:py-4 rounded-xl text-base font-medium text-[#a1a1aa] border border-white/10 hover:border-[#22d3ee]/30 hover:text-white hover:bg-white/[0.03] transition-all"
          >
            查看技术白皮书
          </a>
        </motion.div>

        {/* Terminal preview */}
        <motion.div variants={fadeUp} className="mt-10 sm:mt-16 max-w-2xl mx-auto">
          <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/50">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-white/[0.06]">
              <div className="flex gap-1.5">
                <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#ff5f57]" />
                <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#febc2e]" />
                <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#28c840]" />
              </div>
              <span className="text-[10px] sm:text-xs font-mono text-[#71717a] ml-2">agent-os-terminal</span>
            </div>
            {/* Terminal content */}
            <div className="p-3 sm:p-5 font-mono text-xs sm:text-sm leading-relaxed text-left overflow-x-auto">
              <p>
                <span className="text-[#22d3ee]">➜</span>{" "}
                <span className="text-[#a1a1aa]">~</span>{" "}
                <span className="text-white">os deploy --type "Audit Agent"</span>
              </p>
              <p className="text-[#71717a] mt-1">&gt; Initializing NanoClaw isolated container...</p>
              <p className="text-[#71717a]">&gt; Mounting Skills: [code-review, risk-analysis]</p>
              <p className="text-[#71717a]">&gt; Applying MPLP governance policy...</p>
              <p className="mt-1">
                <span className="text-[#28c840]">&gt; [SUCCESS]</span>{" "}
                <span className="text-[#a1a1aa]">Agent deployed. Awaiting instructions.</span>
              </p>
              <p className="text-[#22d3ee] animate-pulse mt-1">█</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
