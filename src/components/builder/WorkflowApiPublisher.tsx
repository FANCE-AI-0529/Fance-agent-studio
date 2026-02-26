import { useState, useMemo } from "react";
import {
  Globe, Copy, CheckCircle, Power, PowerOff, BarChart3,
  Clock, Zap, Shield, ExternalLink, Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { usePublishedApis, usePublishWorkflowApi, useToggleApiStatus } from "@/hooks/usePublishedApis";
import type { Node, Edge } from "@xyflow/react";
import { toast } from "sonner";

interface WorkflowApiPublisherProps {
  workflowId: string;
  workflowName: string;
  nodes: Node[];
  edges: Edge[];
}

export function WorkflowApiPublisher({ workflowId, workflowName, nodes, edges }: WorkflowApiPublisherProps) {
  const { data: apis = [] } = usePublishedApis(workflowId);
  const publishMutation = usePublishWorkflowApi();
  const toggleMutation = useToggleApiStatus();

  const existing = apis[0];
  const [name, setName] = useState(existing?.name || workflowName);
  const [slug, setSlug] = useState(existing?.slug || workflowName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
  const [description, setDescription] = useState(existing?.description || "");
  const [rateLimit, setRateLimit] = useState(existing?.rate_limit || 60);
  const [copied, setCopied] = useState(false);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const apiEndpoint = `https://${projectId}.supabase.co/functions/v1/workflow-api/${slug}`;

  const serializedNodes = useMemo(() => nodes.map(n => ({
    id: n.id, type: n.type || "unknown", data: n.data as Record<string, unknown>,
  })), [nodes]);
  const serializedEdges = useMemo(() => edges.map(e => ({
    id: e.id, source: e.source, target: e.target,
    sourceHandle: e.sourceHandle || undefined, targetHandle: e.targetHandle || undefined,
  })), [edges]);

  const handlePublish = () => {
    publishMutation.mutate({
      workflow_id: workflowId,
      name,
      description,
      slug,
      nodes: serializedNodes,
      edges: serializedEdges,
      rate_limit: rateLimit,
    });
  };

  const copyEndpoint = () => {
    navigator.clipboard.writeText(apiEndpoint);
    setCopied(true);
    toast.success("已复制 API 端点");
    setTimeout(() => setCopied(false), 2000);
  };

  const curlExample = `curl -X POST "${apiEndpoint}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"query": "你好"}'`;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Status Banner */}
        {existing && (
          <Card className={existing.is_active ? "border-green-500/30 bg-green-500/5" : "border-muted"}>
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {existing.is_active ? (
                  <Badge variant="default" className="gap-1">
                    <Power className="h-3 w-3" /> 运行中
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <PowerOff className="h-3 w-3" /> 已停用
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">v{existing.version}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleMutation.mutate({ id: existing.id, is_active: !existing.is_active })}
              >
                {existing.is_active ? "停用" : "启用"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        {existing && (
          <div className="grid grid-cols-3 gap-2">
            <Card>
              <CardContent className="p-3 text-center">
                <Zap className="h-4 w-4 mx-auto mb-1 text-primary" />
                <div className="text-lg font-bold">{existing.total_calls}</div>
                <div className="text-[10px] text-muted-foreground">总调用次数</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <Clock className="h-4 w-4 mx-auto mb-1 text-primary" />
                <div className="text-lg font-bold">{existing.avg_latency_ms}ms</div>
                <div className="text-[10px] text-muted-foreground">平均延迟</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <BarChart3 className="h-4 w-4 mx-auto mb-1 text-primary" />
                <div className="text-lg font-bold">{existing.error_rate}%</div>
                <div className="text-[10px] text-muted-foreground">错误率</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Endpoint */}
        {existing && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4" /> API 端点
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted p-2 rounded font-mono truncate">
                  {apiEndpoint}
                </code>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={copyEndpoint}>
                  {copied ? <CheckCircle className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Config Form */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">API 名称</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">路径标识 (Slug)</Label>
            <Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className="h-8 text-sm font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">描述</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Shield className="h-3 w-3" /> 速率限制 (次/分钟)
            </Label>
            <Input type="number" value={rateLimit} onChange={e => setRateLimit(Number(e.target.value))} className="h-8 text-sm" min={1} max={1000} />
          </div>
        </div>

        <Button onClick={handlePublish} disabled={publishMutation.isPending || !name || !slug} className="w-full gap-2">
          <Globe className="h-4 w-4" />
          {existing ? "更新 API" : "发布为 API"}
        </Button>

        {/* Code Example */}
        {existing && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Code2 className="h-4 w-4" /> 调用示例
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-[11px] bg-muted p-3 rounded-lg overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">
                {curlExample}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
