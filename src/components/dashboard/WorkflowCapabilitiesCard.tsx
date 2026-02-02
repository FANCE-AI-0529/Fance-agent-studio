import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Brain, 
  Globe, 
  Code2, 
  FileCode2, 
  Repeat, 
  Layers, 
  Route, 
  ScanSearch,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const capabilities = [
  {
    icon: Brain,
    name: "LLM 调用",
    nameEn: "LLM Call",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Globe,
    name: "HTTP 请求",
    nameEn: "HTTP Request",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
  },
  {
    icon: Code2,
    name: "代码执行",
    nameEn: "Code Exec",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: FileCode2,
    name: "模板转换",
    nameEn: "Template",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Repeat,
    name: "迭代器",
    nameEn: "Iterator",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    icon: Layers,
    name: "聚合器",
    nameEn: "Aggregator",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Route,
    name: "意图路由",
    nameEn: "Intent Router",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: ScanSearch,
    name: "参数提取",
    nameEn: "Param Extract",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
];

export function WorkflowCapabilitiesCard() {
  const navigate = useNavigate();

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base">工作流构建能力</CardTitle>
            <Badge variant="info" className="text-[10px]">
              13 节点
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs gap-1"
            onClick={() => navigate("/builder?wizard=true")}
          >
            探索更多
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-4 gap-2">
          {capabilities.map((cap, index) => {
            const Icon = cap.icon;
            return (
              <motion.div
                key={cap.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="group"
              >
                <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-card/50 border border-border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer">
                  <div className={`p-2 rounded-lg ${cap.bg} group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-4 w-4 ${cap.color}`} />
                  </div>
                  <span className="text-[11px] font-medium text-center line-clamp-1">
                    {cap.name}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4 flex items-center justify-center gap-1.5">
          <Sparkles className="h-3 w-3" />
          组合这些节点，构建复杂的智能工作流
        </p>
      </CardContent>
    </Card>
  );
}
