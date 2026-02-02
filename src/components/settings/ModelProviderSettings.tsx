/**
 * @file ModelProviderSettings.tsx
 * @description 用户 LLM 供应商配置面板 - 允许用户添加自己的 API Key
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Plus,
  Trash2,
  Check,
  Loader2,
  Star,
  Key,
  TestTube,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface LLMProvider {
  id: string;
  display_name: string;
  provider_type: string;
  api_endpoint: string;
  api_key_name: string;
  api_key_preview?: string;
  api_key_encrypted?: string;
  default_model: string;
  is_default: boolean;
  is_active: boolean;
}

const PROVIDER_TEMPLATES = [
  {
    type: "openai",
    name: "OpenAI",
    endpoint: "https://api.openai.com/v1/chat/completions",
    defaultModel: "gpt-4o",
    description: "GPT-4, GPT-4o, GPT-4o-mini 等模型",
    docUrl: "https://platform.openai.com/api-keys",
  },
  {
    type: "anthropic",
    name: "Anthropic",
    endpoint: "https://api.anthropic.com/v1/messages",
    defaultModel: "claude-sonnet-4-20250514",
    description: "Claude 3.5 Sonnet, Claude 3 Opus 等模型",
    docUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    type: "google",
    name: "Google AI",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    defaultModel: "gemini-2.5-flash",
    description: "Gemini Pro, Gemini Flash 等模型",
    docUrl: "https://aistudio.google.com/apikey",
  },
  {
    type: "azure",
    name: "Azure OpenAI",
    endpoint: "",
    defaultModel: "gpt-4",
    description: "Azure 托管的 OpenAI 模型",
    docUrl: "https://portal.azure.com/",
  },
  {
    type: "custom",
    name: "自定义供应商",
    endpoint: "",
    defaultModel: "",
    description: "OpenAI 兼容的第三方 API",
    docUrl: "",
  },
];

export function ModelProviderSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    displayName: "",
    apiKey: "",
    endpoint: "",
    defaultModel: "",
  });
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid?: boolean;
    error?: string;
    models?: string[];
  } | null>(null);
  const [defaultChoice, setDefaultChoice] = useState<"personal" | "global" | "lovable">("lovable");

  // 获取用户的供应商列表
  const { data: providers, isLoading } = useQuery({
    queryKey: ["user-llm-providers", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("llm_providers")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as LLMProvider[];
    },
    enabled: !!user?.id,
  });

  // 添加供应商
  const addProvider = useMutation({
    mutationFn: async (data: {
      displayName: string;
      providerType: string;
      endpoint: string;
      defaultModel: string;
      apiKey: string;
    }) => {
      if (!user?.id) throw new Error("未登录");

      // 1. 创建供应商记录
      const insertData = {
        user_id: user.id,
        display_name: data.displayName,
        provider_type: data.providerType,
        api_endpoint: data.endpoint,
        api_key_name: `USER_${data.providerType.toUpperCase()}_KEY`,
        default_model: data.defaultModel,
        is_default: (providers?.length || 0) === 0,
        is_active: true,
      };
      
      const { data: provider, error: insertError } = await supabase
        .from("llm_providers")
        .insert(insertData as any)
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. 存储加密的 API Key
      const { error: keyError } = await supabase.functions.invoke("manage-api-keys", {
        body: {
          operation: "store",
          providerId: provider.id,
          apiKey: data.apiKey,
        },
      });

      if (keyError) {
        // 回滚：删除刚创建的供应商
        await supabase.from("llm_providers").delete().eq("id", provider.id);
        throw keyError;
      }

      return provider;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-llm-providers"] });
      setShowAddDialog(false);
      resetForm();
      toast({ title: "供应商添加成功", description: "您现在可以使用此供应商的模型" });
    },
    onError: (error) => {
      toast({
        title: "添加失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    },
  });

  // 删除供应商
  const deleteProvider = useMutation({
    mutationFn: async (providerId: string) => {
      const { error } = await supabase
        .from("llm_providers")
        .update({ is_active: false })
        .eq("id", providerId)
        .eq("user_id", user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-llm-providers"] });
      toast({ title: "供应商已删除" });
    },
  });

  // 设为默认
  const setAsDefault = useMutation({
    mutationFn: async (providerId: string) => {
      if (!user?.id) throw new Error("未登录");
      
      // 先取消其他默认
      await supabase
        .from("llm_providers")
        .update({ is_default: false })
        .eq("user_id", user.id);
      
      // 设置新默认
      const { error } = await supabase
        .from("llm_providers")
        .update({ is_default: true })
        .eq("id", providerId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-llm-providers"] });
      toast({ title: "默认供应商已更新" });
    },
  });

  // 验证 API Key
  const handleValidate = async () => {
    if (!formData.apiKey || !selectedTemplate) return;
    
    setIsValidating(true);
    setValidationResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("manage-api-keys", {
        body: {
          operation: "validate",
          apiKey: formData.apiKey,
          providerType: selectedTemplate,
          testEndpoint: formData.endpoint || undefined,
        },
      });
      
      if (error) throw error;
      setValidationResult(data);
    } catch (error) {
      setValidationResult({
        valid: false,
        error: error instanceof Error ? error.message : "验证失败",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const resetForm = () => {
    setSelectedTemplate(null);
    setFormData({ displayName: "", apiKey: "", endpoint: "", defaultModel: "" });
    setValidationResult(null);
  };

  const handleTemplateSelect = (type: string) => {
    const template = PROVIDER_TEMPLATES.find((t) => t.type === type);
    if (template) {
      setSelectedTemplate(type);
      setFormData({
        displayName: template.name,
        apiKey: "",
        endpoint: template.endpoint,
        defaultModel: template.defaultModel,
      });
      setValidationResult(null);
    }
  };

  const handleSubmit = () => {
    if (!selectedTemplate || !formData.displayName || !formData.apiKey) {
      toast({ title: "请填写必填字段", variant: "destructive" });
      return;
    }

    addProvider.mutate({
      displayName: formData.displayName,
      providerType: selectedTemplate,
      endpoint: formData.endpoint,
      defaultModel: formData.defaultModel,
      apiKey: formData.apiKey,
    });
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case "openai":
        return "🤖";
      case "anthropic":
        return "🧠";
      case "google":
        return "✨";
      case "azure":
        return "☁️";
      default:
        return "🔧";
    }
  };

  const defaultProvider = providers?.find((p) => p.is_default);

  return (
    <div className="space-y-4">
      {/* 当前默认供应商 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">默认模型来源</CardTitle>
          <CardDescription>选择 AI 对话使用的模型供应商</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={defaultChoice}
            onValueChange={(v) => setDefaultChoice(v as "personal" | "global" | "lovable")}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="personal" id="personal" disabled={!defaultProvider} />
              <Label htmlFor="personal" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {defaultProvider ? getProviderIcon(defaultProvider.provider_type) : "⚪"}
                  </span>
                  <span>个人配置</span>
                  {defaultProvider && (
                    <Badge variant="secondary" className="text-xs">
                      {defaultProvider.display_name}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {defaultProvider 
                    ? `使用您配置的 ${defaultProvider.display_name} 供应商`
                    : "尚未配置个人供应商"}
                </p>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="global" id="global" />
              <Label htmlFor="global" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌐</span>
                  <span>全局默认</span>
                  <Badge variant="outline" className="text-xs">管理员配置</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  使用管理员为平台配置的默认供应商
                </p>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="lovable" id="lovable" />
              <Label htmlFor="lovable" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💜</span>
                  <span>Lovable AI</span>
                  <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/20">免费额度</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  使用平台提供的 AI 服务，包含免费使用额度
                </p>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* 我的供应商列表 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">我的供应商</CardTitle>
              <CardDescription>管理您的 API Key 和供应商配置</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              添加供应商
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : providers && providers.length > 0 ? (
            <div className="space-y-3">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getProviderIcon(provider.provider_type)}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{provider.display_name}</span>
                        {provider.is_default && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Star className="h-3 w-3" />
                            默认
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Key className="h-3 w-3" />
                        <span>{provider.api_key_preview || "未配置 Key"}</span>
                        <span>·</span>
                        <span>{provider.default_model}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!provider.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAsDefault.mutate(provider.id)}
                        disabled={setAsDefault.isPending}
                      >
                        设为默认
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteProvider.mutate(provider.id)}
                      disabled={deleteProvider.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>尚未配置任何供应商</p>
              <p className="text-sm">添加您的 API Key 以使用自己的模型</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 添加供应商对话框 */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加模型供应商</DialogTitle>
            <DialogDescription>
              配置您自己的 API Key 以使用更多模型
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 供应商选择 */}
            <div className="space-y-2">
              <Label>选择供应商</Label>
              <Select value={selectedTemplate || ""} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="选择供应商类型" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_TEMPLATES.map((template) => (
                    <SelectItem key={template.type} value={template.type}>
                      <div className="flex items-center gap-2">
                        <span>{getProviderIcon(template.type)}</span>
                        <span>{template.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <p className="text-xs text-muted-foreground">
                  {PROVIDER_TEMPLATES.find((t) => t.type === selectedTemplate)?.description}
                </p>
              )}
            </div>

            {selectedTemplate && (
              <>
                <Separator />

                {/* 显示名称 */}
                <div className="space-y-2">
                  <Label>显示名称</Label>
                  <Input
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="例如: 我的 OpenAI"
                  />
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>API Key</Label>
                    {PROVIDER_TEMPLATES.find((t) => t.type === selectedTemplate)?.docUrl && (
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                        <a
                          href={PROVIDER_TEMPLATES.find((t) => t.type === selectedTemplate)?.docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          获取 Key <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) => {
                        setFormData({ ...formData, apiKey: e.target.value });
                        setValidationResult(null);
                      }}
                      placeholder="sk-..."
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleValidate}
                      disabled={!formData.apiKey || isValidating}
                    >
                      {isValidating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {validationResult && (
                    <div
                      className={`flex items-center gap-2 text-xs ${
                        validationResult.valid ? "text-green-600" : "text-destructive"
                      }`}
                    >
                      {validationResult.valid ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span>验证成功</span>
                          {validationResult.models && (
                            <span className="text-muted-foreground">
                              · 可用模型: {validationResult.models.slice(0, 3).join(", ")}...
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3" />
                          <span>{validationResult.error}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* 自定义端点 (仅 Azure 和 Custom) */}
                {(selectedTemplate === "azure" || selectedTemplate === "custom") && (
                  <div className="space-y-2">
                    <Label>API 端点</Label>
                    <Input
                      value={formData.endpoint}
                      onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                      placeholder="https://your-resource.openai.azure.com/..."
                    />
                  </div>
                )}

                {/* 默认模型 */}
                <div className="space-y-2">
                  <Label>默认模型</Label>
                  <Input
                    value={formData.defaultModel}
                    onChange={(e) => setFormData({ ...formData, defaultModel: e.target.value })}
                    placeholder="gpt-4o"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedTemplate || !formData.apiKey || addProvider.isPending}
            >
              {addProvider.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              添加供应商
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
