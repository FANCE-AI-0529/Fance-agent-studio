import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ParticleField } from "@/components/landing/ParticleField";
import { GlassNavbar } from "@/components/landing/GlassNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { InviteSection } from "@/components/landing/InviteSection";
import { InviteModal } from "@/components/landing/InviteModal";
import { Footer } from "@/components/landing/Footer";

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
      <HeroSection onBookDemo={() => setShowInvite(true)} />

      {/* Inline invite code section */}
      <InviteSection onProceed={() => setShowInvite(true)} />

      {/* Footer */}
      <Footer />

      {/* Invite modal */}
      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} />
    </div>
  );
}
