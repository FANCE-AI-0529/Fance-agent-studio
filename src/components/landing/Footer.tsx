export function Footer() {
  return (
    <footer className="relative py-20 px-6 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Agent OS</h3>
            <p className="text-sm text-[#71717a]">
              下一代数字员工基础设施
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm text-[#52525b]">
            <span>© {new Date().getFullYear()} Agent OS Studio</span>
            <span>·</span>
            <a href="#" className="hover:text-[#a1a1aa] transition-colors">隐私政策</a>
            <span>·</span>
            <a href="#" className="hover:text-[#a1a1aa] transition-colors">服务条款</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
