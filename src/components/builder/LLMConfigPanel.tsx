import { useState } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Star,
  StarOff,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Cpu,
  Zap,
  Globe,
  Key,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { cn } from "@/lib/utils";
import {
  useLLMProviders,
  useCreateLLMProvider,
  useUpdateLLMProvider,
  useDeleteLLMProvider,
  useLLMModelConfigs,
  useUpsertLLMModelConfig,
  useDeleteLLMModelConfig,
  PROVIDER_TEMPLATES,
  MODULE_TYPES,
} from "@/hooks/useLLMProviders";

interface LLMConfigPanelProps {
  agentId?: string | null;
  agentName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function LLMConfigPanel({
  agentId,
  agentName,
  isOpen,
  onClose,
}: LLMConfigPanelProps) {
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [deleteProviderId, setDeleteProviderId] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Provider form state
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [formName, setFormName] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formEndpoint, setFormEndpoint] = useState("");
  const [formKeyName, setFormKeyName] = useState("");
  const [formDefaultModel, setFormDefaultModel] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);

  // Module config state
  const [configModule, setConfigModule] = useState<string | null>(null);
  const [configProviderId, setConfigProviderId] = useState("");
  const [configModel, setConfigModel] = useState("");
  const [configTemperature, setConfigTemperature] = useState("0.7");
  const [configMaxTokens, setConfigMaxTokens] = useState("4096");

  const { data: providers = [], isLoading: loadingProviders } = useLLMProviders();
  const { data: modelConfigs = [], isLoading: loadingConfigs } = useLLMModelConfigs(agentId || null);
  const createProvider = useCreateLLMProvider();
  const updateProvider = useUpdateLLMProvider();
  const deleteProvider = useDeleteLLMProvider();
  const upsertConfig = useUpsertLLMModelConfig();
  const deleteConfig = useDeleteLLMModelConfig();

  const resetProviderForm = () => {
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

  const handleCreateProvider = async () => {
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
    resetProviderForm();
  };

  const handleEditProvider = (provider: any) => {
    setEditingProvider(provider);
    setFormName(provider.name);
    setFormDisplayName(provider.display_name);
    setFormEndpoint(provider.api_endpoint);
    setFormKeyName(provider.api_key_name);
    setFormDefaultModel(provider.default_model || "");
    setFormIsDefault(provider.is_default);
    setShowAddProvider(true);
  };

  const handleUpdateProvider = async () => {
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
    resetProviderForm();
  };

  const handleDeleteProvider = async () => {
    if (!deleteProviderId) return;
    await deleteProvider.mutateAsync(deleteProviderId);
    setDeleteProviderId(null);
  };

  const handleToggleDefault = async (provider: any) => {
    await updateProvider.mutateAsync({
      id: provider.id,
      is_default: !provider.is_default,
    });
  };

  const handleToggleActive = async (provider: any) => {
    await updateProvider.mutateAsync({
      id: provider.id,
      is_active: !provider.is_active,
    });
  };

  const handleSaveModuleConfig = async () => {
    if (!configModule || !configProviderId || !configModel) return;
    await upsertConfig.mutateAsync({
      agent_id: agentId || null,
      module_type: configModule,
      provider_id: configProviderId,
      model_name: configModel,
      temperature: parseFloat(configTemperature) || 0.7,
      max_tokens: parseInt(configMaxTokens) || 4096,
    });
    setConfigModule(null);
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const getModuleConfig = (moduleType: string) => {
    return modelConfigs.find((c: any) => c.module_type === moduleType);
  };

  const providerIcons: Record<string, any> = {
    fance: Sparkles,
    openai: Cpu,
    anthropic: Zap,
    google: Globe,
    azure: Globe,
    custom: Settings,
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              大模型配置 {agentName && `- ${agentName}`}
            </DialogTitle>
            <DialogDescription>
              配置 AI 模型供应商，为不同模块指定不同的大模型 API
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="providers" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="providers" className="gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                供应商管理
              </TabsTrigger>
              <TabsTrigger value="modules" className="gap-1.5">
                <Settings className="h-3.5 w-3.5" />
                模块配置
              </TabsTrigger>
            </TabsList>

            {/* Providers Tab */}
            <TabsContent value="providers" className="flex-1 overflow-hidden mt-0 pt-4">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">已配置的供应商</h3>
                  <Button
                    size="sm"
                    onClick={() => {
                      resetProviderForm();
                      setShowAddProvider(true);
                    }}
                    className="gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    添加供应商
                  </Button>
                </div>

                <ScrollArea className="flex-1">
                  {loadingProviders ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : providers.length === 0 ? (
                    <div className="text-center py-12">
                      <Cpu className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">尚未配置供应商</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        添加 AI 模型供应商以便在智能体中使用不同的大模型
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        默认使用 Fance AI Gateway（无需配置）
                      </p>
                      <Button
                        onClick={() => {
                          resetProviderForm();
                          setShowAddProvider(true);
                        }}
                        className="gap-1.5"
                      >
                        <Plus className="h-4 w-4" />
                        添加供应商
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {providers.map((provider: any) => {
                        const IconComponent = providerIcons[provider.provider_type] || Settings;
                        return (
                          <motion.div
                            key={provider.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              "p-4 rounded-lg border transition-all",
                              provider.is_active
                                ? "bg-card border-border"
                                : "bg-muted/30 border-muted opacity-60"
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-muted">
                                  <IconComponent className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">{provider.display_name}</span>
                                    {provider.is_default && (
                                      <Badge variant="default" className="text-[10px]">
                                        <Star className="h-2.5 w-2.5 mr-0.5" />
                                        默认
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-[10px]">
                                      {provider.provider_type}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground mb-2">
                                    {provider.api_endpoint}
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Key className="h-3 w-3" />
                                      {provider.api_key_name}
                                    </span>
                                    {provider.default_model && (
                                      <span className="flex items-center gap-1">
                                        <Cpu className="h-3 w-3" />
                                        {provider.default_model}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleToggleDefault(provider)}
                                >
                                  {provider.is_default ? (
                                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                  ) : (
                                    <StarOff className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditProvider(provider)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleToggleActive(provider)}
                                >
                                  {provider.is_active ? (
                                    <ToggleRight className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteProviderId(provider.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Module Config Tab */}
            <TabsContent value="modules" className="flex-1 overflow-hidden mt-0 pt-4">
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-4">
                    为每个功能模块指定专用的 AI 模型。未配置的模块将使用默认供应商或 Fance AI。
                  </p>
                  
                  {MODULE_TYPES.map((module) => {
                    const config = getModuleConfig(module.id);
                    const isExpanded = expandedModules.has(module.id);
                    const provider = config?.llm_providers;

                    return (
                      <Collapsible
                        key={module.id}
                        open={isExpanded}
                        onOpenChange={() => toggleModule(module.id)}
                      >
                        <div className="rounded-lg border bg-card">
                          <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="text-left">
                                <div className="font-medium text-sm">{module.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {module.description}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {config ? (
                                <Badge variant="secondary" className="text-xs">
                                  {provider?.display_name || 'Custom'} / {config.model_name}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  使用默认
                                </Badge>
                              )}
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </div>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <div className="p-4 pt-0 border-t">
                              <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="space-y-2">
                                  <Label>供应商</Label>
                                  <Select
                                    value={configModule === module.id ? configProviderId : (config?.provider_id || "")}
                                    onValueChange={(v) => {
                                      setConfigModule(module.id);
                                      setConfigProviderId(v);
                                      const p = providers.find((p: any) => p.id === v);
                                      if (p?.default_model) {
                                        setConfigModel(p.default_model);
                                      }
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="选择供应商" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {providers.map((p: any) => (
                                        <SelectItem key={p.id} value={p.id}>
                                          {p.display_name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>模型</Label>
                                  <Input
                                    value={configModule === module.id ? configModel : (config?.model_name || "")}
                                    onChange={(e) => {
                                      setConfigModule(module.id);
                                      setConfigModel(e.target.value);
                                    }}
                                    placeholder="模型名称"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Temperature</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="2"
                                    value={configModule === module.id ? configTemperature : (config?.temperature?.toString() || "0.7")}
                                    onChange={(e) => {
                                      setConfigModule(module.id);
                                      setConfigTemperature(e.target.value);
                                    }}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Max Tokens</Label>
                                  <Input
                                    type="number"
                                    value={configModule === module.id ? configMaxTokens : (config?.max_tokens?.toString() || "4096")}
                                    onChange={(e) => {
                                      setConfigModule(module.id);
                                      setConfigMaxTokens(e.target.value);
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 mt-4">
                                {config && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deleteConfig.mutate({ id: config.id, agentId: agentId || null })}
                                  >
                                    重置为默认
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  onClick={handleSaveModuleConfig}
                                  disabled={configModule !== module.id || !configProviderId || !configModel}
                                >
                                  保存配置
                                </Button>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Provider Dialog */}
      <Dialog open={showAddProvider} onOpenChange={(open) => {
        if (!open) resetProviderForm();
        setShowAddProvider(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? "编辑供应商" : "添加供应商"}
            </DialogTitle>
            <DialogDescription>
              配置 AI 模型 API 接入信息
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!editingProvider && (
              <div className="space-y-2">
                <Label>选择模板</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PROVIDER_TEMPLATES.map((template) => {
                    const IconComponent = providerIcons[template.provider_type] || Settings;
                    return (
                      <Button
                        key={template.id}
                        variant={selectedTemplate === template.id ? "default" : "outline"}
                        className="h-auto py-3 flex flex-col items-center gap-1"
                        onClick={() => handleSelectTemplate(template.id)}
                      >
                        <IconComponent className="h-5 w-5" />
                        <span className="text-xs">{template.name}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>显示名称</Label>
              <Input
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                placeholder="例如: My OpenAI"
              />
            </div>

            <div className="space-y-2">
              <Label>API 端点</Label>
              <Input
                value={formEndpoint}
                onChange={(e) => setFormEndpoint(e.target.value)}
                placeholder="https://api.openai.com/v1/chat/completions"
              />
            </div>

            <div className="space-y-2">
              <Label>API Key 密钥名称</Label>
              <Input
                value={formKeyName}
                onChange={(e) => setFormKeyName(e.target.value)}
                placeholder="OPENAI_API_KEY"
              />
              <p className="text-xs text-muted-foreground">
                需要在项目设置中配置对应的密钥
              </p>
            </div>

            <div className="space-y-2">
              <Label>默认模型</Label>
              <Input
                value={formDefaultModel}
                onChange={(e) => setFormDefaultModel(e.target.value)}
                placeholder="gpt-4o"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formIsDefault}
                onChange={(e) => setFormIsDefault(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isDefault">设为默认供应商</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              resetProviderForm();
              setShowAddProvider(false);
            }}>
              取消
            </Button>
            <Button
              onClick={editingProvider ? handleUpdateProvider : handleCreateProvider}
              disabled={!formDisplayName || !formEndpoint || !formKeyName || createProvider.isPending || updateProvider.isPending}
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
            <AlertDialogTitle>确认删除供应商？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后，使用该供应商的模块配置也将被删除。此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProvider}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
