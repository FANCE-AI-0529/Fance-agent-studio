import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { Textarea } from "../ui/textarea.tsx";
import { Switch } from "../ui/switch.tsx";
import { Badge } from "../ui/badge.tsx";
import { Checkbox } from "../ui/checkbox.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Search, Package, Loader2 } from "lucide-react";
import { useMySkills } from "../../hooks/useSkills.ts";
import { useUpdateBundle, SkillBundle } from "../../hooks/useSkillBundles.ts";
import { toast } from "../../hooks/use-toast.ts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.tsx";
import { BUNDLE_CATEGORIES, BundleCategory } from "./BundleCategoryFilter.tsx";

interface EditBundleDialogProps {
  bundle: SkillBundle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBundleDialog({
  bundle,
  open,
  onOpenChange,
}: EditBundleDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<BundleCategory>("general");
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: skills = [], isLoading: loadingSkills } = useMySkills();
  const updateBundle = useUpdateBundle();

  // Initialize form when bundle changes
  useEffect(() => {
    if (bundle) {
      setName(bundle.name);
      setDescription(bundle.description || "");
      setCoverImage(bundle.cover_image || "");
      setIsFree(bundle.is_free ?? true);
      setPrice(bundle.price?.toString() || "");
      setCategory((bundle.category as BundleCategory) || "general");
      setSelectedSkillIds(bundle.skill_ids || []);
    }
  }, [bundle]);

  const publishedSkills = skills.filter((s) => s.is_published);
  const filteredSkills = publishedSkills.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSkillToggle = (skillId: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    );
  };

  const handleSubmit = () => {
    if (!bundle) return;
    
    if (!name.trim()) {
      toast({
        title: "请输入能力包名称",
        variant: "destructive",
      });
      return;
    }

    if (selectedSkillIds.length === 0) {
      toast({
        title: "请至少选择一个能力",
        variant: "destructive",
      });
      return;
    }

    updateBundle.mutate(
      {
        id: bundle.id,
        name: name.trim(),
        description: description.trim() || null,
        cover_image: coverImage.trim() || null,
        is_free: isFree,
        price: isFree ? 0 : parseFloat(price) || 0,
        category,
        skill_ids: selectedSkillIds,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            编辑能力包
          </DialogTitle>
          <DialogDescription>
            修改能力包信息和包含的能力
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* 基本信息 */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">名称 *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="如：智能客服基础包"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">描述</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="介绍这个能力包的用途和特点"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-cover">封面图 URL</Label>
                <Input
                  id="edit-cover"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-category">分类</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as BundleCategory)}
                >
                  <SelectTrigger id="edit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BUNDLE_CATEGORIES)
                      .filter(([key]) => key !== "all")
                      .map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 定价 */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Switch
                  id="edit-free"
                  checked={isFree}
                  onCheckedChange={setIsFree}
                />
                <Label htmlFor="edit-free">免费提供</Label>
              </div>
              {!isFree && (
                <div className="flex items-center gap-2">
                  <Label>价格</Label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-24"
                    min="0"
                    step="0.01"
                  />
                  <span className="text-muted-foreground">元</span>
                </div>
              )}
            </div>
          </div>

          {/* 选择能力 */}
          <div className="space-y-3">
            <Label>选择能力 *</Label>

            {/* 已选择的能力预览 */}
            {selectedSkillIds.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                {selectedSkillIds.map((id) => {
                  const skill = skills.find((s) => s.id === id);
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleSkillToggle(id)}
                    >
                      {skill?.name || id}
                      <span className="ml-1 opacity-60">×</span>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* 搜索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索能力..."
                className="pl-9"
              />
            </div>

            {/* 能力列表 */}
            <ScrollArea className="h-[200px] border rounded-lg">
              {loadingSkills ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredSkills.length > 0 ? (
                <div className="p-2 space-y-1">
                  {filteredSkills.map((skill) => (
                    <label
                      key={skill.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedSkillIds.includes(skill.id)}
                        onCheckedChange={() => handleSkillToggle(skill.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{skill.name}</div>
                        {skill.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {skill.description}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  {searchQuery ? "没有找到匹配的能力" : "暂无已发布的能力"}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateBundle.isPending}
          >
            {updateBundle.isPending && (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            )}
            保存修改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
