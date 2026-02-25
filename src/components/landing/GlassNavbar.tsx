import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import logoFull from "@/assets/logo-full.png";

interface GlassNavbarProps {
  onBookDemo: () => void;
  onLogin: () => void;
}

const navItems = [
  { title: "平台架构", href: "#features" },
  { title: "MPLP 协议", href: "#features" },
];

export function GlassNavbar({ onBookDemo, onLogin }: GlassNavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const Brand = () => (
    <div className="flex items-center justify-between py-5 md:block">
      <a href="#" className="flex items-center gap-2">
        <img src={logoFull} alt="FANCE" className="h-8 sm:h-9 rounded-lg object-cover" />
        <span className="text-white font-bold text-xl tracking-[0.3em] uppercase" style={{ fontFamily: "'Orbitron', 'Rajdhani', 'Share Tech Mono', monospace" }}>FANCE</span>
      </a>
      <div className="md:hidden">
        <button
          className="menu-btn text-[#a1a1aa] hover:text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled
          ? "backdrop-blur-xl bg-[#0a0a0a]/80 border-b border-[#22d3ee]/15 shadow-[0_1px_15px_rgba(34,211,238,0.08)]"
          : "bg-transparent"
      )}
    >
      {/* Mobile brand bar when menu is open */}
      <div className={`md:hidden ${mobileOpen ? "mx-2 pb-5" : "hidden"}`}>
        <Brand />
      </div>

      <nav
        className={cn(
          "pb-5 md:text-sm",
          mobileOpen
            ? "absolute z-20 top-0 inset-x-0 bg-[#0a0a0a]/95 backdrop-blur-2xl rounded-xl mx-2 mt-2 border border-white/[0.08] md:mx-0 md:mt-0 md:relative md:bg-transparent md:border-0 md:backdrop-blur-none"
            : ""
        )}
      >
        <div className="gap-x-14 items-center max-w-screen-xl mx-auto px-4 md:flex md:px-8">
          <Brand />
          <div className={`flex-1 items-center mt-8 md:mt-0 md:flex ${mobileOpen ? "block" : "hidden"}`}>
            <ul className="flex-1 justify-end items-center space-y-6 md:flex md:space-x-6 md:space-y-0">
              {navItems.map((item) => (
                <li key={item.title}>
                  <a
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block text-sm text-[#a1a1aa] hover:text-[#22d3ee] transition-colors font-mono tracking-wide"
                  >
                    {item.title}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#features"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-mono text-[#a1a1aa] border border-white/10 rounded-lg hover:border-[#22d3ee]/30 hover:text-[#22d3ee] transition-all md:w-auto"
                >
                  开发者文档
                </a>
              </li>
              <li>
                <button
                  onClick={() => { onLogin(); setMobileOpen(false); }}
                  className="block w-full text-left text-sm text-[#a1a1aa] hover:text-white transition-colors md:w-auto"
                >
                  Login
                </button>
              </li>
              <li>
                <button
                  onClick={() => { onBookDemo(); setMobileOpen(false); }}
                  className="flex items-center justify-center gap-x-1 py-2 px-5 text-sm text-white font-medium rounded-full overflow-hidden relative group w-full md:inline-flex md:w-auto"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#22d3ee] to-[#818cf8] opacity-90 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-[#818cf8] to-[#22d3ee]" />
                  <span className="relative z-10">Book a Demo</span>
                  <svg className="relative z-10 w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </motion.header>
  );
}
