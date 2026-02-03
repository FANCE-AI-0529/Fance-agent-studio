import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppModeStore } from "@/stores/appModeStore";

/**
 * Enhanced Hacker Transition Animation
 * 增强版黑客终端过渡动画 - OPT-06
 */

const terminalLines = [
  { text: "$ initializing developer environment...", delay: 0 },
  { text: "$ loading studio modules...", delay: 100 },
  { text: "$ connecting to agent runtime...", delay: 180 },
  { text: "$ mounting canvas editor...", delay: 260 },
  { text: "$ enabling advanced features...", delay: 340 },
  { text: "$ ACCESS GRANTED", delay: 450, highlight: true },
];

const consumerLines = [
  { text: "$ switching to consumer mode...", delay: 0 },
  { text: "$ unloading developer tools...", delay: 120 },
  { text: "$ entering magic interface...", delay: 220 },
  { text: "$ ready", delay: 320, highlight: true },
];

// Matrix-style falling characters
const matrixChars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789";

function MatrixRain() {
  const columns = useMemo(() => {
    const cols = [];
    for (let i = 0; i < 30; i++) {
      cols.push({
        x: (i / 30) * 100,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 2,
        chars: Array.from({ length: 10 }, () => 
          matrixChars[Math.floor(Math.random() * matrixChars.length)]
        ),
      });
    }
    return cols;
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      {columns.map((col, i) => (
        <motion.div
          key={i}
          className="absolute top-0 text-primary font-mono text-xs"
          style={{ left: `${col.x}%` }}
          initial={{ y: -200, opacity: 0 }}
          animate={{ y: '100vh', opacity: [0, 1, 1, 0] }}
          transition={{
            duration: col.duration,
            delay: col.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {col.chars.map((char, j) => (
            <div key={j} style={{ opacity: 1 - j * 0.1 }}>{char}</div>
          ))}
        </motion.div>
      ))}
    </div>
  );
}

export function HackerTransition() {
  const { transitionDirection, isTransitioning } = useAppModeStore();
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [showGlitch, setShowGlitch] = useState(true);
  const [progress, setProgress] = useState(0);

  const lines = transitionDirection === 'to-studio' ? terminalLines : consumerLines;

  useEffect(() => {
    if (!isTransitioning) {
      setVisibleLines([]);
      setProgress(0);
      return;
    }

    setShowGlitch(true);
    setTimeout(() => setShowGlitch(false), 200);

    // Progressive line reveal with smooth timing
    lines.forEach((line, index) => {
      setTimeout(() => {
        setVisibleLines((prev) => [...prev, index]);
        setProgress(((index + 1) / lines.length) * 100);
      }, line.delay);
    });

    return () => {
      setVisibleLines([]);
      setProgress(0);
    };
  }, [isTransitioning, transitionDirection, lines]);

  if (!isTransitioning) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background flex items-center justify-center overflow-hidden"
      >
        {/* Matrix rain effect */}
        <MatrixRain />

        {/* CRT scanlines effect */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.02]"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--foreground) / 0.03) 2px, hsl(var(--foreground) / 0.03) 4px)',
          }}
        />

        {/* Glitch effect */}
        <AnimatePresence>
          {showGlitch && (
            <motion.div
              initial={{ opacity: 1, scaleX: 1 }}
              animate={{ opacity: 0, scaleX: 1.02 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-primary/10"
              style={{
                clipPath: 'polygon(0 20%, 100% 22%, 100% 25%, 0 23%)',
              }}
            />
          )}
        </AnimatePresence>

        {/* Terminal window */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full max-w-2xl mx-4"
        >
          {/* Terminal header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-card/80 backdrop-blur-sm rounded-t-xl border border-b-0 border-border">
            <div className="flex gap-1.5">
              <motion.div 
                className="w-3 h-3 rounded-full bg-red-500/80"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div 
                className="w-3 h-3 rounded-full bg-yellow-500/80"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div 
                className="w-3 h-3 rounded-full bg-green-500/80"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-mono ml-2">
              fance-os-terminal
            </span>
            <div className="flex-1" />
            <span className="text-[10px] text-muted-foreground font-mono">
              {transitionDirection === 'to-studio' ? 'DEV_MODE' : 'USER_MODE'}
            </span>
          </div>

          {/* Terminal body */}
          <div className="bg-background/95 backdrop-blur-sm border border-border rounded-b-xl p-6 min-h-[200px] font-mono text-sm relative overflow-hidden">
            {/* Animated background gradient */}
            <motion.div
              className="absolute inset-0 opacity-5"
              animate={{
                background: [
                  'radial-gradient(circle at 0% 0%, hsl(var(--primary)) 0%, transparent 50%)',
                  'radial-gradient(circle at 100% 100%, hsl(var(--primary)) 0%, transparent 50%)',
                  'radial-gradient(circle at 0% 0%, hsl(var(--primary)) 0%, transparent 50%)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />

            {/* Terminal lines */}
            <div className="relative z-10 space-y-1">
              {lines.map((line, index) => (
                <AnimatePresence key={index}>
                  {visibleLines.includes(index) && (
                    <motion.div
                      initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                      transition={{ 
                        duration: 0.15,
                        type: 'spring',
                        stiffness: 400,
                        damping: 30,
                      }}
                      className={`
                        ${line.highlight 
                          ? 'text-green-400 font-bold text-base' 
                          : 'text-primary/80'
                        }
                      `}
                    >
                      {line.text}
                      {index === visibleLines[visibleLines.length - 1] && (
                        <motion.span
                          animate={{ opacity: [1, 0] }}
                          transition={{ duration: 0.4, repeat: Infinity }}
                          className="ml-1 inline-block w-2 h-4 bg-current"
                        />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <motion.div 
            className="h-1 bg-muted rounded-b-xl overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/60"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </motion.div>
        </motion.div>

        {/* Status indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-card/50 backdrop-blur-sm border border-border/50">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full"
            />
            <span className="text-xs text-muted-foreground">
              {transitionDirection === 'to-studio' 
                ? '进入 Studio 模式' 
                : '返回消费者模式'
              }
            </span>
            <span className="text-xs text-primary font-mono">
              {Math.round(progress)}%
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
