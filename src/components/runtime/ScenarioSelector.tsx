import { useState } from "react";
import { 
  Briefcase, 
  GraduationCap, 
  Heart, 
  Lightbulb, 
  Users, 
  Headphones,
  Plus,
  Search,
  Sparkles,
  Check,
} from "lucide-react";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { Badge } from "../ui/badge.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs.tsx";
import { cn } from "../../lib/utils.ts";
import { useScenarios, Scenario } from "../../hooks/useScenarios.ts";

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  interview: Briefcase,
  training: GraduationCap,
  counseling: Heart,
  creative: Lightbulb,
  roleplay: Users,
  customer_service: Headphones,
};

const categoryNames: Record<string, string> = {
  interview: "面试模拟",
  training: "培训学习",
  counseling: "心理咨询",
  creative: "创意头脑风暴",
  roleplay: "角色扮演",
  customer_service: "客服培训",
};

interface ScenarioSelectorProps {
  selectedScenario?: Scenario | null;
  onSelectScenario: (scenario: Scenario | null) => void;
  trigger?: React.ReactNode;
}

export function ScenarioSelector({
  selectedScenario,
  onSelectScenario,
  trigger,
}: ScenarioSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  
  const { data: scenarios = [], isLoading } = useScenarios();

  // Filter scenarios
  const filteredScenarios = scenarios.filter((s) => {
    const matchesSearch = search
      ? s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description?.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchesCategory = activeCategory === "all" || s.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (scenario: Scenario) => {
    onSelectScenario(scenario);
    setOpen(false);
  };

  const handleClear = () => {
    onSelectScenario(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="h-4 w-4" />
            {selectedScenario ? selectedScenario.name : "选择场景"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            选择对话场景
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索场景..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="all" className="text-xs">全部</TabsTrigger>
            {Object.entries(categoryNames).map(([key, name]) => {
              const Icon = categoryIcons[key];
              return (
                <TabsTrigger key={key} value={key} className="text-xs gap-1">
                  <Icon className="h-3 w-3" />
                  {name}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={activeCategory} className="mt-4">
            <ScrollArea className="h-[350px] pr-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  加载中...
                </div>
              ) : filteredScenarios.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <p>暂无场景</p>
                  <Button variant="ghost" size="sm" className="mt-2 gap-1">
                    <Plus className="h-4 w-4" />
                    创建场景
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {/* Clear selection option */}
                  {selectedScenario && (
                    <button
                      onClick={handleClear}
                      className="w-full p-4 text-left border border-dashed border-muted-foreground/30 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="text-sm text-muted-foreground">
                        取消场景模式，回到普通对话
                      </div>
                    </button>
                  )}

                  {filteredScenarios.map((scenario) => {
                    const CategoryIcon = categoryIcons[scenario.category || ""] || Sparkles;
                    const isSelected = selectedScenario?.id === scenario.id;

                    return (
                      <button
                        key={scenario.id}
                        onClick={() => handleSelect(scenario)}
                        className={cn(
                          "w-full p-4 text-left border rounded-lg transition-all",
                          "hover:border-primary/50 hover:bg-accent/50",
                          isSelected && "border-primary bg-primary/5"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                            "bg-primary/10"
                          )}>
                            <CategoryIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">{scenario.name}</h4>
                              {isSelected && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            {scenario.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {scenario.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {scenario.category && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {categoryNames[scenario.category] || scenario.category}
                                </Badge>
                              )}
                              {scenario.agentRole && (
                                <Badge variant="outline" className="text-[10px]">
                                  AI: {scenario.agentRole}
                                </Badge>
                              )}
                              {scenario.userRole && (
                                <Badge variant="outline" className="text-[10px]">
                                  你: {scenario.userRole}
                                </Badge>
                              )}
                              {scenario.isMultiAgent && (
                                <Badge variant="outline" className="text-[10px] gap-1">
                                  <Users className="h-3 w-3" />
                                  多角色
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default ScenarioSelector;
