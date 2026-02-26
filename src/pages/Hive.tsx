import { useSearchParams } from "react-router-dom";
import { Bot, BookOpen, Hammer, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const Builder = lazy(() => import("./Builder"));
const Knowledge = lazy(() => import("./Knowledge"));
const Foundry = lazy(() => import("./Foundry"));
const Runtime = lazy(() => import("./Runtime"));

const hiveTabs = [
  { key: "builder", label: "智能体构建", icon: Bot },
  { key: "knowledge", label: "知识库", icon: BookOpen },
  { key: "foundry", label: "技能工坊", icon: Hammer },
  { key: "runtime", label: "运行终端", icon: Play },
] as const;

type HiveTab = (typeof hiveTabs)[number]["key"];

function HiveTabBar({ activeTab, onTabChange }: { activeTab: HiveTab; onTabChange: (tab: HiveTab) => void }) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-card/50">
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        {hiveTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>
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
    // Preserve agentId only when switching to runtime or builder
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
