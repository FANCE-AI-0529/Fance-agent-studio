export function Footer() {
  return (
    <footer className="relative py-12 sm:py-20 px-4 sm:px-6 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:gap-6">
          <div className="text-center sm:text-left">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-1">HIVE</h3>
            <p className="text-xs sm:text-sm text-[#71717a]">
              下一代数字员工基础设施 · Powered by FANCE.AI
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-[#52525b]">
            <span>© {new Date().getFullYear()} HIVE Studio</span>
            <span className="hidden sm:inline">·</span>
            <a href="#" className="hover:text-[#a1a1aa] transition-colors">隐私政策</a>
            <span className="hidden sm:inline">·</span>
            <a href="#" className="hover:text-[#a1a1aa] transition-colors">服务条款</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
