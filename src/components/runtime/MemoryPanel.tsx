import { useState } from "react";
import { 
  Brain, 
  Heart, 
  Lightbulb, 
  MessageSquare, 
  Trash2, 
  Edit2, 
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useUserMemories, useAddMemory, useUpdateMemory, useDeleteMemory, Memory } from "@/hooks/useMemory";
import { toast } from "sonner";

const memoryTypeConfig: Record<string, { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string;
  color: string;
}> = {
  preference: { icon: Heart, label: "偏好", color: "text-pink-500" },
  fact: { icon: Lightbulb, label: "事实", color: "text-yellow-500" },
  context: { icon: MessageSquare, label: "上下文", color: "text-blue-500" },
};

const sourceLabels: Record<string, string> = {
  user_stated: "用户说的",
  inferred: "AI推断的",
  system: "系统记录",
};

interface MemoryPanelProps {
  agentId?: string;
  trigger?: React.ReactNode;
}

export function MemoryPanel({ agentId, trigger }: MemoryPanelProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({
    preference: true,
    fact: true,
    context: false,
  });
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMemory, setNewMemory] = useState({
    key: "",
    value: "",
    memoryType: "fact" as Memory["memoryType"],
    importance: 5,
  });

  const { data: memories = [], isLoading } = useUserMemories(agentId);
  const addMemory = useAddMemory();
  const updateMemory = useUpdateMemory();
  const deleteMemory = useDeleteMemory();

  // Group memories by type
  const groupedMemories = memories.reduce((acc, memory) => {
    const type = memory.memoryType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(memory);
    return acc;
  }, {} as Record<string, Memory[]>);

  // Filter by search
  const filterMemories = (items: Memory[]) => {
    if (!search) return items;
    const lower = search.toLowerCase();
    return items.filter(
      (m) =>
        m.key.toLowerCase().includes(lower) ||
        m.value.toLowerCase().includes(lower)
    );
  };

  const toggleType = (type: string) => {
    setExpandedTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handleAdd = async () => {
    if (!newMemory.key || !newMemory.value) {
      toast.error("请填写完整信息");
      return;
    }
    try {
      await addMemory.mutateAsync({
        ...newMemory,
        agentId,
        source: "user_stated",
      });
      setShowAddDialog(false);
      setNewMemory({ key: "", value: "", memoryType: "fact", importance: 5 });
      toast.success("记忆已添加");
    } catch {
      toast.error("添加失败");
    }
  };

  const handleUpdate = async () => {
    if (!editingMemory) return;
    try {
      await updateMemory.mutateAsync({
        id: editingMemory.id,
        key: editingMemory.key,
        value: editingMemory.value,
        importance: editingMemory.importance,
      });
      setEditingMemory(null);
      toast.success("记忆已更新");
    } catch {
      toast.error("更新失败");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMemory.mutateAsync(id);
      toast.success("记忆已删除");
    } catch {
      toast.error("删除失败");
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="sm" className="gap-2">
              <Brain className="h-4 w-4" />
              记忆
              {memories.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {memories.length}
                </Badge>
              )}
            </Button>
          )}
        </SheetTrigger>
        <SheetContent side="right" className="w-[400px] sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              对话记忆
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Search and Add */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索记忆..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button size="icon" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Memory list */}
            <ScrollArea className="h-[calc(100vh-200px)]">
              {isLoading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  加载中...
                </div>
              ) : memories.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Brain className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">暂无记忆</p>
                  <p className="text-xs">与 AI 对话时会自动记录重要信息</p>
                </div>
              ) : (
                <div className="space-y-3 pr-4">
                  {Object.entries(memoryTypeConfig).map(([type, config]) => {
                    const items = filterMemories(groupedMemories[type] || []);
                    if (items.length === 0) return null;
                    const Icon = config.icon;

                    return (
                      <Collapsible
                        key={type}
                        open={expandedTypes[type]}
                        onOpenChange={() => toggleType(type)}
                      >
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-accent/50">
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-4 w-4", config.color)} />
                            <span className="text-sm font-medium">{config.label}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {items.length}
                            </Badge>
                          </div>
                          {expandedTypes[type] ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 pt-2">
                          {items.map((memory) => (
                            <div
                              key={memory.id}
                              className="p-3 border rounded-lg bg-card/50 group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-primary">
                                      {memory.key}
                                    </span>
                                    <div className="flex items-center gap-0.5">
                                      {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                          key={i}
                                          className={cn(
                                            "h-2 w-2",
                                            i < Math.ceil(memory.importance / 2)
                                              ? "text-yellow-400 fill-yellow-400"
                                              : "text-muted-foreground/30"
                                          )}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <p className="text-sm mt-1">{memory.value}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline" className="text-[10px]">
                                      {sourceLabels[memory.source] || memory.source}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => setEditingMemory(memory)}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive"
                                    onClick={() => handleDelete(memory.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Memory Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加记忆</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>类型</Label>
              <Select
                value={newMemory.memoryType}
                onValueChange={(v) => setNewMemory((prev) => ({ ...prev, memoryType: v as Memory["memoryType"] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(memoryTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>标题</Label>
              <Input
                placeholder="例如：喜欢的颜色"
                value={newMemory.key}
                onChange={(e) => setNewMemory((prev) => ({ ...prev, key: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>内容</Label>
              <Textarea
                placeholder="例如：蓝色"
                value={newMemory.value}
                onChange={(e) => setNewMemory((prev) => ({ ...prev, value: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>重要程度: {newMemory.importance}</Label>
              <Slider
                value={[newMemory.importance]}
                onValueChange={([v]) => setNewMemory((prev) => ({ ...prev, importance: v }))}
                min={1}
                max={10}
                step={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAdd} disabled={addMemory.isPending}>
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Memory Dialog */}
      <Dialog open={!!editingMemory} onOpenChange={() => setEditingMemory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑记忆</DialogTitle>
          </DialogHeader>
          {editingMemory && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>标题</Label>
                <Input
                  value={editingMemory.key}
                  onChange={(e) => setEditingMemory((prev) => prev ? { ...prev, key: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>内容</Label>
                <Textarea
                  value={editingMemory.value}
                  onChange={(e) => setEditingMemory((prev) => prev ? { ...prev, value: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>重要程度: {editingMemory.importance}</Label>
                <Slider
                  value={[editingMemory.importance]}
                  onValueChange={([v]) => setEditingMemory((prev) => prev ? { ...prev, importance: v } : null)}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMemory(null)}>
              取消
            </Button>
            <Button onClick={handleUpdate} disabled={updateMemory.isPending}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default MemoryPanel;
