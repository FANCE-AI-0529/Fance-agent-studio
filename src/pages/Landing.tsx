/**
 * @file Landing.tsx
 * @description 产品着陆页 - Product Landing Page
 * @author Fance Studio
 * @copyright Copyright (c) 2025 Fance Studio. MIT License.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ParticleField } from "../components/landing/ParticleField.tsx";
import { GlassNavbar } from "../components/landing/GlassNavbar.tsx";
import { HeroSection } from "../components/landing/HeroSection.tsx";
import { WaitingListForm } from "../components/landing/WaitingListForm.tsx";
import { BentoFeatures } from "../components/landing/BentoFeatures.tsx";
import { DetailedFeatures } from "../components/landing/DetailedFeatures.tsx";
import { PricingSection } from "../components/landing/PricingSection.tsx";
import { TestimonialsSection } from "../components/landing/TestimonialsSection.tsx";
import { FAQSection } from "../components/landing/FAQSection.tsx";
import { InviteModal } from "../components/landing/InviteModal.tsx";
import { Footer } from "../components/landing/Footer.tsx";

export default function Landing() {
  const navigate = useNavigate();
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="relative min-h-screen" style={{ background: "linear-gradient(180deg, #050505 0%, #0a0e18 40%, #050505 100%)" }}>
      {/* 3D Holographic background */}
      <ParticleField />

      {/* Glass navigation */}
      <GlassNavbar
        onBookDemo={() => setShowInvite(true)}
        onLogin={() => navigate("/auth")}
      />

      {/* Hero */}
      <HeroSection />

      {/* Bento features */}
      <BentoFeatures />

      {/* Detailed features */}
      <DetailedFeatures />

      {/* Pricing */}
      <PricingSection onBookDemo={() => setShowInvite(true)} />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* FAQ */}
      <FAQSection />

      {/* CTA banner */}
      <section className="relative py-20 sm:py-32 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-xl p-8 sm:p-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-4">
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
            <p className="text-sm sm:text-base text-[#a1a1aa] mb-6 sm:mb-8 max-w-xl mx-auto px-2">
              申请内测资格，成为首批使用 FANCE 构建数字员工网络的先行者。
            </p>
            <WaitingListForm source="bottom_cta" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Invite modal */}
      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} />
    </div>
  );
}
