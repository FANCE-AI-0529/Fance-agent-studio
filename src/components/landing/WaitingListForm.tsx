import { useState } from "react";
import { supabase } from "../../integrations/supabase/client.ts";
import { toast } from "../../hooks/use-toast.ts";
import { motion, AnimatePresence } from "framer-motion";

interface WaitingListFormProps {
  source?: string;
  className?: string;
}

export function WaitingListForm({ source = "hero_cta", className = "" }: WaitingListFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({ title: "请输入有效的邮箱地址", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("waiting_list" as any)
      .insert({ email: trimmed, source } as any);

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast({ title: "该邮箱已在等候名单中 ✨", description: "我们会尽快联系您！" });
        setSubmitted(true);
      } else {
        toast({ title: "提交失败，请稍后重试", variant: "destructive" });
      }
      return;
    }

    setSubmitted(true);
    toast({ title: "🎉 已加入等候名单！", description: "我们会尽快向您发送邀请码。" });
  };

  return (
    <AnimatePresence mode="wait">
      {submitted ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`flex items-center justify-center gap-2 py-3 ${className}`}
        >
          <svg className="w-5 h-5 text-[#22d3ee]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm text-[#a1a1aa]">已加入等候名单，敬请期待 🚀</span>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          exit={{ opacity: 0, scale: 0.95 }}
          onSubmit={handleSubmit}
          className={`justify-center items-center gap-x-3 sm:flex ${className}`}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="输入你的邮箱"
            disabled={loading}
            className="w-full px-4 py-2.5 text-[#a1a1aa] bg-white/[0.06] border border-white/[0.08] focus:bg-white/[0.1] focus:border-[#22d3ee]/30 focus:shadow-[0_0_15px_rgba(34,211,238,0.15)] duration-150 outline-none rounded-lg shadow sm:max-w-sm sm:w-auto placeholder:text-[#71717a] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading}
            className="group relative flex items-center justify-center gap-x-2 py-2.5 px-5 mt-3 w-full text-sm text-white font-medium rounded-lg overflow-hidden sm:mt-0 sm:w-auto shadow-[0_0_25px_rgba(34,211,238,0.4),0_0_60px_rgba(129,140,248,0.2)] hover:shadow-[0_0_35px_rgba(34,211,238,0.6),0_0_80px_rgba(129,140,248,0.3)] transition-all hover:scale-[1.05] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#22d3ee] to-[#818cf8] opacity-90 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-[#818cf8] to-[#22d3ee]" />
            <span className="relative z-10">{loading ? "提交中..." : "获取内测邀请码"}</span>
            {!loading && (
              <svg className="relative z-10 w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2 10a.75.75 0 01.75-.75h12.59l-2.1-1.95a.75.75 0 111.02-1.1l3.5 3.25a.75.75 0 010 1.1l-3.5 3.25a.75.75 0 11-1.02-1.1l2.1-1.95H2.75A.75.75 0 012 10z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
