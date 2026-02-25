import { useState } from "react";
import { motion } from "framer-motion";
import { Ticket, Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { useInviteValidation } from "@/hooks/useInviteValidation";

interface InviteSectionProps {
  onProceed: () => void;
}

export function InviteSection({ onProceed }: InviteSectionProps) {
  const [inviteCode, setInviteCode] = useState("");
  const { isValid, isLoading: isValidating, error: inviteError } = useInviteValidation(inviteCode);

  return (
    <section className="relative py-20 sm:py-32 px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md mx-auto"
      >
        <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0a]/60 backdrop-blur-xl p-8 shadow-2xl shadow-black/40 relative overflow-hidden">
          {/* Top glow accent */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/40 to-transparent" />

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#22d3ee]/20 to-[#818cf8]/20 border border-white/10 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-[#22d3ee]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">系统准入授权</h2>
            </div>
          </div>
          <p className="text-sm text-[#71717a] mb-6 ml-[52px]">
            请输入您的内测邀请码以访问 Agent OS Studio 控制台。
          </p>

          {/* Invite code input */}
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="输入邀请码"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-[#52525b] font-mono text-center text-lg tracking-[0.3em] uppercase focus:outline-none focus:border-[#22d3ee]/40 focus:ring-1 focus:ring-[#22d3ee]/20 transition-all"
              />
              {inviteCode.length >= 4 && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {isValidating ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[#71717a]" />
                  ) : isValid ? (
                    <CheckCircle2 className="w-5 h-5 text-[#34d399]" />
                  ) : (
                    <XCircle className="w-5 h-5 text-[#ef4444]" />
                  )}
                </div>
              )}
            </div>

            {inviteCode.length >= 4 && !isValidating && (
              <p className={`text-xs text-center ${isValid ? "text-[#34d399]" : "text-[#ef4444]"}`}>
                {isValid ? "✓ 邀请码有效，请继续" : inviteError}
              </p>
            )}

            <button
              onClick={onProceed}
              disabled={!isValid || isValidating}
              className="w-full relative group py-3 rounded-xl font-medium text-white overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#22d3ee] to-[#818cf8] opacity-90 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                验证并进入系统
                <ArrowRight className="w-4 h-4" />
              </span>
            </button>

            <p className="text-center text-xs text-[#52525b]">
              尚未获得邀请？{" "}
              <button
                onClick={onProceed}
                className="text-[#22d3ee] hover:underline"
              >
                申请早期访问权限
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
