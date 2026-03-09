/**
 * @file Hive.tsx
 * @description HIVE 聚合模块 - 构建器、知识库、铸造与运行时入口 - HIVE Module Hub
 * @author Fance Studio
 * @copyright Copyright (c) 2025 Fance Studio. MIT License.
 */
import { useSearchParams } from "react-router-dom";
import { Bot, BookOpen, Hammer, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAgent } from "@/hooks/useAgents";

const Builder = lazy(() => import("./Builder"));
const Knowledge = lazy(() => import("./Knowledge"));
const Foundry = lazy(() => import("./Foundry"));
const Runtime = lazy(() => import("./Runtime"));

const hiveTabs = [
  { key: "builder", label: "构建", icon: Bot },
  { key: "knowledge", label: "知识库", icon: BookOpen },
  { key: "foundry", label: "工坊", icon: Hammer },
  { key: "runtime", label: "终端", icon: Play },
] as const;

type HiveTab = (typeof hiveTabs)[number]["key"];

function HiveTabBar({ activeTab, onTabChange }: { activeTab: HiveTab; onTabChange: (tab: HiveTab) => void }) {
  const [searchParams] = useSearchParams();
  const agentId = searchParams.get("agentId");
  const { data: agent } = useAgent(agentId);

  return (
    <div className="flex items-center justify-between px-4 h-12 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="flex items-center gap-0.5 relative">
        {hiveTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-md",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="hive-tab-indicator"
                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Context: current agent name */}
      {agent && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="truncate max-w-[180px]">{agent.name}</span>
        </motion.div>
      )}
    </div>
  );
}

const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export default function Hive() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as HiveTab) || "builder";

  const handleTabChange = (tab: HiveTab) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tab);
    if (tab !== "runtime" && tab !== "builder") {
      newParams.delete("agentId");
    }
    setSearchParams(newParams, { replace: true });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <HiveTabBar activeTab={activeTab} onTabChange={handleTabChange} />
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<LoadingFallback />}>
          {activeTab === "builder" && <Builder />}
          {activeTab === "knowledge" && <Knowledge />}
          {activeTab === "foundry" && <Foundry />}
          {activeTab === "runtime" && <Runtime />}
        </Suspense>
      </div>
    </div>
  );
}
