import { useState, DragEvent } from "react";
import {
  Puzzle,
  Search,
  Database,
  Image,
  MessageSquare,
  FileCode,
  Sparkles,
  GripVertical,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePublishedSkills, type Skill as DbSkill } from "@/hooks/useSkills";

const categoryIcons: Record<string, React.ElementType> = {
  analysis: Database,
  vision: Image,
  nlp: MessageSquare,
  code: FileCode,
};

const skillCategories = [
  { id: "all", label: "全部" },
  { id: "analysis", label: "数据分析", icon: Database },
  { id: "vision", label: "图像识别", icon: Image },
  { id: "nlp", label: "自然语言", icon: MessageSquare },
  { id: "code", label: "代码生成", icon: FileCode },
];

export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  permissions: string[];
  version: string;
}

// Convert DB skill to component skill format
function toSkill(dbSkill: DbSkill): Skill {
  return {
    id: dbSkill.id,
    name: dbSkill.name,
    category: dbSkill.category,
    description: dbSkill.description || "",
    permissions: dbSkill.permissions || [],
    version: dbSkill.version,
  };
}

interface SkillMarketplaceProps {
  onDragStart: (skill: Skill) => void;
  addedSkillIds: string[];
}

export function SkillMarketplace({ onDragStart, addedSkillIds }: SkillMarketplaceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const { data: dbSkills, isLoading } = usePublishedSkills();

  const skills = (dbSkills || []).map(toSkill);

  const filteredSkills = skills.filter((skill) => {
    const matchesSearch =
      skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      activeCategory === "all" || skill.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDragStart = (e: DragEvent<HTMLDivElement>, skill: Skill) => {
    e.dataTransfer.setData("application/json", JSON.stringify(skill));
    e.dataTransfer.effectAllowed = "copy";
    onDragStart(skill);
  };

  return (
    <div className="w-80 border-r border-border flex flex-col bg-card/50">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Puzzle className="h-4 w-4 text-cognitive" />
          <span className="font-semibold text-sm">技能市场</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {skills.length} 可用
        </Badge>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索技能..."
            className="pl-9 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 p-2 border-b border-border overflow-x-auto">
        {skillCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat.icon && <cat.icon className="h-3.5 w-3.5" />}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Skills List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {skills.length === 0 ? "暂无已发布的技能" : "未找到匹配的技能"}
          </div>
        ) : (
          filteredSkills.map((skill) => {
            const isAdded = addedSkillIds.includes(skill.id);
            const CategoryIcon = categoryIcons[skill.category] || Sparkles;

            return (
              <div
                key={skill.id}
                draggable={!isAdded}
                onDragStart={(e) => handleDragStart(e, skill)}
                className={`p-3 rounded-lg border transition-all ${
                  isAdded
                    ? "border-primary/50 bg-primary/5 opacity-60 cursor-not-allowed"
                    : "border-border bg-card hover:border-primary/50 cursor-grab active:cursor-grabbing"
                }`}
              >
                <div className="flex items-start gap-2">
                  {!isAdded && (
                    <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <CategoryIcon className="h-3.5 w-3.5 text-cognitive" />
                        <span className="font-medium text-sm">{skill.name}</span>
                      </div>
                      {isAdded && (
                        <Badge variant="secondary" className="text-[10px]">
                          已添加
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {skill.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {skill.permissions.slice(0, 2).map((perm) => (
                          <Badge
                            key={perm}
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {perm}
                          </Badge>
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        v{skill.version}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
