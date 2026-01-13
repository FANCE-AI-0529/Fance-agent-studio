import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppModeStore } from "@/stores/appModeStore";

const terminalLines = [
  "$ initializing developer environment...",
  "$ loading studio modules...",
  "$ connecting to agent runtime...",
  "$ mounting canvas editor...",
  "$ enabling advanced features...",
  "$ ACCESS GRANTED",
];

const consumerLines = [
  "$ switching to consumer mode...",
  "$ unloading developer tools...",
  "$ entering magic interface...",
  "$ ready",
];

export function HackerTransition() {
  const { transitionDirection, isTransitioning } = useAppModeStore();
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [showGlitch, setShowGlitch] = useState(true);

  const lines = transitionDirection === 'to-studio' ? terminalLines : consumerLines;

  useEffect(() => {
    if (!isTransitioning) {
      setVisibleLines([]);
      return;
    }

    setShowGlitch(true);
    setTimeout(() => setShowGlitch(false), 300);

    let lineIndex = 0;
    const interval = setInterval(() => {
      if (lineIndex < lines.length) {
        setVisibleLines((prev) => [...prev, lines[lineIndex]]);
        lineIndex++;
      } else {
        clearInterval(interval);
      }
    }, 150);

    return () => {
      clearInterval(interval);
      setVisibleLines([]);
    };
  }, [isTransitioning, transitionDirection]);

  if (!isTransitioning) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background flex items-center justify-center"
      >
        {/* CRT scanlines effect */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--foreground) / 0.03) 2px, hsl(var(--foreground) / 0.03) 4px)',
          }}
        />

        {/* Glitch effect */}
        {showGlitch && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-primary/10"
          />
        )}

        {/* Terminal window */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-2xl mx-4"
        >
          {/* Terminal header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-card/80 backdrop-blur-sm rounded-t-lg border border-b-0 border-border">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <span className="text-xs text-muted-foreground font-mono ml-2">
              fance-os-terminal
            </span>
          </div>

          {/* Terminal body */}
          <div className="bg-background/95 backdrop-blur-sm border border-border rounded-b-lg p-6 min-h-[200px] font-mono text-sm">
            {visibleLines.map((line, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.1 }}
                className={`
                  ${line.includes('ACCESS GRANTED') || line.includes('ready') 
                    ? 'text-green-400 font-bold' 
                    : 'text-primary/80'
                  }
                  mb-1
                `}
              >
                {line}
                {index === visibleLines.length - 1 && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="ml-1"
                  >
                    █
                  </motion.span>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Progress indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full"
            />
            <span className="text-xs text-muted-foreground">
              {transitionDirection === 'to-studio' 
                ? '进入 Studio 模式...' 
                : '返回消费者模式...'
              }
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
