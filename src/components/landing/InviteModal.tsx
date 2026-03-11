import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Ticket, Mail, Lock, User, Loader2, CheckCircle2, XCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useInviteValidation, acceptInvitationOnSignup } from "../../hooks/useInviteValidation.ts";
import { useAuth } from "../../contexts/AuthContext.tsx";
import { toast } from "../../hooks/use-toast.ts";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../integrations/supabase/client.ts";
import { z } from "zod";

const emailSchema = z.string().email("请输入有效的邮箱地址");
const strongPasswordSchema = z
  .string()
  .min(8, "密码至少8个字符")
  .regex(/[A-Z]/, "需要大写字母")
  .regex(/[a-z]/, "需要小写字母")
  .regex(/[0-9]/, "需要数字")
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "需要特殊字符");

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = "invite" | "register";

export function InviteModal({ open, onClose }: InviteModalProps) {
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();

  // Step management
  const [step, setStep] = useState<Step>("invite");
  const [loading, setLoading] = useState(false);

  // Invite step
  const [inviteCode, setInviteCode] = useState("");
  const { isValid, isLoading: isValidating, error: inviteError, invitationId } = useInviteValidation(inviteCode);

  // Register step
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Login sub-mode
  const [isLoginMode, setIsLoginMode] = useState(false);

  const handleProceedToRegister = () => {
    if (!isValid) return;
    setStep("register");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(email);
      if (!isLoginMode) strongPasswordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({ title: "输入错误", description: err.errors[0].message, variant: "destructive" });
        return;
      }
    }

    setLoading(true);

    if (isLoginMode) {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        toast({ title: "登录失败", description: error.message.includes("Invalid") ? "邮箱或密码错误" : error.message, variant: "destructive" });
        return;
      }
      onClose();
      navigate("/");
      return;
    }

    // Signup flow
    const { error } = await signUp(email, password, displayName);
    if (error) {
      setLoading(false);
      toast({ title: "注册失败", description: error.message.includes("already") ? "该邮箱已被注册" : error.message, variant: "destructive" });
      return;
    }

    // Claim invite
    const { data: { user: newUser } } = await supabase.auth.getUser();
    if (newUser && invitationId) {
      await acceptInvitationOnSignup(invitationId, newUser.id);
    }
    setLoading(false);
    toast({ title: "注册成功", description: "欢迎加入 FANCE！" });
    onClose();
    navigate("/");
  };

  const resetAndClose = () => {
    setStep("invite");
    setInviteCode("");
    setEmail("");
    setPassword("");
    setDisplayName("");
    setIsLoginMode(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetAndClose}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0c0c0f]/95 backdrop-blur-2xl shadow-2xl shadow-black/60 overflow-hidden">
              {/* Glow accent */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/50 to-transparent" />

              {/* Close */}
              <button onClick={resetAndClose} className="absolute top-4 right-4 text-[#71717a] hover:text-white z-10">
                <X className="w-5 h-5" />
              </button>

              <div className="p-8">
                {/* Step 1: Invite Code */}
                {step === "invite" && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#22d3ee]/20 to-[#818cf8]/20 border border-white/10 flex items-center justify-center">
                        <Ticket className="w-5 h-5 text-[#22d3ee]" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">系统准入授权</h2>
                      </div>
                    </div>
                    <p className="text-sm text-[#71717a] mb-6 ml-[52px]">
                      请输入您的内测邀请码以访问 FANCE 控制台。
                    </p>

                    <div className="space-y-4">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="输入邀请码"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-[#52525b] font-mono text-center text-lg tracking-[0.3em] uppercase focus:outline-none focus:border-[#22d3ee]/40 focus:ring-1 focus:ring-[#22d3ee]/20 transition-all"
                          autoFocus
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
                        onClick={handleProceedToRegister}
                        disabled={!isValid || isValidating}
                        className="w-full relative group py-3 rounded-xl font-medium text-white overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#22d3ee] to-[#818cf8] opacity-90 group-hover:opacity-100 transition-opacity" />
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          验证并继续
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </button>

                      <p className="text-center text-xs text-[#52525b]">
                        已有账号？{" "}
                        <button
                          onClick={() => { setStep("register"); setIsLoginMode(true); }}
                          className="text-[#22d3ee] hover:underline"
                        >
                          直接登录
                        </button>
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Register / Login */}
                {step === "register" && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#818cf8]/20 to-[#c084fc]/20 border border-white/10 flex items-center justify-center">
                        {isLoginMode ? (
                          <Lock className="w-5 h-5 text-[#818cf8]" />
                        ) : (
                          <User className="w-5 h-5 text-[#818cf8]" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">
                          {isLoginMode ? "登录 FANCE" : "创建您的账户"}
                        </h2>
                        <p className="text-xs text-[#71717a]">
                          {isLoginMode ? "使用已有账户登录" : "一步完成注册，立即进入控制台"}
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Display name (signup only) */}
                      {!isLoginMode && (
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
                          <input
                            type="text"
                            placeholder="昵称（选填）"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-[#52525b] text-sm focus:outline-none focus:border-[#818cf8]/40 focus:ring-1 focus:ring-[#818cf8]/20 transition-all"
                          />
                        </div>
                      )}

                      {/* Email */}
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
                        <input
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-[#52525b] text-sm focus:outline-none focus:border-[#818cf8]/40 focus:ring-1 focus:ring-[#818cf8]/20 transition-all"
                        />
                      </div>

                      {/* Password */}
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
                        <input
                          type={showPw ? "text" : "password"}
                          placeholder={isLoginMode ? "密码" : "设置密码（大小写+数字+特殊字符）"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-[#52525b] text-sm focus:outline-none focus:border-[#818cf8]/40 focus:ring-1 focus:ring-[#818cf8]/20 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#a1a1aa]"
                        >
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full relative group py-3 rounded-xl font-medium text-white overflow-hidden disabled:opacity-60 transition-all hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#818cf8] to-[#c084fc] opacity-90 group-hover:opacity-100 transition-opacity" />
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              {isLoginMode ? "登录" : "创建账户并进入"}
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </span>
                      </button>

                      {/* Toggle mode */}
                      <p className="text-center text-xs text-[#52525b]">
                        {isLoginMode ? "还没有账号？" : "已有账号？"}{" "}
                        <button
                          type="button"
                          onClick={() => setIsLoginMode(!isLoginMode)}
                          className="text-[#818cf8] hover:underline"
                        >
                          {isLoginMode ? "立即注册" : "直接登录"}
                        </button>
                        {!isLoginMode && (
                          <>
                            {" · "}
                            <button
                              type="button"
                              onClick={() => { setStep("invite"); setIsLoginMode(false); }}
                              className="text-[#71717a] hover:text-[#a1a1aa]"
                            >
                              返回
                            </button>
                          </>
                        )}
                      </p>
                    </form>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
