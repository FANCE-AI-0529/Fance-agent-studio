import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuroraBackground } from "@/components/consumer/AuroraBackground";
import { ConsumerHeader } from "@/components/consumer/ConsumerHeader";
import { HeroInput } from "@/components/consumer/HeroInput";
import { InspirationCapsules } from "@/components/consumer/InspirationCapsules";
import { AgentDock } from "@/components/consumer/AgentDock";
import { MagicLoader } from "@/components/consumer/MagicLoader";
import { MagicComplete } from "@/components/consumer/MagicComplete";
import { useAppModeStore } from "@/stores/appModeStore";
import { useInvisibleBuilder } from "@/hooks/useInvisibleBuilder";
import { Sparkles } from "lucide-react";

type BuildState = 'idle' | 'building' | 'transitioning' | 'complete';

export default function ConsumerHome() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const [buildState, setBuildState] = useState<BuildState>('idle');
  const [userPrompt, setUserPrompt] = useState("");
  const { toggleMode } = useAppModeStore();
  const { 
    isBuilding, 
    currentStepIndex, 
    steps, 
    buildResult, 
    buildFromPrompt,
    reset: resetBuilder 
  } = useInvisibleBuilder();

  // Keyboard shortcut for developer mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggleMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleMode]);

  const handleSubmit = async (value: string) => {
    setUserPrompt(value);
    setBuildState('building');
    
    try {
      const result = await buildFromPrompt(value);
      setBuildState('transitioning');
      
      // Wait for complete animation then navigate
      setTimeout(() => {
        navigate(`/runtime?agentId=${result.agentId}&firstMessage=${encodeURIComponent(result.firstMessage)}`);
      }, 1200);
    } catch (error) {
      console.error('Build failed:', error);
      setBuildState('idle');
      resetBuilder();
    }
  };

  const handleInspirationSelect = (prompt: string) => {
    setInputValue(prompt);
  };

  const handleCreateNew = () => {
    if (inputValue.trim()) {
      handleSubmit(inputValue);
    } else {
      navigate('/builder');
    }
  };

  const handleMagicComplete = () => {
    setBuildState('complete');
  };

  return (
    <AuroraBackground>
      <ConsumerHeader />
      
      <div className="min-h-screen flex flex-col items-center justify-center pt-16 pb-32 relative">
        <AnimatePresence mode="wait">
          {/* Idle state - show input */}
          {buildState === 'idle' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center"
            >
              {/* Hero section */}
              <div className="text-center mb-8">
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs text-primary font-medium">AI 驱动的数字员工平台</span>
                </motion.div>

                {/* Title */}
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4"
                >
                  <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                    构建你的
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-primary via-primary to-purple-400 bg-clip-text text-transparent">
                    智能数字员工
                  </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-lg text-muted-foreground max-w-xl mx-auto"
                >
                  用自然语言描述你的需求，AI 将为你创建专属的智能助手
                </motion.p>
              </div>

              {/* Hero Input */}
              <HeroInput
                onSubmit={handleSubmit}
                isLoading={false}
                defaultValue={inputValue}
                placeholder="想构建什么样的数字员工？"
              />

              {/* Inspiration capsules */}
              <InspirationCapsules onSelect={handleInspirationSelect} />

              {/* Features preview */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-16 flex items-center gap-8 text-sm text-muted-foreground/60"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span>自动化工作流</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>多模型支持</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  <span>知识库集成</span>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Building state - show magic loader */}
          {buildState === 'building' && (
            <motion.div
              key="loader"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5 }}
              className="w-full"
            >
              <MagicLoader
                isLoading={isBuilding}
                currentStepIndex={currentStepIndex}
                steps={steps}
                userPrompt={userPrompt}
                onComplete={handleMagicComplete}
              />
            </motion.div>
          )}

          {/* Transitioning state - show complete */}
          {(buildState === 'transitioning' || buildState === 'complete') && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="w-full"
            >
              <MagicComplete 
                agentName={buildResult?.agentName}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Agent Dock - only show in idle state */}
      {buildState === 'idle' && (
        <AgentDock onCreateNew={handleCreateNew} />
      )}
    </AuroraBackground>
  );
}
