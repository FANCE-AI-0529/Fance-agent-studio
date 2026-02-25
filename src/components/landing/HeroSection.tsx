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
    <section className="relative">
      {/* Gradient blur orb */}
      <div
        className="absolute inset-0 m-auto max-w-xs h-[357px] blur-[118px] sm:max-w-md md:max-w-lg pointer-events-none"
        style={{
          background:
            "linear-gradient(106.89deg, rgba(192,132,252,0.11) 15.73%, rgba(34,211,238,0.41) 15.74%, rgba(192,132,252,0.26) 56.49%, rgba(129,140,248,0.4) 115.91%)",
        }}
      />

      <div className="relative z-10 max-w-screen-xl mx-auto px-4 py-28 md:px-8">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="space-y-5 max-w-4xl mx-auto text-center"
        >
          {/* Status badge */}
          <motion.div variants={fadeUp} className="flex justify-center mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border border-[#22d3ee]/20 bg-[#22d3ee]/5">
              <span className="w-2 h-2 rounded-full bg-[#22d3ee] animate-pulse" />
              <span className="text-[10px] sm:text-xs font-mono text-[#22d3ee] tracking-wider">
                Kernel: NanoClaw | Engine: FANCE.AI
              </span>
            </div>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-extrabold tracking-tighter leading-[0.9]"
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
            className="max-w-2xl mx-auto text-[#a1a1aa] text-base sm:text-xl leading-relaxed"
          >
            基于 NanoClaw 容器级隔离与 MPLP 治理协议。
            <br className="hidden sm:block" />
            不是玩具，而是拥有<span className="text-white font-medium">绝对控制权</span>、
            可自我进化的新一代生产力基座。
          </motion.p>

          {/* Email form CTA */}
          <motion.form
            variants={fadeUp}
            onSubmit={(e) => {
              e.preventDefault();
              onBookDemo();
            }}
            className="justify-center items-center gap-x-3 sm:flex"
          >
            <input
              type="email"
              placeholder="输入你的邮箱"
              className="w-full px-4 py-2.5 text-[#a1a1aa] bg-white/[0.06] border border-white/[0.08] focus:bg-white/[0.1] focus:border-[#22d3ee]/30 focus:shadow-[0_0_15px_rgba(34,211,238,0.15)] duration-150 outline-none rounded-lg shadow sm:max-w-sm sm:w-auto placeholder:text-[#71717a]"
            />
            <button
              type="submit"
              className="group relative flex items-center justify-center gap-x-2 py-2.5 px-5 mt-3 w-full text-sm text-white font-medium rounded-lg overflow-hidden sm:mt-0 sm:w-auto shadow-[0_0_25px_rgba(34,211,238,0.4),0_0_60px_rgba(129,140,248,0.2)] hover:shadow-[0_0_35px_rgba(34,211,238,0.6),0_0_80px_rgba(129,140,248,0.3)] transition-all hover:scale-[1.05] active:scale-[0.97]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#22d3ee] to-[#818cf8] opacity-90 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-[#818cf8] to-[#22d3ee]" />
              <span className="relative z-10">获取内测邀请码</span>
              <svg className="relative z-10 w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2 10a.75.75 0 01.75-.75h12.59l-2.1-1.95a.75.75 0 111.02-1.1l3.5 3.25a.75.75 0 010 1.1l-3.5 3.25a.75.75 0 11-1.02-1.1l2.1-1.95H2.75A.75.75 0 012 10z" clipRule="evenodd" />
              </svg>
            </button>
          </motion.form>

          {/* Secondary link */}
          <motion.div variants={fadeUp}>
            <a
              href="#features"
              className="inline-block text-sm text-[#a1a1aa] hover:text-white transition-colors underline underline-offset-4 decoration-white/10 hover:decoration-[#22d3ee]/40"
            >
              查看技术白皮书 →
            </a>
          </motion.div>

          {/* Star rating social proof */}
          <motion.div variants={fadeUp} className="flex justify-center items-center gap-x-4 text-[#a1a1aa] text-sm">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-5 h-5 text-[#22d3ee]" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" />
                </svg>
              ))}
            </div>
            <p>
              <span className="text-white">5.0</span> · 超过 200 位用户信赖
            </p>
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
                <span className="text-[10px] sm:text-xs font-mono text-[#71717a] ml-2">fance-terminal</span>
              </div>
              {/* Terminal content */}
              <div className="p-3 sm:p-5 font-mono text-xs sm:text-sm leading-relaxed text-left overflow-x-auto">
                <p>
                  <span className="text-[#22d3ee]">➜</span>{" "}
                  <span className="text-[#a1a1aa]">~</span>{" "}
                  <span className="text-white">fance deploy --type "Audit Agent"</span>
                </p>
                <p className="text-[#71717a] mt-1">&gt; Initializing NanoClaw isolated container...</p>
                <p className="text-[#71717a]">&gt; Injecting FANCE.AI Cognitive Core...</p>
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
      </div>
    </section>
  );
}
