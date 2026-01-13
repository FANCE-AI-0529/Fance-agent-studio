import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface AuroraBackgroundProps {
  children?: React.ReactNode;
}

export function AuroraBackground({ children }: AuroraBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const { clientX, clientY } = e;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const x = (clientX / width - 0.5) * 20;
      const y = (clientY / height - 0.5) * 20;
      containerRef.current.style.setProperty('--mouse-x', `${x}px`);
      containerRef.current.style.setProperty('--mouse-y', `${y}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative min-h-screen w-full overflow-hidden bg-background"
      style={{ '--mouse-x': '0px', '--mouse-y': '0px' } as React.CSSProperties}
    >
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background/95" />
      
      {/* Aurora layers */}
      <motion.div
        className="absolute inset-0 opacity-30"
        animate={{
          background: [
            'radial-gradient(ellipse 80% 50% at 20% 40%, hsl(var(--primary) / 0.3) 0%, transparent 50%)',
            'radial-gradient(ellipse 80% 50% at 80% 60%, hsl(var(--primary) / 0.3) 0%, transparent 50%)',
            'radial-gradient(ellipse 80% 50% at 40% 30%, hsl(var(--primary) / 0.3) 0%, transparent 50%)',
            'radial-gradient(ellipse 80% 50% at 20% 40%, hsl(var(--primary) / 0.3) 0%, transparent 50%)',
          ],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{
          background: [
            'radial-gradient(ellipse 60% 40% at 70% 20%, hsl(265 89% 78% / 0.4) 0%, transparent 50%)',
            'radial-gradient(ellipse 60% 40% at 30% 80%, hsl(265 89% 78% / 0.4) 0%, transparent 50%)',
            'radial-gradient(ellipse 60% 40% at 60% 50%, hsl(265 89% 78% / 0.4) 0%, transparent 50%)',
            'radial-gradient(ellipse 60% 40% at 70% 20%, hsl(265 89% 78% / 0.4) 0%, transparent 50%)',
          ],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Subtle stars/particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-0.5 rounded-full bg-foreground/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.1, 0.5, 0.1],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Mouse follow glow */}
      <div 
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none opacity-10"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
          left: '50%',
          top: '50%',
          transform: 'translate(calc(-50% + var(--mouse-x)), calc(-50% + var(--mouse-y)))',
          transition: 'transform 0.3s ease-out',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
