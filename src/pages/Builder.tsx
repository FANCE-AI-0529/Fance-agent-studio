import { useState } from "react";
import { 
  Bot, 
  Puzzle, 
  Settings, 
  Rocket, 
  Search,
  Brain,
  FileCode,
  Database,
  Image,
  MessageSquare,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Skill categories for the marketplace
const skillCategories = [
  { id: "analysis", label: "数据分析", icon: Database },
  { id: "vision", label: "图像识别", icon: Image },
  { id: "nlp", label: "自然语言", icon: MessageSquare },
  { id: "code", label: "代码生成", icon: FileCode },
];

// Mock skills data
const mockSkills = [
  { id: "1", name: "政策查询", category: "nlp", description: "智能解读政策文件", permissions: ["read"] },
  { id: "2", name: "表单生成", category: "nlp", description: "自动生成申请表单", permissions: ["write", "read"] },
  { id: "3", name: "OCR识别", category: "vision", description: "图像文字提取", permissions: ["read"] },
  { id: "4", name: "数据分析", category: "analysis", description: "结构化数据分析", permissions: ["read"] },
  { id: "5", name: "代码审查", category: "code", description: "代码质量检测", permissions: ["read"] },
];

const Builder = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [agentName, setAgentName] = useState("");
  const [department, setDepartment] = useState("");

  const filteredSkills = mockSkills.filter(skill => 
    skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    skill.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSkillSelect = (skillId: string) => {
    setSelectedSkills(prev => 
      prev.includes(skillId) 
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  return (
    <div className="h-full flex">
      {/* Left Panel - Skill Marketplace */}
      <div className="w-80 border-r border-border flex flex-col bg-card/50">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Puzzle className="h-4 w-4 text-cognitive" />
            <span className="font-semibold text-sm">技能市场</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {mockSkills.length} 可用
          </Badge>
        </div>
        
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
          {skillCategories.map(cat => (
            <button
              key={cat.id}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              <cat.icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Skills List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredSkills.map(skill => (
            <div
              key={skill.id}
              onClick={() => handleSkillSelect(skill.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedSkills.includes(skill.id)
                  ? "border-primary bg-primary/10 glow-primary"
                  : "border-border bg-card hover:border-muted-foreground"
              }`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <span className="font-medium text-sm">{skill.name}</span>
                <Sparkles className="h-3.5 w-3.5 text-cognitive" />
              </div>
              <p className="text-xs text-muted-foreground mb-2">{skill.description}</p>
              <div className="flex gap-1">
                {skill.permissions.map(perm => (
                  <Badge key={perm} variant="outline" className="text-[10px] px-1.5 py-0">
                    {perm}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Center - Canvas Area */}
      <div className="flex-1 flex flex-col">
        <div className="panel-header border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-cognitive" />
              <span className="font-semibold">Agent 构建画布</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              已选择 {selectedSkills.length} 个技能
            </Badge>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-grid-pattern relative overflow-hidden">
          {/* Central Agent Node */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="node-card text-center rounded-lg">
              <Bot className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="font-semibold text-sm mb-1">
                {agentName || "未命名 Agent"}
              </div>
              <div className="text-xs text-muted-foreground">
                {department || "选择部门"}
              </div>
              {selectedSkills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1 justify-center">
                  {selectedSkills.slice(0, 3).map(id => {
                    const skill = mockSkills.find(s => s.id === id);
                    return (
                      <Badge key={id} variant="secondary" className="text-[10px]">
                        {skill?.name}
                      </Badge>
                    );
                  })}
                  {selectedSkills.length > 3 && (
                    <Badge variant="secondary" className="text-[10px]">
                      +{selectedSkills.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Instructions overlay */}
          {selectedSkills.length === 0 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
              <p className="text-sm text-muted-foreground">
                从左侧技能市场拖拽技能到此画布
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Configuration */}
      <div className="w-80 border-l border-border flex flex-col bg-card/50">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-governance" />
            <span className="font-semibold text-sm">Agent 配置</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Basic Info */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                基础信息
              </label>
              <div className="space-y-2">
                <Input 
                  placeholder="智能体名称"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="bg-background"
                />
                <Input 
                  placeholder="所属部门"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>

            {/* Model Selection */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                基础模型
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button className="p-3 rounded-lg border border-primary bg-primary/10 text-sm text-center">
                  Claude 3.5
                </button>
                <button className="p-3 rounded-lg border border-border bg-card hover:border-muted-foreground text-sm text-center transition-colors">
                  GPT-4
                </button>
              </div>
            </div>

            {/* MPLP Policy */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                MPLP 策略
              </label>
              <div className="p-3 rounded-lg border border-border bg-secondary/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-governance" />
                  <span className="text-xs font-medium">治理策略: 默认</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  敏感操作需人工确认，全链路日志记录
                </p>
              </div>
            </div>

            {/* Selected Skills Summary */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                已装载技能 ({selectedSkills.length})
              </label>
              <div className="space-y-2">
                {selectedSkills.map(id => {
                  const skill = mockSkills.find(s => s.id === id);
                  return (
                    <div key={id} className="flex items-center justify-between p-2 rounded border border-border bg-card">
                      <span className="text-sm">{skill?.name}</span>
                      <button 
                        onClick={() => handleSkillSelect(id)}
                        className="text-xs text-destructive hover:underline"
                      >
                        移除
                      </button>
                    </div>
                  );
                })}
                {selectedSkills.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    尚未选择任何技能
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Deploy Button */}
        <div className="p-4 border-t border-border">
          <Button className="w-full gap-2" size="lg" disabled={!agentName || selectedSkills.length === 0}>
            <Rocket className="h-4 w-4" />
            部署到城市网络
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Builder;