import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import logoFull from "@/assets/logo-full.png";

interface GlassNavbarProps {
  onBookDemo: () => void;
  onLogin: () => void;
}

export function GlassNavbar({ onBookDemo, onLogin }: GlassNavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-300",
          scrolled ? "py-2" : "py-3 sm:py-4"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div
            className={cn(
              "flex items-center justify-between rounded-2xl px-4 sm:px-6 py-2.5 sm:py-3 transition-all duration-300",
              "backdrop-blur-xl border",
              scrolled
                ? "bg-[#0a0a0a]/80 border-[#22d3ee]/10 shadow-[0_0_30px_rgba(34,211,238,0.05)]"
                : "bg-transparent border-white/[0.04]"
            )}
          >
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src={logoFull} alt="Agent OS" className="h-6 sm:h-7 brightness-0 invert" />
            </div>

            {/* Nav links - hidden on mobile */}
            <div className="hidden md:flex items-center gap-8">
              {["平台架构", "MPLP 协议", "技术文档"].map((item) => (
                <a
                  key={item}
                  href="#features"
                  className="text-sm text-[#a1a1aa] hover:text-[#22d3ee] transition-colors font-mono tracking-wide"
                >
                  {item}
                </a>
              ))}
            </div>

            {/* Desktop CTAs */}
            <div className="hidden sm:flex items-center gap-3">
              <button
                onClick={onLogin}
                className="text-sm text-[#a1a1aa] hover:text-white transition-colors"
              >
                Login
              </button>
              <button
                onClick={onBookDemo}
                className="relative group px-5 py-2 text-sm font-medium text-white rounded-lg overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#22d3ee] to-[#818cf8] opacity-90 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-[#818cf8] to-[#22d3ee]" />
                <span className="relative z-10">Book a Demo</span>
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="sm:hidden text-[#a1a1aa] hover:text-white p-1"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-[60px] inset-x-0 z-40 sm:hidden px-4 pt-2"
          >
            <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/95 backdrop-blur-2xl p-5 space-y-4">
              {["平台架构", "MPLP 协议", "技术文档"].map((item) => (
                <a
                  key={item}
                  href="#features"
                  onClick={() => setMobileOpen(false)}
                  className="block text-sm text-[#a1a1aa] hover:text-[#22d3ee] transition-colors font-mono tracking-wide py-2 border-b border-white/[0.04] last:border-0"
                >
                  {item}
                </a>
              ))}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { onLogin(); setMobileOpen(false); }}
                  className="flex-1 text-sm text-[#a1a1aa] py-2.5 rounded-xl border border-white/10 hover:text-white transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => { onBookDemo(); setMobileOpen(false); }}
                  className="flex-1 relative group py-2.5 text-sm font-medium text-white rounded-xl overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#22d3ee] to-[#818cf8]" />
                  <span className="relative z-10">Book a Demo</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
