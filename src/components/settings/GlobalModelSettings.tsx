import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit2,
  Star,
  StarOff,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Cpu,
  Zap,
  Globe,
  Key,
  Sparkles,
  Settings,
  AlertCircle,
  CheckCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  useGlobalLLMProviders,
  useCreateGlobalProvider,
  useUpdateGlobalProvider,
  useDeleteGlobalProvider,
  PROVIDER_TEMPLATES,
} from "@/hooks/useGlobalModelConfig";
import { LLMProvider } from "@/hooks/useLLMProviders";

export function GlobalModelSettings() {
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [editingProvider, setEditingProvider] = useState<LLMProvider | null>(null);
  const [deleteProviderId, setDeleteProviderId] = useState<string | null>(null);

  // Provider form state
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [formName, setFormName] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formEndpoint, setFormEndpoint] = useState("");
  const [formKeyName, setFormKeyName] = useState("");
  const [formDefaultModel, setFormDefaultModel] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);

  const { data: providers = [], isLoading } = useGlobalLLMProviders();
  const createProvider = useCreateGlobalProvider();
  const updateProvider = useUpdateGlobalProvider();
  const deleteProvider = useDeleteGlobalProvider();

  const resetForm = () => {
    setSelectedTemplate("");
    setFormName("");
    setFormDisplayName("");
    setFormEndpoint("");
    setFormKeyName("");
    setFormDefaultModel("");
    setFormIsDefault(false);
    setEditingProvider(null);
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = PROVIDER_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setFormName(template.name);
      setFormDisplayName(template.display_name);
      setFormEndpoint(template.api_endpoint);
      setFormKeyName(template.api_key_name);
      setFormDefaultModel(template.default_model || "");
    }
  };

  const handleCreate = async () => {
    const template = PROVIDER_TEMPLATES.find(t => t.id === selectedTemplate);
    await createProvider.mutateAsync({
      name: formName,
      provider_type: template?.provider_type || 'custom',
      display_name: formDisplayName,
      api_endpoint: formEndpoint,
      api_key_name: formKeyName,
      available_models: template?.available_models || [],
      default_model: formDefaultModel,
      is_default: formIsDefault,
    });
    setShowAddProvider(false);
    resetForm();
  };

  const handleEdit = (provider: LLMProvider) => {
    setEditingProvider(provider);
    setFormName(provider.name);
    setFormDisplayName(provider.display_name);
    setFormEndpoint(provider.api_endpoint);
    setFormKeyName(provider.api_key_name);
    setFormDefaultModel(provider.default_model || "");
    setFormIsDefault(provider.is_default);
    setShowAddProvider(true);
  };

  const handleUpdate = async () => {
    if (!editingProvider) return;
    await updateProvider.mutateAsync({
      id: editingProvider.id,
      name: formName,
      display_name: formDisplayName,
      api_endpoint: formEndpoint,
      api_key_name: formKeyName,
      default_model: formDefaultModel,
      is_default: formIsDefault,
    });
    setShowAddProvider(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!deleteProviderId) return;
    await deleteProvider.mutateAsync(deleteProviderId);
    setDeleteProviderId(null);
  };

  const handleToggleDefault = async (provider: LLMProvider) => {
    await updateProvider.mutateAsync({
      id: provider.id,
      is_default: !provider.is_default,
    });
  };

  const handleToggleActive = async (provider: LLMProvider) => {
    await updateProvider.mutateAsync({
      id: provider.id,
      is_active: !provider.is_active,
    });
  };

  const providerIcons: Record<string, any> = {
    lovable: Sparkles,
    openai: Cpu,
    anthropic: Zap,
    google: Globe,
    azure: Globe,
    custom: Settings,
  };

  const defaultProvider = providers.find(p => p.is_default && p.is_active);

  return (
    <div className="space-y-4">
      {/* Current Default Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            当前全局模型
          </CardTitle>
          <CardDescription>
            全局默认模型将应用于所有未单独配置的智能体和模块
          </CardDescription>
        </CardHeader>
        <CardContent>
          {defaultProvider ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="p-2 rounded-lg bg-primary/10">
                {(() => {
                  const Icon = providerIcons[defaultProvider.provider_type] || Settings;
                  return <Icon className="h-5 w-5 text-primary" />;
                })()}
              </div>
              <div className="flex-1">
                <div className="font-medium">{defaultProvider.display_name}</div>
                <div className="text-xs text-muted-foreground">
                  {defaultProvider.default_model || '未指定默认模型'}
                </div>
              </div>
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                已启用
              </Badge>
            </div>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>使用默认 AI 服务</AlertTitle>
              <AlertDescription>
                尚未配置默认模型供应商。请添加一个供应商（如 OpenAI、Anthropic）并设为默认。
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Provider List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">供应商管理</CardTitle>
              <CardDescription>配置 API 供应商，设为默认后将全局生效</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setShowAddProvider(true);
              }}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              添加供应商
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-8">
              <Cpu className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-medium mb-1">尚未配置供应商</h3>
              <p className="text-sm text-muted-foreground mb-4">
                添加 OpenAI、Anthropic 等供应商以替换默认模型
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setShowAddProvider(true);
                }}
                variant="outline"
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                添加供应商
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {providers.map((provider) => {
                  const IconComponent = providerIcons[provider.provider_type] || Settings;
                  return (
                    <motion.div
                      key={provider.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-3 rounded-lg border transition-all",
                        provider.is_active
                          ? "bg-card border-border"
                          : "bg-muted/30 border-muted opacity-60"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="p-2 rounded-lg bg-muted shrink-0">
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-medium text-sm truncate">
                                {provider.display_name}
                              </span>
                              {provider.is_default && (
                                <Badge variant="default" className="text-[10px] shrink-0">
                                  <Star className="h-2.5 w-2.5 mr-0.5" />
                                  默认
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-0.5 truncate">
                                <Key className="h-2.5 w-2.5" />
                                {provider.api_key_name}
                              </span>
                              {provider.default_model && (
                                <span className="truncate">• {provider.default_model}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleToggleDefault(provider)}
                            title={provider.is_default ? "取消默认" : "设为默认"}
                          >
                            {provider.is_default ? (
                              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                            ) : (
                              <StarOff className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEdit(provider)}
                            title="编辑"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleToggleActive(provider)}
                            title={provider.is_active ? "禁用" : "启用"}
                          >
                            {provider.is_active ? (
                              <ToggleRight className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <ToggleLeft className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteProviderId(provider.id)}
                            title="删除"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* API Key Instructions */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>API 密钥配置说明</AlertTitle>
        <AlertDescription className="text-xs space-y-1">
          <p>1. 在下方添加供应商时，填写密钥引用名称（如 OPENAI_API_KEY）</p>
          <p>2. 实际密钥需要在 Lovable 项目设置 → Secrets 中添加</p>
          <p className="text-muted-foreground">
            常用密钥名：OPENAI_API_KEY、ANTHROPIC_API_KEY、GOOGLE_API_KEY
          </p>
        </AlertDescription>
      </Alert>

      {/* Add/Edit Provider Dialog */}
      <Dialog open={showAddProvider} onOpenChange={(open) => {
        if (!open) {
          resetForm();
        }
        setShowAddProvider(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? "编辑供应商" : "添加供应商"}
            </DialogTitle>
            <DialogDescription>
              {editingProvider
                ? "修改供应商配置"
                : "选择一个预设模板或自定义配置"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!editingProvider && (
              <div className="space-y-2">
                <Label>供应商模板</Label>
                <Select value={selectedTemplate} onValueChange={handleSelectTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择供应商模板" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_TEMPLATES.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <span>{template.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {template.provider_type}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">名称</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="OpenAI"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">显示名称</Label>
                <Input
                  id="displayName"
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  placeholder="OpenAI API"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endpoint">API 端点</Label>
              <Input
                id="endpoint"
                value={formEndpoint}
                onChange={(e) => setFormEndpoint(e.target.value)}
                placeholder="https://api.openai.com/v1/chat/completions"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="keyName">密钥引用名称</Label>
                <Input
                  id="keyName"
                  value={formKeyName}
                  onChange={(e) => setFormKeyName(e.target.value)}
                  placeholder="OPENAI_API_KEY"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultModel">默认模型</Label>
                <Input
                  id="defaultModel"
                  value={formDefaultModel}
                  onChange={(e) => setFormDefaultModel(e.target.value)}
                  placeholder="gpt-4o"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <Label htmlFor="isDefault" className="cursor-pointer">设为全局默认</Label>
                <p className="text-xs text-muted-foreground">
                  启用后，所有模块将默认使用此供应商
                </p>
              </div>
              <Switch
                id="isDefault"
                checked={formIsDefault}
                onCheckedChange={setFormIsDefault}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddProvider(false);
              resetForm();
            }}>
              取消
            </Button>
            <Button
              onClick={editingProvider ? handleUpdate : handleCreate}
              disabled={!formName || !formEndpoint || !formKeyName || createProvider.isPending || updateProvider.isPending}
            >
              {(createProvider.isPending || updateProvider.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingProvider ? "保存" : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProviderId} onOpenChange={() => setDeleteProviderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除此供应商后，使用它的模块将回退到默认供应商。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProvider.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
