import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuroraBackground } from "@/components/consumer/AuroraBackground";
import { ConsumerHeader } from "@/components/consumer/ConsumerHeader";
import { HeroInput } from "@/components/consumer/HeroInput";
import { InspirationCapsules } from "@/components/consumer/InspirationCapsules";
import { AgentDock } from "@/components/consumer/AgentDock";
import { AgentGridList } from "@/components/consumer/AgentGridList";
import { MagicLoader } from "@/components/consumer/MagicLoader";
import { BuildCompletionCard } from "@/components/consumer/BuildCompletionCard";
import { ClarificationCard } from "@/components/consumer/ClarificationCard";
import { UploadGuideCard } from "@/components/consumer/UploadGuideCard";
import { MiniStudioPreview } from "@/components/consumer/MiniStudioPreview";
import { useInvisibleBuilder, type InvisibleBuildResult } from "@/hooks/useInvisibleBuilder";
import { useInlineUpload } from "@/hooks/useInlineUpload";
import { useAppModeStore } from "@/stores/appModeStore";
import { Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
type HomeViewState = "input" | "building" | "complete";
export default function ConsumerHome() {
  const navigate = useNavigate();
  const [viewState, setViewState] = useState<HomeViewState>("input");
  const [inputValue, setInputValue] = useState("");
  const [buildResult, setBuildResult] = useState<InvisibleBuildResult | null>(null);
  const {
    toggleMode
  } = useAppModeStore();
  const {
    build,
    isBuilding,
    isPaused,
    steps,
    currentStepIndex,
    error,
    reset: resetBuilder,
    clarificationState,
    handleKnowledgeSelection,
    handleSkipKnowledge,
    handleFileUploaded
  } = useInvisibleBuilder();
  const {
    uploadStatus,
    uploadProgress,
    uploadedFileName,
    handleUpload,
    reset: resetUpload
  } = useInlineUpload({
    onComplete: kb => {
      handleFileUploaded(kb);
    }
  });

  // Keyboard shortcut for developer mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        toggleMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleMode]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: "构建失败",
        description: error,
        variant: "destructive"
      });
      setViewState("input");
    }
  }, [error]);
  const handleSubmit = async (value: string) => {
    if (!value.trim()) return;

    // Reset upload state for new build
    resetUpload();
    setInputValue(value);
    setViewState("building");
    try {
      const result = await build(value);
      setBuildResult(result);
      setViewState("complete");
    } catch (err) {
      // Error is handled by the useEffect above
      setViewState("input");
    }
  };
  const handleStartChat = () => {
    if (buildResult) {
      navigate(`/runtime?agentId=${buildResult.agentId}`);
    }
  };
  const handleViewDetails = () => {
    if (buildResult) {
      toggleMode(); // Switch to Studio mode
      navigate(`/builder?agentId=${buildResult.agentId}`);
    }
  };
  const handleInspirationSelect = (prompt: string) => {
    setInputValue(prompt);
  };
  const handleCreateNew = () => {
    if (viewState === "complete" || viewState === "building") {
      // Reset and go back to input
      resetBuilder();
      resetUpload();
      setBuildResult(null);
      setViewState("input");
      setInputValue("");
    } else if (inputValue.trim()) {
      handleSubmit(inputValue);
    } else {
      navigate("/builder");
    }
  };
  const handleBackToInput = () => {
    resetBuilder();
    resetUpload();
    setBuildResult(null);
    setViewState("input");
  };

  // Render clarification component based on state
  const renderClarificationComponent = () => {
    if (!clarificationState) return null;
    if (clarificationState.type === 'ask_user') {
      return <ClarificationCard question={clarificationState.question || ''} matches={clarificationState.matches} onSelect={handleKnowledgeSelection} onSkip={handleSkipKnowledge} />;
    }
    if (clarificationState.type === 'suggest_upload') {
      return <UploadGuideCard onUpload={handleUpload} onSkip={handleSkipKnowledge} onReset={resetUpload} onConfirm={() => {
        // File already uploaded, trigger the handler with the existing KB
        handleSkipKnowledge();
      }} uploadProgress={uploadProgress} uploadStatus={uploadStatus} uploadedFileName={uploadedFileName || undefined} />;
    }
    return null;
  };
  return <AuroraBackground>
      <ConsumerHeader />

      <div className="min-h-screen flex flex-col items-center justify-center pt-16 pb-32">
        <AnimatePresence mode="wait">
          {/* Input View */}
          {viewState === "input" && <motion.div key="input" initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} exit={{
          opacity: 0,
          y: -20
        }} transition={{
          duration: 0.4
        }} className="w-full">
              {/* Hero section */}
              <div className="text-center mb-8">
                {/* Badge */}
                <motion.div initial={{
              opacity: 0,
              scale: 0.9
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              delay: 0.1
            }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs text-primary font-medium">AI 驱动的数字员工平台</span>
                </motion.div>

                {/* Title */}
                <motion.h1 initial={{
              opacity: 0,
              y: 10
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: 0.2
            }} className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
                  <span className="from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent bg-[role-engineer-border] bg-cognitive">
                    构建你的
                  </span>
                  <br />
                  <span 
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage: 'linear-gradient(to right, hsl(220 90% 60%), hsl(265 85% 65%), hsl(280 80% 60%))'
                    }}
                  >
                    智能数字员工
                  </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p initial={{
              opacity: 0,
              y: 10
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: 0.3
            }} className="text-lg text-muted-foreground max-w-xl mx-auto">
                  用自然语言描述你的需求，AI 将为你创建专属的智能助手
                </motion.p>
              </div>

              {/* Hero Input */}
              <HeroInput onSubmit={handleSubmit} isLoading={false} defaultValue={inputValue} placeholder="想构建什么样的数字员工？" />

              {/* Inspiration capsules */}
              <InspirationCapsules onSelect={handleInspirationSelect} />

              {/* Agent Grid List */}
              <AgentGridList onCreateNew={handleCreateNew} />

              {/* Features preview */}
              <motion.div initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} transition={{
            delay: 0.7
          }} className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground/60">
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
            </motion.div>}

          {/* Building View */}
          {viewState === "building" && <motion.div key="building" initial={{
          opacity: 0,
          scale: 0.95
        }} animate={{
          opacity: 1,
          scale: 1
        }} exit={{
          opacity: 0,
          scale: 0.95
        }} transition={{
          duration: 0.4
        }} className="w-full max-w-lg mx-auto px-4">
              <MagicLoader steps={steps} currentStepIndex={currentStepIndex} agentName={buildResult?.agentName} isPaused={isPaused} clarificationComponent={renderClarificationComponent()} />
              
              {/* Mini Studio Preview during build */}
              {buildResult?.agentId && <MiniStudioPreview agentId={buildResult.agentId} latestAgentMessage={steps[currentStepIndex]?.text || null} defaultExpanded={true} className="!bottom-20" />}
            </motion.div>}

          {/* Complete View */}
          {viewState === "complete" && buildResult && <motion.div key="complete" initial={{
          opacity: 0,
          scale: 0.95
        }} animate={{
          opacity: 1,
          scale: 1
        }} exit={{
          opacity: 0,
          scale: 0.95
        }} transition={{
          duration: 0.4
        }} className="w-full px-4">
              <BuildCompletionCard agent={{
            id: buildResult.agentId,
            name: buildResult.agentName,
            avatar: buildResult.agentAvatar,
            skills: buildResult.skills,
            capabilities: buildResult.capabilities,
            description: buildResult.description
          }} onStartChat={handleStartChat} onViewDetails={handleViewDetails} />
            </motion.div>}
        </AnimatePresence>
      </div>

      {/* Agent Dock */}
      <AgentDock onCreateNew={handleCreateNew} />
    </AuroraBackground>;
}