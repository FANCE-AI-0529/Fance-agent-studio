import { useState, useEffect } from "react";
import { Settings2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useUpdateKnowledgeBase, type KnowledgeBase } from "@/hooks/useKnowledgeBases";

interface EditKnowledgeBaseDialogProps {
  knowledgeBase: KnowledgeBase | null;
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

export function EditKnowledgeBaseDialog({
  knowledgeBase,
  open,
  onOpenChange,
}: EditKnowledgeBaseDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("general");
  const [chunkSize, setChunkSize] = useState(512);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const [enableEntityExtraction, setEnableEntityExtraction] = useState(false);

  const updateKnowledgeBase = useUpdateKnowledgeBase();

  // Track original chunk params to detect changes
  const [originalChunkSize, setOriginalChunkSize] = useState(512);
  const [originalChunkOverlap, setOriginalChunkOverlap] = useState(50);

  useEffect(() => {
    if (knowledgeBase) {
      setName(knowledgeBase.name);
      setDescription(knowledgeBase.description || "");
      setDepartment(knowledgeBase.department || "general");
      setChunkSize(knowledgeBase.chunk_size || 512);
      setChunkOverlap(knowledgeBase.chunk_overlap || 50);
      setOriginalChunkSize(knowledgeBase.chunk_size || 512);
      setOriginalChunkOverlap(knowledgeBase.chunk_overlap || 50);
      const meta = knowledgeBase.metadata as Record<string, unknown> | null;
      setEnableEntityExtraction(!!meta?.enableEntityExtraction);
    }
  }, [knowledgeBase]);

  const chunkParamsChanged = chunkSize !== originalChunkSize || chunkOverlap !== originalChunkOverlap;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!knowledgeBase || !name.trim()) return;

    try {
      await updateKnowledgeBase.mutateAsync({
        id: knowledgeBase.id,
        name: name.trim(),
        description: description.trim() || undefined,
        department: department !== "general" ? department : undefined,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap,
        metadata: { enableEntityExtraction },
      });
      onOpenChange(false);
    } catch {
      // Error toast handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            配置知识库
          </DialogTitle>
          <DialogDescription>
            修改知识库的名称、描述和索引参数
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">名称 *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：产品手册库"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">描述</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述知识库的用途..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-department">分类</Label>
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
            <p className="text-xs text-muted-foreground">
              修改分块参数将影响后续新增文档
            </p>
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

          {chunkParamsChanged && (
            <Alert variant="destructive" className="bg-destructive/5 border-destructive/30">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                更改分块参数后，建议对已有文档重新索引以获得最佳检索效果
              </AlertDescription>
            </Alert>
          )}

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
            <Button type="submit" disabled={!name.trim() || updateKnowledgeBase.isPending}>
              {updateKnowledgeBase.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
