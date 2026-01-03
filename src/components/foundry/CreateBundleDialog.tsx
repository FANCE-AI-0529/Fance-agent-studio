import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Search, X, ImageIcon } from "lucide-react";
import { useMySkills } from "@/hooks/useSkills";
import { useCreateBundle } from "@/hooks/useSkillBundles";
import { toast } from "@/hooks/use-toast";

interface CreateBundleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBundleDialog({ open, onOpenChange }: CreateBundleDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("");
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: mySkills = [], isLoading: loadingSkills } = useMySkills();
  const createBundle = useCreateBundle();

  // Filter published skills only
  const publishedSkills = mySkills.filter((skill) => skill.is_published);
  const filteredSkills = publishedSkills.filter((skill) =>
    skill.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSkillToggle = (skillId: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "请输入名称",
        description: "能力包名称不能为空",
        variant: "destructive",
      });
      return;
    }

    if (selectedSkillIds.length === 0) {
      toast({
        title: "请选择能力",
        description: "至少选择一个能力加入能力包",
        variant: "destructive",
      });
      return;
    }

    createBundle.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        cover_image: coverImage.trim() || null,
        is_free: isFree,
        price: isFree ? null : parseFloat(price) || null,
        skill_ids: selectedSkillIds,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          resetForm();
        },
      }
    );
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setCoverImage("");
    setIsFree(true);
    setPrice("");
    setSelectedSkillIds([]);
    setSearchQuery("");
  };

  const selectedSkills = publishedSkills.filter((skill) =>
    selectedSkillIds.includes(skill.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            创建能力包
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">能力包名称 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：智能客服能力包"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="描述这个能力包的功能和用途..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverImage">封面图URL</Label>
              <div className="flex gap-2">
                <Input
                  id="coverImage"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://..."
                  className="flex-1"
                />
                {coverImage && (
                  <div className="w-16 h-16 rounded-lg border border-border overflow-hidden flex-shrink-0">
                    <img
                      src={coverImage}
                      alt="Cover"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                {!coverImage && (
                  <div className="w-16 h-16 rounded-lg border border-dashed border-border flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>免费提供</Label>
                <p className="text-sm text-muted-foreground">
                  关闭后可设置价格
                </p>
              </div>
              <Switch checked={isFree} onCheckedChange={setIsFree} />
            </div>

            {!isFree && (
              <div className="space-y-2">
                <Label htmlFor="price">价格 (¥)</Label>
                <Input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="9.9"
                  min="0"
                  step="0.01"
                />
              </div>
            )}
          </div>

          {/* Skill Selection */}
          <div className="space-y-4">
            <div>
              <Label>选择能力 *</Label>
              <p className="text-sm text-muted-foreground">
                从你已发布的能力中选择要打包的能力
              </p>
            </div>

            {/* Selected Skills Preview */}
            {selectedSkills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedSkills.map((skill) => (
                  <Badge
                    key={skill.id}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {skill.name}
                    <button
                      onClick={() => handleSkillToggle(skill.id)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索能力..."
                className="pl-9"
              />
            </div>

            {/* Skills List */}
            <ScrollArea className="h-48 border border-border rounded-lg">
              {loadingSkills ? (
                <div className="p-4 text-center text-muted-foreground">
                  加载中...
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
                        <p className="font-medium text-sm truncate">
                          {skill.name}
                        </p>
                        {skill.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {skill.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        v{skill.version || "1.0.0"}
                      </Badge>
                    </label>
                  ))}
                </div>
              ) : publishedSkills.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <p>暂无已发布的能力</p>
                  <p className="text-xs mt-1">先发布一些能力后再创建能力包</p>
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  未找到匹配的能力
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
            disabled={createBundle.isPending}
            className="gap-2"
          >
            <Package className="h-4 w-4" />
            {createBundle.isPending ? "创建中..." : "创建能力包"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
