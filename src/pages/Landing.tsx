import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ParticleField } from "@/components/landing/ParticleField";
import { GlassNavbar } from "@/components/landing/GlassNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { BentoFeatures } from "@/components/landing/BentoFeatures";
import { DetailedFeatures } from "@/components/landing/DetailedFeatures";
import { InviteModal } from "@/components/landing/InviteModal";
import { Footer } from "@/components/landing/Footer";

export default function Landing() {
  const navigate = useNavigate();
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="relative min-h-screen" style={{ background: "linear-gradient(180deg, #050505 0%, #0b0f19 50%, #050505 100%)" }}>
      {/* 3D Particle background */}
      <ParticleField />

      {/* Glass navigation */}
      <GlassNavbar
        onBookDemo={() => setShowInvite(true)}
        onLogin={() => navigate("/auth")}
      />

      {/* Hero */}
      <HeroSection onBookDemo={() => setShowInvite(true)} />

      {/* Bento features */}
      <BentoFeatures />

      {/* Detailed features */}
      <DetailedFeatures />

      {/* CTA banner */}
      <section className="relative py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            准备好重新定义{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #22d3ee, #818cf8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              生产力
            </span>{" "}
            了吗？
          </h2>
          <p className="text-[#a1a1aa] mb-8 max-w-xl mx-auto">
            申请内测资格，成为首批使用 Agent OS 构建数字员工网络的先行者。
          </p>
          <button
            onClick={() => setShowInvite(true)}
            className="group relative inline-flex items-center gap-2 px-10 py-4 rounded-xl text-base font-semibold text-white overflow-hidden transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#22d3ee] to-[#818cf8]" />
            <div
              className="absolute -inset-1 rounded-xl opacity-40 group-hover:opacity-70 blur-xl transition-opacity"
              style={{ background: "linear-gradient(135deg, #22d3ee, #818cf8)" }}
            />
            <span className="relative z-10">申请早期访问</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Invite modal */}
      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} />
    </div>
  );
}
