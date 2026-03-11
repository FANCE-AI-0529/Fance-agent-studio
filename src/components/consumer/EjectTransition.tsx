import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppModeStore, EjectContext } from '../../stores/appModeStore.ts';
import { Cog, Code2, Cpu, Zap } from 'lucide-react';

interface EjectTransitionProps {
  context?: EjectContext | null;
}

export function EjectTransition({ context }: EjectTransitionProps) {
  const { isTransitioning, transitionDirection } = useAppModeStore();
  const [phase, setPhase] = useState<'vibrate' | 'split' | 'reveal' | 'done'>('vibrate');

  useEffect(() => {
    if (!isTransitioning) {
      setPhase('vibrate');
      return;
    }

    // Phase 1: Vibrate (0-300ms)
    setPhase('vibrate');
    
    // Phase 2: Split (300-800ms)
    const splitTimer = setTimeout(() => setPhase('split'), 300);
    
    // Phase 3: Reveal (800-1200ms)
    const revealTimer = setTimeout(() => setPhase('reveal'), 800);
    
    // Phase 4: Done (1200ms+)
    const doneTimer = setTimeout(() => setPhase('done'), 1200);

    return () => {
      clearTimeout(splitTimer);
      clearTimeout(revealTimer);
      clearTimeout(doneTimer);
    };
  }, [isTransitioning]);

  if (!isTransitioning) return null;

  const isEjecting = transitionDirection === 'to-studio';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] overflow-hidden"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Background layer - Studio preview */}
        <motion.div 
          className="absolute inset-0 bg-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === 'reveal' || phase === 'done' ? 1 : 0.3 }}
          transition={{ duration: 0.4 }}
        >
          {/* Simulated code/node grid background */}
          <div className="absolute inset-0 opacity-20">
            <div 
              className="w-full h-full"
              style={{
                backgroundImage: `
                  linear-gradient(hsl(var(--primary) / 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, hsl(var(--primary) / 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
              }}
            />
          </div>
          
          {/* Floating gear icons */}
          <div className="absolute inset-0 flex items-center justify-center gap-8 opacity-30">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            >
              <Cog className="w-24 h-24 text-primary" />
            </motion.div>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            >
              <Cog className="w-16 h-16 text-primary" />
            </motion.div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            >
              <Cog className="w-20 h-20 text-primary" />
            </motion.div>
          </div>
        </motion.div>

        {/* Left panel - slides out */}
        <motion.div
          className="absolute top-0 left-0 w-1/2 h-full bg-card border-r border-border/50 shadow-2xl"
          initial={{ x: 0 }}
          animate={{
            x: phase === 'split' || phase === 'reveal' || phase === 'done' 
              ? (isEjecting ? '-100%' : 0) 
              : 0,
            filter: phase === 'vibrate' ? 'blur(0px)' : 'blur(0px)',
          }}
          transition={{ 
            duration: 0.5, 
            ease: [0.4, 0, 0.2, 1],
          }}
          style={{
            animation: phase === 'vibrate' ? 'eject-vibrate 0.1s ease-in-out infinite' : 'none',
          }}
        >
          {/* Panel content - fake UI elements */}
          <div className="h-full flex flex-col items-end justify-center pr-8 opacity-50">
            <div className="space-y-3">
              <div className="w-48 h-3 bg-muted rounded animate-pulse" />
              <div className="w-36 h-3 bg-muted rounded animate-pulse" />
              <div className="w-40 h-3 bg-muted rounded animate-pulse" />
            </div>
          </div>
          
          {/* Edge glow effect */}
          <motion.div
            className="absolute top-0 right-0 w-2 h-full"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: phase === 'split' ? 1 : 0,
              boxShadow: phase === 'split' 
                ? '0 0 30px 10px hsl(var(--primary) / 0.5)' 
                : 'none',
            }}
            style={{ background: 'linear-gradient(to left, hsl(var(--primary) / 0.8), transparent)' }}
          />
        </motion.div>

        {/* Right panel - slides out */}
        <motion.div
          className="absolute top-0 right-0 w-1/2 h-full bg-card border-l border-border/50 shadow-2xl"
          initial={{ x: 0 }}
          animate={{
            x: phase === 'split' || phase === 'reveal' || phase === 'done' 
              ? (isEjecting ? '100%' : 0) 
              : 0,
          }}
          transition={{ 
            duration: 0.5, 
            ease: [0.4, 0, 0.2, 1],
          }}
          style={{
            animation: phase === 'vibrate' ? 'eject-vibrate 0.1s ease-in-out infinite' : 'none',
          }}
        >
          {/* Panel content - fake UI elements */}
          <div className="h-full flex flex-col items-start justify-center pl-8 opacity-50">
            <div className="space-y-3">
              <div className="w-48 h-3 bg-muted rounded animate-pulse" />
              <div className="w-36 h-3 bg-muted rounded animate-pulse" />
              <div className="w-40 h-3 bg-muted rounded animate-pulse" />
            </div>
          </div>
          
          {/* Edge glow effect */}
          <motion.div
            className="absolute top-0 left-0 w-2 h-full"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: phase === 'split' ? 1 : 0,
            }}
            style={{ background: 'linear-gradient(to right, hsl(var(--primary) / 0.8), transparent)' }}
          />
        </motion.div>

        {/* Center crack line */}
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full"
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{
            opacity: phase === 'split' ? 1 : 0,
            scaleY: phase === 'split' ? 1 : 0,
            boxShadow: phase === 'split' 
              ? '0 0 40px 15px hsl(var(--primary))' 
              : 'none',
          }}
          transition={{ duration: 0.3 }}
          style={{ 
            background: 'hsl(var(--primary))',
            transformOrigin: 'center',
          }}
        />

        {/* Center icons during transition */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: phase === 'reveal' ? 1 : 0,
            scale: phase === 'reveal' ? 1 : 0.5,
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="p-4 rounded-xl bg-primary/10 border border-primary/30"
            >
              <Cpu className="w-8 h-8 text-primary" />
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Zap className="w-6 h-6 text-primary animate-pulse" />
            </motion.div>
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="p-4 rounded-xl bg-primary/10 border border-primary/30"
            >
              <Code2 className="w-8 h-8 text-primary" />
            </motion.div>
          </div>
        </motion.div>

        {/* Status text */}
        <motion.div
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: phase === 'split' || phase === 'reveal' ? 1 : 0,
            y: phase === 'split' || phase === 'reveal' ? 0 : 20,
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-card/80 backdrop-blur-sm border border-border/50">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Cog className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="text-sm font-medium text-foreground">
              {isEjecting ? '正在打开工作室...' : '正在返回对话界面...'}
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Add keyframe animation for vibration */}
      <style>{`
        @keyframes eject-vibrate {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
      `}</style>
    </AnimatePresence>
  );
}