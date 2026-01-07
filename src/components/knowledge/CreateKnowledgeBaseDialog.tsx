import { useState } from "react";
import { Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateKnowledgeBase } from "@/hooks/useKnowledgeBases";
import { useKnowledgeStore } from "@/stores/knowledgeStore";

interface CreateKnowledgeBaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEPARTMENTS = [
  { value: "general", label: "通用" },
  { value: "product", label: "产品文档" },
  { value: "technical", label: "技术规范" },
  { value: "customer", label: "客户服务" },
  { value: "legal", label: "法务合规" },
  { value: "hr", label: "人力资源" },
];

export function CreateKnowledgeBaseDialog({
  open,
  onOpenChange,
}: CreateKnowledgeBaseDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("general");
  const [chunkSize, setChunkSize] = useState(512);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const [enableEntityExtraction, setEnableEntityExtraction] = useState(false);

  const createKnowledgeBase = useCreateKnowledgeBase();
  const { setSelectedKnowledgeBase } = useKnowledgeStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    try {
      const newKB = await createKnowledgeBase.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        department: department !== "general" ? department : undefined,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap,
        metadata: {
          enableEntityExtraction,
        },
      });

      setSelectedKnowledgeBase(newKB.id);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      // Error toast handled by mutation
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setDepartment("general");
    setChunkSize(512);
    setChunkOverlap(50);
    setEnableEntityExtraction(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            创建知识库
          </DialogTitle>
          <DialogDescription>
            创建新的知识库来存储和索引文档
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">名称 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：产品手册库"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述知识库的用途..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">分类</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept.value} value={dept.value}>
                    {dept.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>分块大小</Label>
              <span className="text-sm text-muted-foreground">{chunkSize} tokens</span>
            </div>
            <Slider
              value={[chunkSize]}
              onValueChange={(v) => setChunkSize(v[0])}
              min={128}
              max={2048}
              step={64}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>分块重叠</Label>
              <span className="text-sm text-muted-foreground">{chunkOverlap} tokens</span>
            </div>
            <Slider
              value={[chunkOverlap]}
              onValueChange={(v) => setChunkOverlap(v[0])}
              min={0}
              max={256}
              step={16}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">开启实体提取</Label>
              <p className="text-xs text-muted-foreground">
                自动识别文档中的人物、组织、概念等实体（GraphRAG）
              </p>
            </div>
            <Switch
              checked={enableEntityExtraction}
              onCheckedChange={setEnableEntityExtraction}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={!name.trim() || createKnowledgeBase.isPending}>
              {createKnowledgeBase.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  创建中...
                </>
              ) : (
                "创建"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
